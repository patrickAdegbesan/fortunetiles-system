import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaPlus, FaCamera, FaTrash, FaEdit, FaBoxes } from 'react-icons/fa';
import { Screen, Card, Field, Button, Chips, Empty, Loading, ErrorNote, SearchBox, Thumb, Badge, Stepper, ConfirmDialog, money } from '../ui';
import { useCatalog, useToast } from '../store';
import { useAuth } from '../../contexts/AuthContext';
import API, { createProduct, updateProduct, deleteProduct, fetchInventory, logInventoryChange, createCategory } from '../../services/api';
import { fileToResizedDataUrl } from '../image';

const PAGE = 40;
export const UNITS = ['pcs', 'sqm', 'box', 'pack', 'bag', 'm', 'kg', 'set'];
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
                    <div className="pos-row-sub">{money(p.price)} / {p.unitOfMeasure || 'pcs'}</div>
                  </div>
                  <div className="pos-row-end">
                    <strong>{n}</strong>
                    {n <= 0 ? <Badge tone="red">Out</Badge> : n <= 10 ? <Badge tone="amber">Low</Badge> : <span className="pos-row-sub">in stock</span>}
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
        <div className="pos-kv"><span>Price</span><strong>{money(product.price)} / {product.unitOfMeasure}</strong></div>
        <div className="pos-kv"><span>Total in stock</span><strong>{total} {product.unitOfMeasure}</strong></div>
        {(product.categories || []).length > 0 && <div className="pos-chips" style={{ marginTop: 6 }}>{product.categories.map((c) => <Badge key={c} tone="blue">{c}</Badge>)}</div>}
        {product.description && <p style={{ marginTop: 8, color: 'var(--muted)' }}>{product.description}</p>}
      </Card>
      <Card>
        <h2>Stock by location</h2>
        {locations.map((l) => {
          const r = rows.find((x) => x.locationId === l.id);
          return <div className="pos-kv" key={l.id}><span>{l.name}</span><strong>{r ? Number(r.quantitySqm) : 0}</strong></div>;
        })}
      </Card>
      {edit && <div style={{ padding: '4px 0 12px' }}><Button kind="danger" block onClick={() => setConfirm(true)}><FaTrash aria-hidden="true" />Archive item</Button></div>}
      {confirm && <ConfirmDialog danger title="Archive this item?" message="It disappears from selling and lists but past sales keep its name." confirmLabel="Archive" onConfirm={archive} onCancel={() => setConfirm(false)} />}
    </Screen>
  );
}

