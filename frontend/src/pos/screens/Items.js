import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaPlus, FaCamera, FaTrash, FaEdit, FaBoxes } from 'react-icons/fa';
import { Screen, Card, Field, Button, Chips, Segmented, Empty, Loading, ErrorNote, SearchBox, Thumb, Badge, Stepper, ConfirmDialog, money } from '../ui';
import { useCatalog, useToast } from '../store';
import { useAuth } from '../../contexts/AuthContext';
import API, { createProduct, updateProduct, deleteProduct, fetchInventory, logInventoryChange, createCategory } from '../../services/api';
import { fileToResizedDataUrl } from '../image';
import { hasPack, packName, unitLabel, cartonPrice, toBase, fromBase, quantityText, fmtCount, fmtSqm, roundQty, roundMoney, sqmPerPiece } from '../../utils/units';

const PAGE = 40;
export const OTHER_UNITS = [['pcs', 'Piece'], ['bag', 'Bag'], ['box', 'Box'], ['kg', 'Kilogram'], ['m', 'Metre'], ['l', 'Litre'], ['set', 'Set']];
const FINISHES = ['Matt', 'Glossy', 'Polished', 'Satin', 'Rustic', 'Textured', 'Anti-slip'];
export const canEditItems = (user) => !!user && ['owner', 'manager'].includes(user.role);

/* ----------------------------------------------------------------- list */
export function ItemsList() {
  const { products, stock, categories, location, loading, error, reload } = useCatalog();
  const { user } = useAuth();
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

  const top = (
    <>
      <SearchBox value={q} onChange={(v) => { setQ(v); setShown(PAGE); }} placeholder="Search items" />
      <Chips scroll options={['All', ...categories]} value={cat} onChange={(v) => { setCat(v); setShown(PAGE); }} />
    </>
  );

  return (
    <Screen title="Items" top={top} flush>
      {loading && !products.length && <Loading text="Loading items…" />}
      {error && <ErrorNote message={error} onRetry={reload} />}
      {!loading && !error && list.length === 0 && (
        <Empty icon={<FaBoxes aria-hidden="true" />} title={products.length ? 'No matches' : 'No items yet'} hint={products.length ? 'Try a different search.' : canEditItems(user) ? 'Tap the + button to add your first item.' : 'An owner or manager can add items.'} />
      )}
      {list.length > 0 && (
        <>
          <div className="pos-row-sub" style={{ padding: '8px 12px' }}>Stock shown for {location ? location.name : 'this location'}</div>
          <div className="pos-list">
            {list.slice(0, shown).map((p) => {
              const n = stock[p.id] || 0;
              return (
                <button type="button" className="pos-row" key={p.id} onClick={() => navigate(`/items/${p.id}`)}>
                  <Thumb src={p.imageUrl} name={p.name} />
                  <div className="pos-row-main">
                    <div className="pos-row-title">{p.name}</div>
                    <div className="pos-row-sub">{money(p.price)}/{unitLabel(p)}{hasPack(p) ? ` · ${money(cartonPrice(p))}/${packName(p)}` : ''}</div>
                  </div>
                  <div className="pos-row-end">
                    <strong>{hasPack(p) ? fmtCount(fromBase(p, n, 'pack')) : p.unitOfMeasure === 'sqm' ? fmtSqm(n) : fmtCount(n)}</strong>
                    <span className="pos-row-sub">{hasPack(p) ? 'cartons' : unitLabel(p)}</span>
                    {n <= 0 ? <Badge tone="red">Out</Badge> : n <= 10 ? <Badge tone="amber">Low</Badge> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
      {list.length > shown && <div className="pos-more"><Button block onClick={() => setShown(shown + PAGE)}>Show more ({list.length - shown})</Button></div>}
      {canEditItems(user) && <button type="button" className="pos-fab" aria-label="Add item" onClick={() => navigate('/items/new')}><FaPlus aria-hidden="true" /></button>}
    </Screen>
  );
}

/* --------------------------------------------------------------- detail */
export function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locations, reload } = useCatalog();
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [p, inv] = await Promise.all([API.get(`/products/${id}`), fetchInventory({ limit: 1000 })]);
        if (!alive) return;
        setProduct(p.data.product);
        setRows((inv.inventory || []).filter((r) => String(r.productId) === String(id)));
      } catch (e) { if (alive) setError((e && e.message) || 'Could not load this item'); }
    })();
    return () => { alive = false; };
  }, [id]);

  const archive = async () => {
    setConfirm(false);
    try { await deleteProduct(id); await reload(); toast('Item archived'); navigate('/items', { replace: true }); }
    catch (e) { toast((e && e.message) || 'Could not archive', 'error'); }
  };

  if (error) return <Screen title="Item" back="/items"><ErrorNote message={error} /></Screen>;
  if (!product) return <Screen title="Item" back="/items"><Loading /></Screen>;
  const edit = canEditItems(user);
  const total = rows.reduce((n, r) => n + (Number(r.quantitySqm) || 0), 0);

  return (
    <Screen title={product.name} back="/items"
      footer={edit ? (
        <div className="pos-row2">
          <Button kind="primary" onClick={() => navigate(`/items/${id}/stock`)}><FaBoxes aria-hidden="true" />Stock</Button>
          <Button onClick={() => navigate(`/items/${id}/edit`)}><FaEdit aria-hidden="true" />Edit</Button>
        </div>
      ) : null}>
      {product.imageUrl && <img src={product.imageUrl} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'contain', background: '#fff', borderRadius: 12, marginBottom: 8 }} />}
      <Card>
        <div className="pos-kv"><span>Price</span><strong>{money(product.price)} / {unitLabel(product)}</strong></div>
        {hasPack(product) && <div className="pos-kv"><span>Carton</span><strong>{money(cartonPrice(product))} · {fmtSqm(product.packSize)} sqm</strong></div>}
        {product.attributes && (product.attributes.Size || product.attributes.Finish) && <div className="pos-kv"><span>Size / finish</span><strong>{[product.attributes.Size, product.attributes.Finish].filter(Boolean).join(' · ')}</strong></div>}
        <div className="pos-kv"><span>Total in stock</span><strong>{quantityText(product, total)}</strong></div>
        {(product.categories || []).length > 0 && <div className="pos-chips" style={{ marginTop: 6 }}>{product.categories.map((c) => <Badge key={c} tone="blue">{c}</Badge>)}</div>}
        {product.description && <p style={{ marginTop: 8, color: 'var(--muted)' }}>{product.description}</p>}
      </Card>
      <Card>
        <h2>Stock by location</h2>
        {locations.map((l) => {
          const r = rows.find((x) => x.locationId === l.id);
          return <div className="pos-kv" key={l.id}><span>{l.name}</span><strong>{quantityText(product, r ? Number(r.quantitySqm) : 0)}</strong></div>;
        })}
      </Card>
      {edit && <div style={{ padding: '4px 0 12px' }}><Button kind="danger" block onClick={() => setConfirm(true)}><FaTrash aria-hidden="true" />Archive item</Button></div>}
      {confirm && <ConfirmDialog danger title="Archive this item?" message="It disappears from selling and lists but past sales keep its name." confirmLabel="Archive" onConfirm={archive} onCancel={() => setConfirm(false)} />}
    </Screen>
  );
}

