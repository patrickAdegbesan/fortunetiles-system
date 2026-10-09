import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import Receipt from './Receipt';
import { tourFor, tourKey } from './tours';
import '../styles/GuidedTour.css';

const PAD = 6;
const CARD_W = 360;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A receipt with sample data, so the tour can show what printing looks like without a real sale.
const DEMO_SALE = {
  id: 1042,
  customerName: 'Ada Okafor',
  customerPhone: '0801 234 5678',
  paymentMethod: 'bank_transfer',
  discountType: 'percentage',
  discountValue: 10,
  subtotalAmount: 52500,
  totalAmount: 47250,
  total: 47250,
  createdAt: new Date().toISOString(),
  location: { name: 'Main Store' },
  cashier: { firstName: 'Sample', lastName: 'Cashier' },
  items: [
    { productName: 'Calacatta Gold 80x80', unit: 'sqm', quantity: 5, unitPrice: 8500, totalPrice: 42500, lineTotal: 42500 },
    { productName: 'Tile Adhesive 25kg', unit: 'bag', quantity: 2, unitPrice: 5000, totalPrice: 10000, lineTotal: 10000 },
  ],
};

const isVisible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };

// Find the element a step or action refers to.
const locate = (spec, { needVisible = true } = {}) => {
  if (!spec.selector) return null;
  let list;
  try { list = Array.from(document.querySelectorAll(spec.selector)); } catch (_) { return null; }
  if (spec.match) list = list.filter((el) => spec.match.test(el.textContent || ''));
  const el = (needVisible ? list.find(isVisible) : list[0]) || null;
  if (el && spec.closest) return el.closest(spec.closest) || el;
  return el;
};

const present = (selector) => { try { return !!document.querySelector(selector); } catch (_) { return false; } };

const setNativeValue = (el, value) => {
  const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
};

// Put the explanation card beside the highlighted area, on whichever side has room.
const place = (rect, cardH, preferred) => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 14;
  const fits = {
    bottom: rect.bottom + gap + cardH <= vh - 8,
    top: rect.top - gap - cardH >= 8,
    right: rect.right + gap + CARD_W <= vw - 8,
    left: rect.left - gap - CARD_W >= 8,
  };
  const side = [preferred, 'bottom', 'right', 'top', 'left'].filter(Boolean).find((s) => fits[s]);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  if (!side) return { left: clamp(vw - CARD_W - 24, 8, vw), top: clamp(vh - cardH - 24, 8, vh) };
  if (side === 'bottom') return { left: clamp(rect.left, 8, vw - CARD_W - 8), top: rect.bottom + gap };
  if (side === 'top') return { left: clamp(rect.left, 8, vw - CARD_W - 8), top: rect.top - gap - cardH };
  if (side === 'right') return { left: rect.right + gap, top: clamp(rect.top, 8, vh - cardH - 8) };
  return { left: rect.left - gap - CARD_W, top: clamp(rect.top, 8, vh - cardH - 8) };
};