/* ----------------------------------------------------------------- form */
export function ItemForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const toast = useToast();
  const { categories, locations, locationId, reload } = useCatalog();
  const fileRef = useRef(null);
  const [loaded, setLoaded] = useState(!editing);
  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', unit: 'pcs', cats: [], description: '', quantity: '', location: locationId || '' });
  const [photo, setPhoto] = useState(null);       // data URL when changed
  const [photoShown, setPhotoShown] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [newCat, setNewCat] = useState('');

  useEffect(() => {
    if (!editing) return undefined;
    let alive = true;
    API.get(`/products/${id}`).then((r) => {
      if (!alive) return;
      const p = r.data.product;
      setOriginal(p);
      setForm((f) => ({ ...f, name: p.name, price: String(p.price), unit: p.unitOfMeasure || 'pcs', cats: p.categories || [], description: p.description || '' }));
      setPhotoShown(p.imageUrl || null);
      setLoaded(true);
    }).catch((e) => { toast((e && e.message) || 'Could not load this item', 'error'); navigate(-1); });
    return () => { alive = false; };
  }, [editing, id, navigate, toast]);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const toggleCat = (c) => set('cats', form.cats.includes(c) ? form.cats.filter((x) => x !== c) : [...form.cats, c]);

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
    const price = Number(form.price);
    if (form.price === '' || !Number.isFinite(price) || price < 0) err.price = 'Enter a price';
    if (!editing) {
      if (!form.location) err.location = 'Choose a location';
      const q = Number(form.quantity);
      if (form.quantity === '' || !Number.isFinite(q) || q <= 0) err.quantity = 'Enter how many you have';
    }
    setErrors(err);
    if (Object.keys(err).length) return;

    setBusy(true);
    try {
      const base = { name: form.name.trim(), price, categories: form.cats.length ? form.cats : ['General'], unitOfMeasure: form.unit, description: form.description.trim() };
      let saved;
      if (editing) {
        const payload = { ...base, version: original.version };
        if (photo) payload.imageUrl = photo;
        saved = await updateProduct(id, payload);
      } else {
        saved = await createProduct({ ...base, attributes: {}, imageUrl: photo || undefined, initialLocation: Number(form.location), initialQuantity: Number(form.quantity) });
      }
      await reload();
      toast(editing ? 'Item saved' : 'Item added');
      const newId = (saved.product && saved.product.id) || id;
      navigate(editing ? `/items/${id}` : `/items/${newId}`, { replace: true });
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

      <Field label="Name" error={errors.name}><input value={form.name} onChange={(e) => set('name', e.target.value)} className={errors.name ? 'error' : ''} autoCapitalize="words" /></Field>
      <div className="pos-row2">
        <Field label="Price (₦)" error={errors.price}><input inputMode="decimal" value={form.price} onChange={(e) => set('price', e.target.value.replace(/[^0-9.]/g, ''))} className={errors.price ? 'error' : ''} /></Field>
        <Field label="Sold per"><select value={form.unit} onChange={(e) => set('unit', e.target.value)}>{UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select></Field>
      </div>

      {!editing && (
        <div className="pos-row2">
          <Field label="Stock to add" error={errors.quantity}><input inputMode="decimal" value={form.quantity} onChange={(e) => set('quantity', e.target.value.replace(/[^0-9.]/g, ''))} className={errors.quantity ? 'error' : ''} /></Field>
          <Field label="Location" error={errors.location}>
            <select value={form.location} onChange={(e) => set('location', e.target.value)} className={errors.location ? 'error' : ''}>
              <option value="">Choose…</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
        </div>
      )}

      <Field label="Categories">
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
  const [amount, setAmount] = useState(1);
  const [count, setCount] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { API.get(`/products/${id}`).then((r) => setProduct(r.data.product)).catch(() => {}); }, [id]);
  useEffect(() => {
    if (!loc) return;
    fetchInventory({ locationId: loc, limit: 1000 }).then((r) => {
      const row = (r.inventory || []).find((x) => String(x.productId) === String(id));
      const n = row ? Number(row.quantitySqm) : 0;
      setCurrent(n);
      setCount(n);
    }).catch(() => setCurrent(0));
  }, [loc, id]);

  const change = mode === 'received' ? amount : mode === 'broken' ? -amount : count - current;
  const after = current + change;

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
      <Card><div className="pos-row-title">{product.name}</div><div className="pos-row-sub">Currently {current} {product.unitOfMeasure} at this location</div></Card>
      <Field label="Location"><select value={loc} onChange={(e) => setLoc(Number(e.target.value))}>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
      <Field label="What happened?">
        <Chips options={[{ value: 'received', label: 'Received' }, { value: 'broken', label: 'Broken / lost' }, { value: 'count', label: 'Recount' }]} value={mode} onChange={setMode} />
      </Field>
      {mode === 'count'
        ? <Field label="Counted quantity"><Stepper value={count} min={0} onChange={setCount} label="counted quantity" /></Field>
        : <Field label={mode === 'received' ? 'How many arrived?' : 'How many?'}><Stepper value={amount} min={1} onChange={setAmount} label="amount" /></Field>}
      <Card><div className="pos-kv total"><span>New stock</span><strong>{after}</strong></div></Card>
      <Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. supplier delivery" /></Field>
    </Screen>
  );
}
