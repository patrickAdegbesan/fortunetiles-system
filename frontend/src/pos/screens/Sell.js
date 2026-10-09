import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaShoppingBasket } from 'react-icons/fa';
import { Screen, SearchBox, Chips, Stepper, Empty, Loading, ErrorNote, Thumb, money } from '../ui';
import { useCatalog, useCart, useToast } from '../store';
import { hasPack, packName, unitLabel, cartonPrice, toBase, fromBase, quantityText } from '../../utils/units';

const PAGE = 40;

const ProductRow = React.memo(function ProductRow({ p, qty, unit, available, onSet, onBlocked }) {
  const out = available <= 0;
  const packed = hasPack(p);
  const u = packed ? (unit || 'pack') : 'base';
  const entry = fromBase(p, qty, u);
  const attrs = p.attributes || {};
  const detail = [attrs.Size || attrs.size, attrs.Finish || attrs.finish].filter(Boolean).join(' · ');
  return (
    <div className={`pos-row${out ? ' off' : ''}`} onClick={() => (out ? onBlocked(p) : qty === 0 && onSet(p, toBase(p, 1, u), u))} role="button" tabIndex={0}>
      <Thumb src={p.imageUrl} name={p.name} />
      <div className="pos-row-main">
        <div className="pos-row-title">{p.name}</div>
        <div className="pos-row-sub">{detail ? `${detail} · ` : ''}{money(p.price)}/{unitLabel(p)}{packed ? ` · ${money(cartonPrice(p))}/${packName(p)}` : ''}</div>
        <div className="pos-row-sub">{out ? 'Out of stock' : `${quantityText(p, available)} in stock`}</div>
      </div>
      {qty > 0 ? (
        <div onClick={(e) => e.stopPropagation()}>
          <Stepper value={entry} min={0} max={fromBase(p, available, u)} onChange={(n) => onSet(p, toBase(p, n, u), u)} label={`${p.name} quantity`} />
        </div>
      ) : (
        <button type="button" className="pos-add" aria-label={`Add ${p.name}`} disabled={out} onClick={(e) => { e.stopPropagation(); onSet(p, toBase(p, 1, u), u); }}>
          <FaPlus aria-hidden="true" />
        </button>
      )}
    </div>
  );
});

export default function Sell() {
  const { products, stock, categories, locations, locationId, setLocationId, loading, error, reload } = useCatalog();
  const cart = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [shown, setShown] = useState(PAGE);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products
      .filter((p) => (cat === 'All' || (p.categories || []).includes(cat)) && (!term || p.name.toLowerCase().includes(term)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, q, cat]);

  const setQty = (p, n, unit) => {
    const available = stock[p.id] || 0;
    if (n > available + 1e-9) { toast(`Only ${quantityText(p, available)} in stock`, 'error'); return; }
    cart.setQty(p, n, unit);
  };
  const blocked = (p) => toast(`${p.name} is out of stock here`, 'error');

  const footer = cart.count > 0 && (
    <button type="button" className="pos-cartbar" onClick={() => navigate('/sell/cart')} style={{ margin: 0, width: '100%' }}>
      <span><FaShoppingBasket aria-hidden="true" style={{ marginRight: 8 }} />{cart.count} item{cart.count === 1 ? '' : 's'}<small>tap to review and charge</small></span>
      <span>{money(cart.subtotal)}</span>
    </button>
  );

  const top = (
    <>
      <div className="pos-loc">
        <select aria-label="Location" value={locationId || ''} onChange={(e) => setLocationId(Number(e.target.value))}>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <SearchBox value={q} onChange={(v) => { setQ(v); setShown(PAGE); }} placeholder="Search products" />
      <Chips scroll options={['All', ...categories]} value={cat} onChange={(v) => { setCat(v); setShown(PAGE); }} />
    </>
  );

  return (
    <Screen title="Sell" top={top} footer={footer} flush>
      {loading && !products.length ? <Loading text="Loading products…" /> : null}
      {error && <ErrorNote message={error} onRetry={reload} />}
      {!loading && !error && list.length === 0 && (
        <Empty title={products.length ? 'No matches' : 'No products yet'} hint={products.length ? 'Try a different search or category.' : 'Add items in the Items tab first.'} />
      )}
      {list.length > 0 && (
        <div className="pos-list">
          {list.slice(0, shown).map((p) => (
            <ProductRow key={p.id} p={p} qty={cart.qtyOf(p.id)} unit={cart.unitOf(p.id)} available={stock[p.id] || 0} onSet={setQty} onBlocked={blocked} />
          ))}
        </div>
      )}
      {list.length > shown && (
        <div className="pos-more"><button type="button" className="pos-btn block" onClick={() => setShown(shown + PAGE)}>Show more ({list.length - shown})</button></div>
      )}
    </Screen>
  );
}