/* ----------------------------------------------------------------- form */
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

// Add or edit an item. Tiles come first (size and pieces per carton give the square metres per carton; the price is per
// square metre; stock can be counted in cartons). "Other product" covers adhesive, grout, tools and so on.
export function ItemForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const toast = useToast();
  const { categories, locations, locationId, reload } = useCatalog();
  const fileRef = useRef(null);
  const [loaded, setLoaded] = useState(!editing);
  const [original, setOriginal] = useState(null);
  const [kind, setKind] = useState('tile');
  const [form, setForm] = useState({ name: '', length: '', width: '', pieces: '', cartonSqm: '', cartonEdited: false, finish: '', price: '', otherUnit: 'pcs', stockUnit: 'carton', quantity: '', location: locationId || '', cats: [], description: '', extra: {} });
  const [photo, setPhoto] = useState(null);       // data URL when changed
  const [photoShown, setPhotoShown] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [newCat, setNewCat] = useState('');
  const isTile = kind === 'tile';

  useEffect(() => {
    if (!editing) return undefined;
    let alive = true;
    API.get(`/products/${id}`).then((r) => {
      if (!alive) return;
      const p = r.data.product;
      setOriginal(p);
      const attrs = p.attributes || {};
      const size = String(attrs.Size || attrs.size || '').match(/([\d.]+)\s*[x×]\s*([\d.]+)/i);
      const { Size, size: sizeLower, Finish, finish, 'Pieces per carton': ppc, ...rest } = attrs; // eslint-disable-line no-unused-vars
      setKind(p.unitOfMeasure === 'sqm' ? 'tile' : 'other');
      setForm((f) => ({
        ...f, name: p.name, price: String(p.price), cats: p.categories || [], description: p.description || '',
        length: size ? size[1] : '', width: size ? size[2] : '', pieces: ppc !== undefined ? String(ppc) : '',
        cartonSqm: p.packSize ? String(p.packSize) : '', cartonEdited: !!p.packSize, finish: Finish || finish || '',
        otherUnit: p.unitOfMeasure === 'sqm' ? 'pcs' : (p.unitOfMeasure || 'pcs'), extra: rest,
      }));
      setPhotoShown(p.imageUrl || null);
      setLoaded(true);
    }).catch((e) => { toast((e && e.message) || 'Could not load this item', 'error'); navigate(-1); });
    return () => { alive = false; };
  }, [editing, id, navigate, toast]);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const toggleCat = (c) => set('cats', form.cats.includes(c) ? form.cats.filter((x) => x !== c) : [...form.cats, c]);

  // Square metres in one carton: worked out from the size and the pieces, unless it was typed in.
  const piece = sqmPerPiece(form.length, form.width);
  const autoCarton = piece && num(form.pieces) > 0 ? roundQty(piece * num(form.pieces)) : 0;
  const cartonSqm = form.cartonEdited ? num(form.cartonSqm) : autoCarton;
  const price = num(form.price);
  const stockBase = isTile && form.stockUnit === 'carton' ? roundQty(num(form.quantity) * cartonSqm) : roundQty(num(form.quantity));

  const pickPhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try { const url = await fileToResizedDataUrl(file); setPhoto(url); setPhotoShown(url); }
    catch (err) { toast(err.message, 'error'); }
  };

  const addCategory = async () => {
    const name = newCat.trim();
    if (!name) return;
    try { await createCategory(name); await reload(); } catch (_) { /* may already exist */ }
    if (!form.cats.includes(name)) set('cats', [...form.cats, name]);
    setNewCat('');
  };

  const save = async () => {
    const err = {};
    if (!form.name.trim()) err.name = 'Enter a name';
    if (form.price === '' || !(price >= 0)) err.price = isTile ? 'Enter the price per square metre' : 'Enter a price';
    if (isTile && form.cartonEdited && form.cartonSqm !== '' && !(num(form.cartonSqm) > 0)) err.cartonSqm = 'Must be more than zero';
    if (!editing) {
      if (!form.location) err.location = 'Choose a location';
      if (!(num(form.quantity) > 0)) err.quantity = 'Enter how much you have';
      if (isTile && form.stockUnit === 'carton' && !(cartonSqm > 0)) err.quantity = 'To count in cartons, enter the size and pieces (or count in sqm)';
    }
    setErrors(err);
    if (Object.keys(err).length) return;

    const attributes = { ...form.extra };
    if (isTile) {
      if (num(form.length) > 0 && num(form.width) > 0) attributes.Size = `${fmtCount(form.length)}x${fmtCount(form.width)} cm`;
      if (form.finish) attributes.Finish = form.finish;
      if (num(form.pieces) > 0) attributes['Pieces per carton'] = num(form.pieces);
    }
    setBusy(true);
    try {
      const base = {
        name: form.name.trim(), price, categories: form.cats.length ? form.cats : ['General'], description: form.description.trim(), attributes,
        unitOfMeasure: isTile ? 'sqm' : form.otherUnit,
        packSize: isTile && cartonSqm > 0 ? cartonSqm : null, packUnit: isTile && cartonSqm > 0 ? 'carton' : null,
      };
      let saved;
      if (editing) {
        const payload = { ...base, version: original.version };
        if (photo) payload.imageUrl = photo;
        saved = await updateProduct(id, payload);
      } else {
        saved = await createProduct({ ...base, imageUrl: photo || undefined, initialLocation: Number(form.location), initialQuantity: stockBase });
      }
      await reload();
      toast(editing ? 'Item saved' : 'Item added');
      const newId = (saved.product && saved.product.id) || id;
      navigate(`/items/${newId}`, { replace: true });
    } catch (e) {
      const detail = e && e.errors && e.errors.map((x) => `${x.field}: ${x.message}`).join(', ');
      toast(detail || (e && e.message) || 'Could not save', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return <Screen title={editing ? 'Edit item' : 'New item'} back><Loading /></Screen>;

  return (
    <Screen title={editing ? 'Edit item' : 'New item'} back footer={<Button kind="primary" block busy={busy} onClick={save}>{editing ? 'Save changes' : 'Add item'}</Button>}>
      {!editing && <Segmented value={kind} onChange={setKind} options={[{ value: 'tile', label: 'Tile' }, { value: 'other', label: 'Other product' }]} />}

      <div className="pos-photo">
        <button type="button" className="pos-photo-box" onClick={() => fileRef.current && fileRef.current.click()} aria-label="Take or choose a photo">
          {photoShown ? <img src={photoShown} alt="" /> : (<><FaCamera aria-hidden="true" style={{ fontSize: 22 }} />Photo</>)}
        </button>
        <div style={{ flex: 1 }}>
          <Button block onClick={() => fileRef.current && fileRef.current.click()}><FaCamera aria-hidden="true" />{photoShown ? 'Change photo' : 'Take photo'}</Button>
          {photoShown && <button type="button" className="pos-link" onClick={() => { setPhoto(null); setPhotoShown(null); }}>Remove</button>}
        </div>
        <input ref={fileRef} className="pos-hidden-file" type="file" accept="image/*" capture="environment" onChange={pickPhoto} />
      </div>

      <Field label={isTile ? 'Tile name' : 'Product name'} error={errors.name}><input value={form.name} onChange={(e) => set('name', e.target.value)} className={errors.name ? 'error' : ''} autoCapitalize="words" placeholder={isTile ? 'e.g. Calacatta Gold Polished' : 'e.g. Tile adhesive 25kg'} /></Field>

      {isTile ? (
        <>
          <div className="pos-row3">
            <Field label="Length cm"><input inputMode="decimal" value={form.length} onChange={(e) => set('length', e.target.value.replace(/[^0-9.]/g, ''))} placeholder="60" /></Field>
            <Field label="Width cm"><input inputMode="decimal" value={form.width} onChange={(e) => set('width', e.target.value.replace(/[^0-9.]/g, ''))} placeholder="60" /></Field>
            <Field label="Pieces / carton"><input inputMode="numeric" value={form.pieces} onChange={(e) => set('pieces', e.target.value.replace(/[^0-9]/g, ''))} placeholder="4" /></Field>
          </div>
          <Field label="Square metres in one carton" error={errors.cartonSqm}
            hint={autoCarton && !form.cartonEdited ? `${fmtCount(form.length)} x ${fmtCount(form.width)} cm = ${piece.toFixed(4).replace(/0+$/, '')} sqm a piece, so ${fmtCount(form.pieces)} pieces = ${autoCarton} sqm` : 'Worked out from the size and pieces, or type it from the carton label'}>
            <input inputMode="decimal" value={form.cartonEdited ? form.cartonSqm : (autoCarton ? String(autoCarton) : '')} onChange={(e) => setForm((f) => ({ ...f, cartonEdited: true, cartonSqm: e.target.value.replace(/[^0-9.]/g, '') }))} className={errors.cartonSqm ? 'error' : ''} />
          </Field>
          <Field label="Finish"><select value={form.finish} onChange={(e) => set('finish', e.target.value)}><option value="">Not set</option>{FINISHES.map((f) => <option key={f} value={f}>{f}</option>)}</select></Field>
        </>
      ) : (
        <Field label="Sold by"><select value={form.otherUnit} onChange={(e) => set('otherUnit', e.target.value)}>{OTHER_UNITS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      )}

      <Field label={isTile ? 'Price per square metre (₦)' : `Price per ${(OTHER_UNITS.find(([v]) => v === form.otherUnit) || [0, 'unit'])[1].toLowerCase()} (₦)`} error={errors.price}
        hint={isTile && cartonSqm > 0 && price > 0 ? `One carton costs ${money(roundMoney(price * cartonSqm))}` : undefined}>
        <input inputMode="decimal" value={form.price} onChange={(e) => set('price', e.target.value.replace(/[^0-9.]/g, ''))} className={errors.price ? 'error' : ''} />
      </Field>

      {!editing && (
        <>
          <div className="pos-row2">
            <Field label="Stock you have" error={errors.quantity}><input inputMode="decimal" value={form.quantity} onChange={(e) => set('quantity', e.target.value.replace(/[^0-9.]/g, ''))} className={errors.quantity ? 'error' : ''} /></Field>
            {isTile ? (
              <Field label="Counted in"><select value={form.stockUnit} onChange={(e) => set('stockUnit', e.target.value)}><option value="carton">Cartons</option><option value="sqm">Square metres</option></select></Field>
            ) : <div />}
          </div>
          {isTile && num(form.quantity) > 0 && cartonSqm > 0 && <p className="pos-row-sub" style={{ margin: '-4px 0 8px' }}>= {fmtSqm(stockBase)} sqm{form.stockUnit === 'sqm' ? ` (${fmtCount(roundQty(stockBase / cartonSqm))} cartons)` : ''}</p>}
          <Field label="Kept at" error={errors.location}>
            <select value={form.location} onChange={(e) => set('location', e.target.value)} className={errors.location ? 'error' : ''}>
              <option value="">Choose…</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
        </>
      )}

      <Field label="Category">
        <Chips multi options={[...new Set([...categories, ...form.cats])]} value={form.cats} onChange={toggleCat} />
        <div className="pos-row2" style={{ gridTemplateColumns: '1fr auto', marginTop: 8 }}>
          <input placeholder="New category" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <Button onClick={addCategory} disabled={!newCat.trim()}>Add</Button>
        </div>
      </Field>
      <Field label="Notes (optional)"><textarea value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
    </Screen>
  );
}

/* ---------------------------------------------------------- adjust stock */
export function AdjustStock() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { locations, locationId, reloadStock } = useCatalog();
  const [product, setProduct] = useState(null);
  const [loc, setLoc] = useState(locationId || '');
  const [current, setCurrent] = useState(0);
  const [mode, setMode] = useState('received');
  const [unit, setUnit] = useState('pack');
  const [amount, setAmount] = useState(1);
  const [count, setCount] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { API.get(`/products/${id}`).then((r) => setProduct(r.data.product)).catch(() => {}); }, [id]);
  useEffect(() => {
    if (!loc) return;
    fetchInventory({ locationId: loc, limit: 1000 }).then((r) => {
      const row = (r.inventory || []).find((x) => String(x.productId) === String(id));
      setCurrent(row ? Number(row.quantitySqm) : 0);
    }).catch(() => setCurrent(0));
  }, [loc, id]);

  const packed = hasPack(product);
  const u = packed ? unit : 'base';
  useEffect(() => { setCount(fromBase(product || {}, current, u)); }, [current, u, product]);

  const amountBase = toBase(product || {}, amount, u);
  const countBase = toBase(product || {}, count, u);
  const change = mode === 'received' ? amountBase : mode === 'broken' ? -amountBase : roundQty(countBase - current);
  const after = roundQty(current + change);

  const save = async () => {
    if (!loc) { toast('Choose a location', 'error'); return; }
    if (change === 0) { toast('Nothing to change', 'error'); return; }
    if (after < 0) { toast('That would take stock below zero', 'error'); return; }
    setBusy(true);
    try {
      await logInventoryChange({ productId: Number(id), locationId: Number(loc), changeType: mode === 'count' ? 'adjusted' : mode, changeAmount: change, notes: note.trim() || undefined });
      reloadStock();
      toast('Stock updated');
      navigate(`/items/${id}`, { replace: true });
    } catch (e) { toast((e && e.message) || 'Could not update stock', 'error'); }
    finally { setBusy(false); }
  };

  if (!product) return <Screen title="Stock" back><Loading /></Screen>;
  return (
    <Screen title="Update stock" back footer={<Button kind="primary" block busy={busy} onClick={save}>Save stock</Button>}>
      <Card><div className="pos-row-title">{product.name}</div><div className="pos-row-sub">Currently {quantityText(product, current)} at this location</div></Card>
      <Field label="Location"><select value={loc} onChange={(e) => setLoc(Number(e.target.value))}>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
      <Field label="What happened?">
        <Chips options={[{ value: 'received', label: 'Received' }, { value: 'broken', label: 'Broken / lost' }, { value: 'count', label: 'Recount' }]} value={mode} onChange={setMode} />
      </Field>
      {packed && (
        <Field label="Count in">
          <Chips options={[{ value: 'pack', label: `${packName(product)}s` }, { value: 'base', label: unitLabel(product) }]} value={u} onChange={setUnit} />
        </Field>
      )}
      {mode === 'count'
        ? <Field label="Counted quantity"><Stepper value={count} min={0} onChange={setCount} label="counted quantity" /></Field>
        : <Field label={mode === 'received' ? 'How many arrived?' : 'How many?'}><Stepper value={amount} min={0.01} onChange={setAmount} label="amount" /></Field>}
      <Card><div className="pos-kv total"><span>New stock</span><strong>{quantityText(product, after)}</strong></div></Card>
      <Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. supplier delivery" /></Field>
    </Screen>
  );
}
