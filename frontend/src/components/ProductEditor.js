import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaTimes, FaCamera, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import API, { fetchLocations, fetchProductTypes, fetchCategories, createCategory } from '../services/api';
import { fileToResizedDataUrl } from '../pos/image';
import { roundQty, roundMoney, sqmPerPiece, fmtSqm, fmtCount } from '../utils/units';
import '../styles/ProductEditorSimple.css';

const OTHER_UNITS = [['pcs', 'Piece'], ['bag', 'Bag'], ['box', 'Box'], ['kg', 'Kilogram'], ['m', 'Metre'], ['l', 'Litre'], ['set', 'Set']];
const FINISHES = ['Matt', 'Glossy', 'Polished', 'Satin', 'Rustic', 'Textured', 'Anti-slip'];
const money = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

// Add or edit an item. Tiles come first: size and pieces per carton give the square metres per carton by themselves,
// the price is per square metre (the carton price is shown), and starting stock can be typed in cartons.
// Other products (adhesive, grout, tools) are simply sold by the piece, bag, box and so on.
const ProductEditor = ({ product, onSave, onCancel }) => {
  const editing = !!product;
  const fileRef = useRef(null);
  const [loaded, setLoaded] = useState(!editing);
  const [locations, setLocations] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [kind, setKind] = useState(!editing || product.unitOfMeasure === 'sqm' ? 'tile' : 'other');
  const [form, setForm] = useState({
    name: '', imageUrl: '', categories: [], length: '', width: '', pieces: '', cartonSqm: '', cartonEdited: false, finish: '',
    price: '', otherUnit: 'pcs', stockUnit: 'carton', quantity: '', location: '',
    productTypeId: '', supplierCode: '', description: '', isActive: true, extra: {},
  });
  const [newCat, setNewCat] = useState('');
  const [extraKey, setExtraKey] = useState('');
  const [extraValue, setExtraValue] = useState('');
  const [more, setMore] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setErrors({}); };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [loc, types, cats, full] = await Promise.all([
          fetchLocations(),
          fetchProductTypes().catch(() => ({ productTypes: [] })),
          fetchCategories().catch(() => ({ categories: [] })),
          editing ? API.get(`/products/${product.id}`).then((r) => r.data.product).catch(() => product) : Promise.resolve(null),
        ]);
        if (!alive) return;
        const locs = loc.locations || [];
        setLocations(locs);
        setProductTypes(types.productTypes || []);
        setCategoryOptions((cats.categories || []).map((c) => (typeof c === 'string' ? c : c && c.name)).filter(Boolean));
        if (full) {
          const attrs = full.attributes || {};
          const size = String(attrs.Size || attrs.size || '').match(/([\d.]+)\s*[x×]\s*([\d.]+)/i);
          const { Size, size: sizeLower, Finish, finish, 'Pieces per carton': ppc, ...rest } = attrs; // eslint-disable-line no-unused-vars
          setKind(full.unitOfMeasure === 'sqm' ? 'tile' : 'other');
          setForm((f) => ({
            ...f,
            name: full.name || '',
            imageUrl: full.imageUrl || '',
            categories: full.categories || [],
            length: size ? size[1] : '', width: size ? size[2] : '',
            pieces: ppc !== undefined ? String(ppc) : '',
            cartonSqm: full.packSize ? String(full.packSize) : '', cartonEdited: !!full.packSize,
            finish: Finish || finish || '',
            otherUnit: full.unitOfMeasure === 'sqm' ? 'pcs' : (full.unitOfMeasure || 'pcs'),
            price: full.price !== undefined ? String(full.price) : '',
            productTypeId: full.productTypeId ? String(full.productTypeId) : '',
            supplierCode: full.supplierCode || '', description: full.description || '', isActive: full.isActive !== false,
            extra: rest,
          }));
          setMore(!!(full.productTypeId || full.supplierCode || Object.keys(rest).length));
          setLoaded(true);
        } else {
          setForm((f) => ({ ...f, location: String((locs[0] || {}).id || '') }));
        }
      } catch (e) {
        if (alive) setMessage((e && e.message) || 'Could not load the form');
      }
    })();
    return () => { alive = false; };
  }, [editing, product]);

  // Square metres in one carton: worked out from the size and the pieces, unless it was typed in by hand.
  const piece = sqmPerPiece(form.length, form.width);
  const autoCarton = piece && num(form.pieces) > 0 ? roundQty(piece * num(form.pieces)) : 0;
  const cartonSqm = form.cartonEdited ? num(form.cartonSqm) : autoCarton;
  const price = num(form.price);
  const isTile = kind === 'tile';
  const cartonCost = isTile && cartonSqm > 0 ? roundMoney(price * cartonSqm) : 0;
  const stockBase = useMemo(() => {
    const q = num(form.quantity);
    return isTile && form.stockUnit === 'carton' ? roundQty(q * cartonSqm) : roundQty(q);
  }, [form.quantity, form.stockUnit, cartonSqm, isTile]);

  const pickPhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try { set({ imageUrl: await fileToResizedDataUrl(file) }); } catch (err) { setMessage(err.message); }
  };

  const toggleCat = (c) => set({ categories: form.categories.includes(c) ? form.categories.filter((x) => x !== c) : [...form.categories, c] });
  const addCat = async () => {
    const name = newCat.trim();
    if (!name) return;
    try { await createCategory(name); } catch (_) { /* may already exist */ }
    if (!categoryOptions.includes(name)) setCategoryOptions([...categoryOptions, name]);
    if (!form.categories.includes(name)) set({ categories: [...form.categories, name] });
    setNewCat('');
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = {};
    if (!form.name.trim()) err.name = 'Enter the name';
    if (!(price >= 0) || form.price === '') err.price = isTile ? 'Enter the price per square metre' : 'Enter the price';
    if (isTile && form.cartonSqm !== '' && form.cartonEdited && !(num(form.cartonSqm) > 0)) err.carton = 'Square metres per carton must be more than zero';
    if (!editing) {
      if (!form.location) err.location = 'Choose where the stock is kept';
      if (!(num(form.quantity) > 0)) err.quantity = 'Enter how much you have';
      if (isTile && form.stockUnit === 'carton' && !(cartonSqm > 0)) err.quantity = 'To count in cartons, enter the size and pieces per carton (or use square metres)';
    }
    setErrors(err);
    if (Object.keys(err).length) { setMessage('Please fix the highlighted fields.'); return; }

    const attributes = { ...form.extra };
    if (isTile) {
      if (num(form.length) > 0 && num(form.width) > 0) attributes.Size = `${fmtCount(form.length)}x${fmtCount(form.width)} cm`;
      if (form.finish) attributes.Finish = form.finish;
      if (num(form.pieces) > 0) attributes['Pieces per carton'] = num(form.pieces);
    }
    const payload = {
      name: form.name.trim(),
      price,
      unitOfMeasure: isTile ? 'sqm' : form.otherUnit,
      packSize: isTile && cartonSqm > 0 ? cartonSqm : null,
      packUnit: isTile && cartonSqm > 0 ? 'carton' : null,
      productTypeId: form.productTypeId ? Number(form.productTypeId) : null,
      categories: form.categories.length ? form.categories : ['General'],
      attributes,
      supplierCode: form.supplierCode.trim() || undefined,
      description: form.description.trim(),
      isActive: form.isActive,
      imageUrl: form.imageUrl || undefined,
    };
    if (!editing) { payload.initialLocation = Number(form.location); payload.initialQuantity = stockBase; }

    setBusy(true);
    setMessage('');
    try { await onSave(payload); } catch (error) { setMessage((error && error.message) || 'Could not save'); } finally { setBusy(false); }
  };

  if (!loaded) return <div className="pe-overlay"><div className="pe-dialog"><p className="pe-loading">Loading...</p></div></div>;

  return (
    <div className="pe-overlay">
      <div className="pe-dialog" role="dialog" aria-modal="true" aria-label={editing ? 'Edit product' : 'Add product'}>
        <div className="pe-header">
          <h2>{editing ? 'Edit item' : 'Add item'}</h2>
          <button type="button" className="pe-x" onClick={onCancel} aria-label="Close"><FaTimes /></button>
        </div>
        <form onSubmit={submit} className="pe-form" noValidate>
          {message && <div className="pe-message" role="alert">{message}</div>}

          {!editing && (
            <div className="pe-kind" role="tablist">
              <button type="button" className={isTile ? 'on' : ''} onClick={() => setKind('tile')}>Tile</button>
              <button type="button" className={!isTile ? 'on' : ''} onClick={() => setKind('other')}>Other product <small>adhesive, grout, tools...</small></button>
            </div>
          )}

          <div className="pe-section pe-top">
            <button type="button" className="pe-photo" onClick={() => fileRef.current && fileRef.current.click()} aria-label="Choose a photo">
              {form.imageUrl ? <img src={form.imageUrl} alt="" /> : <><FaCamera /><span>Photo</span></>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="pe-hidden" onChange={pickPhoto} />
            <div className="pe-name">
              <label>{isTile ? 'Tile name' : 'Product name'} *</label>
              <input value={form.name} onChange={(e) => set({ name: e.target.value })} className={errors.name ? 'error' : ''}
                placeholder={isTile ? 'e.g. Calacatta Gold Polished' : 'e.g. Tile adhesive 25kg'} autoFocus />
              {errors.name && <span className="pe-error">{errors.name}</span>}
              {form.imageUrl && <button type="button" className="pe-link" onClick={() => set({ imageUrl: '' })}>Remove photo</button>}
            </div>
          </div>

          {isTile ? (
            <div className="pe-section">
              <h3>Size and carton</h3>
              <div className="pe-grid3">
                <div className="pe-field"><label>Length (cm)</label><input inputMode="decimal" value={form.length} onChange={(e) => set({ length: e.target.value.replace(/[^0-9.]/g, '') })} placeholder="60" /></div>
                <div className="pe-field"><label>Width (cm)</label><input inputMode="decimal" value={form.width} onChange={(e) => set({ width: e.target.value.replace(/[^0-9.]/g, '') })} placeholder="60" /></div>
                <div className="pe-field"><label>Pieces in a carton</label><input inputMode="numeric" value={form.pieces} onChange={(e) => set({ pieces: e.target.value.replace(/[^0-9]/g, '') })} placeholder="4" /></div>
              </div>
              <div className="pe-grid2">
                <div className="pe-field">
                  <label>Square metres in one carton</label>
                  <input inputMode="decimal" value={form.cartonEdited ? form.cartonSqm : (autoCarton ? String(autoCarton) : '')}
                    onChange={(e) => set({ cartonEdited: true, cartonSqm: e.target.value.replace(/[^0-9.]/g, '') })}
                    className={errors.carton ? 'error' : ''} placeholder="worked out from the size" />
                  <small className="pe-help">
                    {autoCarton && !form.cartonEdited ? `${fmtCount(form.length)} x ${fmtCount(form.width)} cm = ${piece.toFixed(4).replace(/0+$/, '')} sqm a piece, so ${fmtCount(form.pieces)} pieces = ${autoCarton} sqm.` : 'Filled in for you when you enter the size and pieces. You can also type it from the carton label.'}
                    {form.cartonEdited && autoCarton > 0 && <button type="button" className="pe-link" onClick={() => set({ cartonEdited: false, cartonSqm: '' })}>Use the calculated value</button>}
                  </small>
                  {errors.carton && <span className="pe-error">{errors.carton}</span>}
                </div>
                <div className="pe-field">
                  <label>Finish</label>
                  <select value={form.finish} onChange={(e) => set({ finish: e.target.value })}>
                    <option value="">Not set</option>
                    {FINISHES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="pe-section">
              <h3>How it is sold</h3>
              <div className="pe-field">
                <label>Sold by</label>
                <select value={form.otherUnit} onChange={(e) => set({ otherUnit: e.target.value })}>
                  {OTHER_UNITS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="pe-section">
            <h3>Price</h3>
            <div className="pe-grid2">
              <div className="pe-field">
                <label>{isTile ? 'Price per square metre (₦) *' : `Price per ${(OTHER_UNITS.find(([v]) => v === form.otherUnit) || [0, 'unit'])[1].toLowerCase()} (₦) *`}</label>
                <input inputMode="decimal" value={form.price} onChange={(e) => set({ price: e.target.value.replace(/[^0-9.]/g, '') })} className={errors.price ? 'error' : ''} placeholder="0.00" />
                {errors.price && <span className="pe-error">{errors.price}</span>}
              </div>
              {isTile && (
                <div className="pe-field pe-calc">
                  <label>Price of one carton</label>
                  <div className="pe-calc-value">{cartonCost > 0 ? money(cartonCost) : <span>shown when the carton size is known</span>}</div>
                  {cartonCost > 0 && <small className="pe-help">{money(price)} x {cartonSqm} sqm</small>}
                </div>
              )}
            </div>
          </div>

          {!editing && (
            <div className="pe-section">
              <h3>Stock you have now</h3>
              <div className="pe-grid3">
                <div className="pe-field">
                  <label>How much? *</label>
                  <input inputMode="decimal" value={form.quantity} onChange={(e) => set({ quantity: e.target.value.replace(/[^0-9.]/g, '') })} className={errors.quantity ? 'error' : ''} placeholder="0" />
                </div>
                {isTile ? (
                  <div className="pe-field">
                    <label>Counted in</label>
                    <select value={form.stockUnit} onChange={(e) => set({ stockUnit: e.target.value })}>
                      <option value="carton">Cartons</option>
                      <option value="sqm">Square metres</option>
                    </select>
                  </div>
                ) : <div />}
                <div className="pe-field">
                  <label>Kept at *</label>
                  <select value={form.location} onChange={(e) => set({ location: e.target.value })} className={errors.location ? 'error' : ''}>
                    <option value="">Choose...</option>
                    {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
              {errors.quantity && <span className="pe-error">{errors.quantity}</span>}
              {errors.location && <span className="pe-error">{errors.location}</span>}
              {isTile && num(form.quantity) > 0 && cartonSqm > 0 && (
                <p className="pe-summary">That is <strong>{fmtSqm(stockBase)} sqm</strong>{form.stockUnit === 'carton' ? ` (${fmtCount(form.quantity)} cartons x ${cartonSqm} sqm)` : ` = ${fmtCount(roundQty(stockBase / cartonSqm))} cartons`}.</p>
              )}
            </div>
          )}

          <div className="pe-section">
            <h3>Category</h3>
            <div className="pe-chips">
              {categoryOptions.map((c) => (
                <button type="button" key={c} className={`pe-chip${form.categories.includes(c) ? ' on' : ''}`} onClick={() => toggleCat(c)} aria-pressed={form.categories.includes(c)}>{c}</button>
              ))}
              {form.categories.filter((c) => !categoryOptions.includes(c)).map((c) => (
                <button type="button" key={c} className="pe-chip on" onClick={() => toggleCat(c)}>{c}</button>
              ))}
            </div>
            <div className="pe-addcat">
              <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCat(); } }} />
              <button type="button" className="pe-btn" onClick={addCat} disabled={!newCat.trim()}>Add</button>
            </div>
          </div>

          <div className="pe-section pe-more">
            <button type="button" className="pe-more-toggle" onClick={() => setMore(!more)} aria-expanded={more}>
              {more ? <FaChevronDown /> : <FaChevronRight />} More options <small>product type, supplier code, notes, extra details</small>
            </button>
            {more && (
              <div className="pe-more-body">
                <div className="pe-grid2">
                  <div className="pe-field">
                    <label>Product type</label>
                    <select value={form.productTypeId} onChange={(e) => set({ productTypeId: e.target.value })}>
                      <option value="">None</option>
                      {productTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <small className="pe-help">Optional. Groups similar items in reports. Types are made in Settings, Admin Settings.</small>
                  </div>
                  <div className="pe-field">
                    <label>Supplier code</label>
                    <input value={form.supplierCode} onChange={(e) => set({ supplierCode: e.target.value })} />
                  </div>
                </div>
                <div className="pe-field">
                  <label>Notes</label>
                  <textarea rows={2} value={form.description} onChange={(e) => set({ description: e.target.value })} />
                </div>
                <div className="pe-field">
                  <label>Extra details (for example Brand, Colour)</label>
                  {Object.entries(form.extra).map(([k, v]) => (
                    <div className="pe-extra" key={k}><span><strong>{k}:</strong> {String(v)}</span><button type="button" className="pe-link" onClick={() => { const next = { ...form.extra }; delete next[k]; set({ extra: next }); }}>Remove</button></div>
                  ))}
                  <div className="pe-addcat">
                    <input value={extraKey} onChange={(e) => setExtraKey(e.target.value)} placeholder="Name" />
                    <input value={extraValue} onChange={(e) => setExtraValue(e.target.value)} placeholder="Value" />
                    <button type="button" className="pe-btn" disabled={!extraKey.trim() || !extraValue.trim()} onClick={() => { set({ extra: { ...form.extra, [extraKey.trim()]: extraValue.trim() } }); setExtraKey(''); setExtraValue(''); }}>Add</button>
                  </div>
                </div>
                <label className="pe-checklabel pe-check"><input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} /> Available for sale</label>
              </div>
            )}
          </div>

          <div className="pe-actions">
            <button type="button" className="pe-cancel" onClick={onCancel}>Cancel</button>
            <button type="submit" className="pe-save" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Add item'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductEditor;
