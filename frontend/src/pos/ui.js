// Small building blocks for the POS-terminal interface. Everything is flat and light on purpose:
// the terminal has a slow processor and little memory, so no blur, no big shadows, no animation-heavy widgets.
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaChevronLeft, FaPlus, FaMinus, FaBoxOpen } from 'react-icons/fa';
import SyncChip from './SyncChip';

export const money = (v) => `₦${Number(v || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

export const timeAgo = (value) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
  const time = d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (sameDay) return `Today ${time}`;
  if (yesterday) return `Yesterday ${time}`;
  return `${d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} ${time}`;
};

/** A full screen: top bar (optional back button + actions), scrolling body, optional fixed footer. */
export function Screen({ title, back, right, children, footer, top, flush, bodyRef }) {
  const navigate = useNavigate();
  return (
    <div className="pos-screen">
      <header className="pos-appbar">
        {back && (
          <button type="button" className="pos-icon-btn" aria-label="Back" onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}>
            <FaChevronLeft aria-hidden="true" />
          </button>
        )}
        <h1>{title}</h1>
        <div className="pos-appbar-right"><SyncChip />{right}</div>
      </header>
      {top && <div className="pos-top">{top}</div>}
      <div className={`pos-body${flush ? ' flush' : ''}`} ref={bodyRef}>{children}</div>
      {footer && <div className="pos-footer">{footer}</div>}
    </div>
  );
}

export const Card = ({ children, className = '', ...rest }) => <section className={`pos-card ${className}`} {...rest}>{children}</section>;

export const Field = ({ label, error, hint, children }) => (
  <label className="pos-field">
    {label && <span className="pos-field-label">{label}</span>}
    {children}
    {hint && !error && <span className="pos-field-hint">{hint}</span>}
    {error && <span className="pos-field-error">{error}</span>}
  </label>
);

export const Button = ({ kind = 'primary', block, busy, children, ...rest }) => (
  <button type="button" className={`pos-btn ${kind}${block ? ' block' : ''}`} disabled={busy || rest.disabled} {...rest}>
    {busy ? 'Please wait…' : children}
  </button>
);

/** Row of selectable pills. `options` = [{value,label}] or strings. */
export function Chips({ options, value, onChange, scroll = false, multi = false }) {
  const items = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const isOn = (v) => (multi ? (value || []).includes(v) : value === v);
  return (
    <div className={`pos-chips${scroll ? ' scroll' : ''}`} role="group">
      {items.map((o) => (
        <button key={o.value} type="button" className={`pos-chip${isOn(o.value) ? ' on' : ''}`} aria-pressed={isOn(o.value)} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="pos-seg" role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** [-] 3 [+] control. */
export function Stepper({ value, onChange, min = 0, max = Infinity, step = 1, label = 'quantity' }) {
  const dec = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => onChange(Math.min(max, +(value + step).toFixed(2)));
  return (
    <div className="pos-stepper">
      <button type="button" aria-label={`Decrease ${label}`} onClick={dec} disabled={value <= min}><FaMinus aria-hidden="true" /></button>
      <input
        inputMode="decimal"
        aria-label={label}
        value={value}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          onChange(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min);
        }}
        onFocus={(e) => e.target.select()}
      />
      <button type="button" aria-label={`Increase ${label}`} onClick={inc} disabled={value >= max}><FaPlus aria-hidden="true" /></button>
    </div>
  );
}

export const Empty = ({ icon, title, hint, children }) => (
  <div className="pos-empty">
    <div className="pos-empty-icon">{icon || <FaBoxOpen aria-hidden="true" />}</div>
    <strong>{title}</strong>
    {hint && <p>{hint}</p>}
    {children}
  </div>
);

export const Loading = ({ text = 'Loading…' }) => <div className="pos-loading" role="status">{text}</div>;

export const ErrorNote = ({ message, onRetry }) => (
  <div className="pos-error-note" role="alert">
    <span>{message}</span>
    {onRetry && <button type="button" className="pos-link" onClick={onRetry}>Try again</button>}
  </div>
);

export const Badge = ({ tone = 'grey', children }) => <span className={`pos-badge ${tone}`}>{children}</span>;

/** Small round letter/photo for a product. */
export function Thumb({ src, name }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) return <img className="pos-thumb" src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />;
  return <span className="pos-thumb letter" aria-hidden="true">{(name || '?').trim().charAt(0).toUpperCase()}</span>;
}

/** Debounced search box. */
export function SearchBox({ value, onChange, placeholder = 'Search' }) {
  return (
    <input
      type="search"
      className="pos-search"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete="off"
    />
  );
}

/** Confirmation dialog (instead of window.confirm, which is awkward on the terminal). */
export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.focus(); }, []);
  return (
    <div className="pos-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="pos-dialog">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="pos-dialog-actions">
          <button type="button" className="pos-btn ghost" onClick={onCancel} ref={ref}>Cancel</button>
          <button type="button" className={`pos-btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