export default function GuidedTour() {
  const { pathname } = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [tour, setTour] = useState(null);
  const [index, setIndex] = useState(0);
  const [readyIndex, setReadyIndex] = useState(-1);
  const [rect, setRect] = useState(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const [cursor, setCursor] = useState(null);
  const [demoReceipt, setDemoReceipt] = useState(false);
  const cardRef = useRef(null);
  const nextRef = useRef(null);
  const runRef = useRef(0);
  const dirRef = useRef(1);
  const onceRef = useRef(new Set());

  const seenKey = useMemo(() => {
    const k = tourKey(pathname);
    return k && user ? `ft_tour_seen_${user.id || user.email}_${k}` : null;
  }, [pathname, user]);

  const markSeen = useCallback(() => {
    if (seenKey) { try { localStorage.setItem(seenKey, '1'); } catch (_) { /* ignore */ } }
  }, [seenKey]);

  /* ---------------------------------------------------------- doing things on screen */
  const perform = useCallback(async (actions, run, { silent = false } = {}) => {
    for (const a of actions || []) {
      if (run !== undefined && run !== runRef.current) return;
      if (a.once) { if (onceRef.current.has(a.once)) continue; onceRef.current.add(a.once); }
      if (a.unless && present(a.unless)) continue;
      if (a.ifPresent && !present(a.ifPresent)) continue;
      const kind = a.do || 'click';
      if (kind === 'wait') { await sleep(a.ms); continue; }
      if (kind === 'demo') { setDemoReceipt(a.value === 'receipt'); await sleep(200); continue; }
      if (kind === 'waitFor') {
        for (let i = 0; i < 40 && !locate(a); i += 1) await sleep(60);
        await sleep(120);
        continue;
      }
      const times = a.repeat ? 25 : 1;
      for (let n = 0; n < times; n += 1) {
        const el = locate(a);
        if (!el) break;
        if (kind === 'click') {
          if (!silent) {
            el.scrollIntoView({ block: 'center', inline: 'nearest' });
            await sleep(120);
            const r = el.getBoundingClientRect();
            setCursor({ x: r.left + r.width / 2, y: r.top + r.height / 2, press: false });
            await sleep(520);
            setCursor({ x: r.left + r.width / 2, y: r.top + r.height / 2, press: true });
            await sleep(160);
          }
          el.click();
          if (!silent) { await sleep(120); setCursor(null); }
          await sleep(260);
          if (a.repeat && !a.ifPresent) break;
        } else {
          const value = typeof a.value === 'function' ? a.value() : a.value;
          setNativeValue(el, value == null ? '' : String(value));
          await sleep(220);
          break;
        }
      }
    }
  }, []);

  const finish = useCallback(async () => {
    setOpen(false);
    setCursor(null);
    setReadyIndex(-1);
    markSeen();
    runRef.current += 1;
    const t = tour;
    setDemoReceipt(false);
    if (t) {
      await perform(t.reset, undefined, { silent: true });
      await perform(t.cleanup, undefined, { silent: true });
    }
  }, [tour, perform, markSeen]);

  const start = useCallback(() => {
    onceRef.current = new Set();
    dirRef.current = 1;
    setTour(tourFor(pathname));
    setIndex(0);
    setReadyIndex(-1);
    setOpen(true);
    markSeen();
  }, [pathname, markSeen]);

  // The ? button in the menu asks for the tour through this event.
  useEffect(() => {
    const handler = () => start();
    window.addEventListener('ft-tour-start', handler);
    return () => window.removeEventListener('ft-tour-start', handler);
  }, [start]);

  // Offer the tour automatically on a person's first visit to a page, and never again.
  useEffect(() => {
    setOpen(false);
    if (!isAuthenticated || !seenKey) return undefined;
    let seen = false;
    try { seen = localStorage.getItem(seenKey) === '1'; } catch (_) { /* ignore */ }
    if (seen) return undefined;
    const t = setTimeout(start, 1600);
    return () => clearTimeout(t);
  }, [isAuthenticated, seenKey, start]);

  /* ------------------------------------------------------------- preparing each step */
  const step = open && tour ? tour.steps[index] : null;

  useEffect(() => {
    if (!open || !tour) return undefined;
    const run = ++runRef.current;
    const st = tour.steps[index];
    setReadyIndex(-1);
    (async () => {
      for (const closer of tour.reset || []) {
        if (closer.name !== st.modal) await perform([closer], run, { silent: true });
      }
      await perform(st.ensure, run);
      if (run !== runRef.current) return;
      if (st.selector) {
        for (let i = 0; i < 25 && !locate(st); i += 1) await sleep(60); // data may still be loading
        if (run !== runRef.current) return;
        if (!locate(st)) { // nothing to show on this screen (for example a role without that button): move on
          const nextIndex = index + dirRef.current;
          if (nextIndex < 0 || nextIndex >= tour.steps.length) setIndex(Math.max(0, Math.min(tour.steps.length - 1, index - dirRef.current)));
          else setIndex(nextIndex);
          return;
        }
      }
      await sleep(80);
      if (run === runRef.current) setReadyIndex(index);
    })();
    return () => { /* a newer run supersedes this one through runRef */ };
  }, [open, tour, index, perform]);

  const ready = open && readyIndex === index;

  const measure = useCallback(() => {
    if (!step) return;
    const el = locate(step);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom });
  }, [step]);

  useLayoutEffect(() => {
    if (!ready || !step) return undefined;
    if (step.selector) {
      const el = locate(step);
      if (el) el.scrollIntoView({ block: 'center', inline: 'nearest' });
    } else setRect(null);
    measure();
    const again = setTimeout(measure, 140);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { clearTimeout(again); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [ready, step, measure]);

  useLayoutEffect(() => {
    if (!ready || !step || !cardRef.current) return;
    const h = cardRef.current.offsetHeight;
    setPos(rect && step.selector ? place(rect, h, step.placement) : { left: (window.innerWidth - CARD_W) / 2, top: Math.max(24, (window.innerHeight - h) / 2) });
  }, [rect, ready, step, index]);

  useEffect(() => { if (ready && nextRef.current) nextRef.current.focus(); }, [ready, index]);

  const total = tour ? tour.steps.length : 0;
  const last = index >= total - 1;
  const next = useCallback(() => { dirRef.current = 1; if (last) finish(); else setIndex((i) => i + 1); }, [last, finish]);
  const back = useCallback(() => { dirRef.current = -1; setIndex((i) => Math.max(0, i - 1)); }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') back();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, next, back, finish]);

  if (!isAuthenticated) return null;

  return (
    <>
      {demoReceipt && <Receipt sale={DEMO_SALE} onClose={() => setDemoReceipt(false)} />}
      {open && step && (
        <div className="tour-layer" role="dialog" aria-modal="true" aria-label="Guided tour">
          {ready && rect && step.selector
            ? <div className="tour-spot" style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }} />
            : <div className="tour-dim" />}
          {cursor && <div className={`tour-cursor${cursor.press ? ' press' : ''}`} style={{ left: cursor.x, top: cursor.y }} />}
          {ready && (
            <div className="tour-card" ref={cardRef} style={{ left: pos.left, top: pos.top, width: CARD_W }}>
              <button type="button" className="tour-x" onClick={finish} aria-label="Close the guide"><FaTimes aria-hidden="true" /></button>
              <div className="tour-count">Step {index + 1} of {total}</div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              <div className="tour-bar"><span style={{ width: `${((index + 1) / total) * 100}%` }} /></div>
              <div className="tour-actions">
                <button type="button" className="tour-skip" onClick={finish}>Skip guide</button>
                <span className="tour-spacer" />
                {index > 0 && <button type="button" className="tour-btn" onClick={back}>Back</button>}
                <button type="button" className="tour-btn primary" onClick={next} ref={nextRef}>{last ? 'Finish' : 'Next'}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
