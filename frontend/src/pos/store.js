// Shared state for the POS interface: messages (toasts), catalogue (products, stock, categories, locations) and the cart.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchProducts, fetchInventory, fetchCategories, fetchLocations, fetchBankAccounts } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { hasPack, roundMoney } from '../utils/units';

/* ----------------------------------------------------------------- toasts */
const ToastContext = createContext({ toast: () => {} });
export const useToast = () => useContext(ToastContext).toast;

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const timer = useRef(null);
  const toast = useCallback((text, tone = 'ok') => {
    setMsg({ text, tone, id: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2800);
  }, []);
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {msg && <div key={msg.id} className={`pos-toast ${msg.tone}`} role="status">{msg.text}</div>}
    </ToastContext.Provider>
  );
}

/* --------------------------------------------------------------- catalogue */
const CatalogContext = createContext(null);
export const useCatalog = () => useContext(CatalogContext);

const LOCATION_KEY = 'pos_location';

export function CatalogProvider({ children }) {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [stock, setStock] = useState({}); // productId -> quantity at the selected location
  const [locationId, setLocationIdState] = useState(() => {
    try { return Number(localStorage.getItem(LOCATION_KEY)) || null; } catch (_) { return null; }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const version = useRef(0);

  const setLocationId = useCallback((id) => {
    setLocationIdState(id);
    try { localStorage.setItem(LOCATION_KEY, String(id)); } catch (_) { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    const run = ++version.current;
    setLoading(true);
    setError('');
    try {
      const [loc, cat, prod, banks] = await Promise.all([fetchLocations(), fetchCategories(), fetchProducts({ limit: 1000 }), fetchBankAccounts().catch(() => ({ bankAccounts: [] }))]);
      if (run !== version.current) return;
      const locs = loc.locations || [];
      setLocations(locs);
      setCategories((cat.categories || []).map((c) => c.name || c));
      setProducts((prod.products || []).filter((p) => p.isActive !== false));
      setBankAccounts(banks.bankAccounts || []);
      setLocationIdState((current) => {
        if (current && locs.some((l) => l.id === current)) return current;
        const mine = user && user.locationId && locs.find((l) => l.id === user.locationId);
        const pick = (mine || locs[0] || {}).id || null;
        if (pick) { try { localStorage.setItem(LOCATION_KEY, String(pick)); } catch (_) { /* ignore */ } }
        return pick;
      });
    } catch (e) {
      if (run === version.current) setError((e && e.message) || 'Could not load products');
    } finally {
      if (run === version.current) setLoading(false);
    }
  }, [user]);

  const loadStock = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await fetchInventory({ locationId: id, limit: 1000 });
      const map = {};
      (res.inventory || []).forEach((row) => { map[row.productId] = Number(row.quantitySqm) || 0; });
      setStock(map);
    } catch (_) { setStock({}); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStock(locationId); }, [locationId, loadStock]);

  const value = useMemo(() => ({
    locations, categories, products, stock, bankAccounts, locationId, setLocationId, loading, error,
    location: locations.find((l) => l.id === locationId) || null,
    reload: async () => { await load(); await loadStock(locationId); },
    reloadStock: () => loadStock(locationId),
  }), [locations, categories, products, stock, bankAccounts, locationId, setLocationId, loading, error, load, loadStock]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

/* -------------------------------------------------------------------- cart */
const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  const [lines, setLines] = useState({}); // productId -> { product, qty (base unit), unit ('base' | 'pack'), markup }
  const [markupUntil, setMarkupUntil] = useState(0);

  const api = useMemo(() => ({
    lines,
    list: Object.values(lines),
    count: Object.values(lines).reduce((n, l) => n + 1, 0),
    qtyOf: (id) => (lines[id] ? lines[id].qty : 0),
    unitOf: (id) => (lines[id] ? lines[id].unit : undefined),
    // qty is always in the base unit (square metres for tiles); unit is what the customer asked for (sqm or carton).
    setQty: (product, qty, unit) => setLines((cur) => {
      const next = { ...cur };
      if (qty <= 0) delete next[product.id];
      else next[product.id] = { markup: 0, unit: hasPack(product) ? 'pack' : 'base', ...(cur[product.id] || {}), product, qty, ...(unit ? { unit } : {}) };
      return next;
    }),
    setUnit: (id, unit) => setLines((cur) => (cur[id] ? { ...cur, [id]: { ...cur[id], unit } } : cur)),
    setMarkup: (id, markup) => setLines((cur) => (cur[id] ? { ...cur, [id]: { ...cur[id], markup: Math.max(0, Number(markup) || 0) } } : cur)),
    clear: () => setLines({}),
    markupUnlocked: markupUntil > Date.now(),
    unlockMarkup: () => setMarkupUntil(Date.now() + 8 * 3600 * 1000),
    lockMarkup: () => setMarkupUntil(0),
    subtotal: Object.values(lines).reduce((sum, l) => roundMoney(sum + roundMoney(l.qty * (Number(l.product.price) + (l.markup || 0)))), 0),
  }), [lines, markupUntil]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}
