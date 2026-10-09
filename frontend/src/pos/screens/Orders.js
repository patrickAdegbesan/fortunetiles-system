import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaPrint, FaUndoAlt, FaClipboardList } from 'react-icons/fa';
import { Screen, Card, Field, Button, Chips, Segmented, Empty, Loading, ErrorNote, SearchBox, Badge, Stepper, money, timeAgo } from '../ui';
import { useCatalog, useToast } from '../store';
import { useAuth } from '../../contexts/AuthContext';
import { fetchOrders, fetchOrderById, fetchReturns, createReturn, updateReturnStatus } from '../../services/api';
import { printReceiptOnTerminal, isPosTerminal } from '../../utils/posPrinter';

const PAGE = 40;
const PAY = { cash: 'Cash', card: 'Card', bank_transfer: 'Transfer', pos: 'POS' };
const orderTotal = (o) => o.total || o.totalAmount || 0;

/* ----------------------------------------------------------------- list */
export function OrdersList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState(null);
  const [returns, setReturns] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(PAGE);
  const toast = useToast();

  const load = useCallback(async () => {
    setError('');
    try {
      const [o, r] = await Promise.all([fetchOrders(), fetchReturns()]);
      setOrders(Array.isArray(o) ? o : o.orders || []);
      setReturns(r.returns || []);
    } catch (e) { setError((e && (e.message || e.error)) || 'Could not load orders'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (orders || []).filter((o) => !term || String(o.id).includes(term) || (o.customerName || '').toLowerCase().includes(term) || (o.customerPhone || '').includes(term));
  }, [orders, q]);

  const pending = (returns || []).filter((r) => r.status === 'PENDING').length;
  const canApprove = user && ['owner', 'manager'].includes(user.role);

  const setStatus = async (r, status) => {
    try { await updateReturnStatus(r.id, status); toast(`Return ${status.toLowerCase()}`); load(); }
    catch (e) { toast((e && (e.message || e.error)) || 'Could not update', 'error'); }
  };

  return (
    <Screen title="Orders" top={<Segmented value={tab} onChange={setTab} options={[{ value: 'orders', label: 'Orders' }, { value: 'returns', label: `Returns${pending ? ` (${pending})` : ''}` }]} />} flush>
      {error && <ErrorNote message={error} onRetry={load} />}
      {!orders && !error && <Loading />}
      {tab === 'orders' && orders && (
        <>
          <div style={{ padding: '8px 12px' }}><SearchBox value={q} onChange={(v) => { setQ(v); setShown(PAGE); }} placeholder="Search name, phone or number" /></div>
          {list.length === 0 && <Empty icon={<FaClipboardList aria-hidden="true" />} title="No orders yet" hint="Completed sales appear here." />}
          <div className="pos-list">
            {list.slice(0, shown).map((o) => (
              <button type="button" className="pos-row" key={o.id} onClick={() => navigate(`/orders/${o.id}`)}>
                <div className="pos-row-main">
                  <div className="pos-row-title">#{o.id} · {o.customerName || 'Walk-in Customer'}</div>
                  <div className="pos-row-sub">{timeAgo(o.createdAt || o.saleDate)} · {PAY[o.paymentMethod] || o.paymentMethod}</div>
                </div>
                <div className="pos-row-end"><strong>{money(orderTotal(o))}</strong>{(o.returns || []).length ? <Badge tone="amber">Returned</Badge> : null}</div>
              </button>
            ))}
          </div>
          {list.length > shown && <div className="pos-more"><Button block onClick={() => setShown(shown + PAGE)}>Show more ({list.length - shown})</Button></div>}
        </>
      )}
      {tab === 'returns' && returns && (
        <>
          {returns.length === 0 && <Empty title="No returns" hint="Returns and exchanges appear here." />}
          <div className="pos-list">
            {returns.map((r) => (
              <div className="pos-row" key={r.id} style={{ alignItems: 'flex-start', cursor: 'default' }}>
                <div className="pos-row-main">
                  <div className="pos-row-title">Return #{r.id} · order #{r.saleId}</div>
                  <div className="pos-row-sub">{r.returnType} · {timeAgo(r.returnDate || r.created_at)}</div>
                  {r.reason && <div className="pos-row-sub">{r.reason}</div>}
                  {r.status === 'PENDING' && canApprove && (
                    <div className="pos-row2" style={{ marginTop: 8 }}>
                      <Button kind="green" onClick={() => setStatus(r, 'APPROVED')}>Approve</Button>
                      <Button kind="danger" onClick={() => setStatus(r, 'REJECTED')}>Reject</Button>
                    </div>
                  )}
                </div>
                <div className="pos-row-end"><strong>{money(r.totalRefundAmount)}</strong><Badge tone={r.status === 'APPROVED' || r.status === 'COMPLETED' ? 'green' : r.status === 'REJECTED' ? 'red' : 'amber'}>{r.status}</Badge></div>
              </div>
            ))}
          </div>
        </>
      )}
    </Screen>
  );
}

/* --------------------------------------------------------------- detail */
export function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    fetchOrderById(id).then((o) => setOrder(o.order || o)).catch((e) => setError((e && (e.message || e.error)) || 'Could not load this order'));
  }, [id]);

  const print = async () => {
    setPrinting(true);
    const r = await printReceiptOnTerminal(order);
    setPrinting(false);
    toast(r.message, r.ok ? 'ok' : 'error');
  };

  if (error) return <Screen title="Order" back="/orders"><ErrorNote message={error} /></Screen>;
  if (!order) return <Screen title="Order" back="/orders"><Loading /></Screen>;

  const subtotal = order.subtotalAmount || orderTotal(order);
  let discount = 0;
  if (order.discountType && order.discountValue) discount = order.discountType === 'percentage' ? (subtotal * order.discountValue) / 100 : Math.min(order.discountValue, subtotal);
  const cashier = order.cashier || order.user || {};

  return (
    <Screen title={`Order #${order.id}`} back="/orders"
      footer={(
        <div className="pos-row2">
          {isPosTerminal() ? <Button kind="primary" busy={printing} onClick={print}><FaPrint aria-hidden="true" />Print</Button> : <span />}
          <Button onClick={() => navigate(`/orders/${order.id}/return`)}><FaUndoAlt aria-hidden="true" />Return</Button>
        </div>
      )}>
      <Card>
        <div className="pos-kv"><span>Customer</span><strong>{order.customerName || 'Walk-in Customer'}</strong></div>
        {order.customerPhone && <div className="pos-kv"><span>Phone</span><strong>{order.customerPhone}</strong></div>}
        <div className="pos-kv"><span>Date</span><strong>{timeAgo(order.createdAt || order.saleDate)}</strong></div>
        <div className="pos-kv"><span>Payment</span><strong>{PAY[order.paymentMethod] || order.paymentMethod}</strong></div>
        {(cashier.name || cashier.firstName) && <div className="pos-kv"><span>Served by</span><strong>{cashier.name || `${cashier.firstName} ${cashier.lastName || ''}`}</strong></div>}
      </Card>
      <Card>
        <h2>Items</h2>
        {(order.items || []).map((it) => (
          <div className="pos-kv" key={it.id}>
            <span style={{ color: 'var(--ink)' }}>{it.productName || (it.product && it.product.name)} <small style={{ color: 'var(--muted)' }}>× {it.quantity} {it.unit || ''}</small></span>
            <strong>{money(it.totalPrice || it.lineTotal || it.quantity * it.unitPrice)}</strong>
          </div>
        ))}
        <div className="pos-kv" style={{ borderTop: '1px dashed var(--line)', marginTop: 6, paddingTop: 8 }}><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
        {discount > 0 && <div className="pos-kv"><span>Discount</span><strong>-{money(discount)}</strong></div>}
        <div className="pos-kv total"><span>Total</span><strong>{money(orderTotal(order))}</strong></div>
      </Card>
      {(order.returns || []).length > 0 && (
        <Card>
          <h2>Returns</h2>
          {order.returns.map((r) => <div className="pos-kv" key={r.id}><span>#{r.id} {r.returnType}</span><strong>{money(r.totalRefundAmount)} <Badge tone="amber">{r.status}</Badge></strong></div>)}
        </Card>
      )}
    </Screen>
  );
}

/* --------------------------------------------------------- return / swap */
export function ReturnForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { products } = useCatalog();
  const [order, setOrder] = useState(null);
  const [type, setType] = useState('REFUND');
  const [qty, setQty] = useState({});
  const [swap, setSwap] = useState({});
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState('CASH');
  const [damaged, setDamaged] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetchOrderById(id).then((o) => setOrder(o.order || o)).catch((e) => setError((e && (e.message || e.error)) || 'Could not load this order')); }, [id]);

  const lines = (order && order.items) || [];
  const chosen = lines.filter((l) => (qty[l.id] || 0) > 0);
  const refund = chosen.reduce((n, l) => n + ((qty[l.id] / l.quantity) * l.unitPrice), 0);

  const submit = async () => {
    setError('');
    if (!chosen.length) { setError('Choose at least one item to return.'); return; }
    if (!reason.trim()) { setError('Please give a reason.'); return; }
    setBusy(true);
    try {
      await createReturn({
        saleId: Number(id),
        returnType: type,
        reason: reason.trim(),
        refundMethod: type === 'REFUND' ? method : undefined,
        items: chosen.map((l) => ({ saleItemId: l.id, quantity: qty[l.id], condition: damaged ? 'DAMAGED' : 'PERFECT', returnReason: reason.trim(), exchangeProductId: type === 'EXCHANGE' && swap[l.id] ? Number(swap[l.id]) : undefined })),
      });
      toast(type === 'REFUND' ? 'Return recorded' : 'Exchange recorded');
      navigate(`/orders/${id}`, { replace: true });
    } catch (e) { setError((e && (e.error || e.message)) || 'Could not record the return'); }
    finally { setBusy(false); }
  };

  if (error && !order) return <Screen title="Return" back><ErrorNote message={error} /></Screen>;
  if (!order) return <Screen title="Return" back><Loading /></Screen>;

  return (
    <Screen title={`Return · order #${order.id}`} back
      footer={(<>{error && <div className="pos-field-error" role="alert" style={{ marginBottom: 6 }}>{error}</div>}<Button kind="primary" block busy={busy} onClick={submit}>{type === 'REFUND' ? `Refund ${money(refund)}` : 'Record exchange'}</Button></>)}>
      <Segmented value={type} onChange={setType} options={[{ value: 'REFUND', label: 'Refund' }, { value: 'EXCHANGE', label: 'Exchange' }]} />
      <Card>
        <h2>What is coming back?</h2>
        {lines.map((l) => (
          <div className="pos-line" key={l.id}>
            <div className="pos-line-main"><div className="pos-row-title">{l.productName}</div><div className="pos-row-sub">Bought {l.quantity} × {money(l.unitPrice)}</div></div>
            <Stepper value={qty[l.id] || 0} min={0} max={l.quantity} onChange={(n) => setQty({ ...qty, [l.id]: n })} label={`${l.productName} quantity`} />
            {type === 'EXCHANGE' && (qty[l.id] || 0) > 0 && (
              <div style={{ flex: '1 1 100%' }}>
                <select value={swap[l.id] || ''} onChange={(e) => setSwap({ ...swap, [l.id]: e.target.value })} aria-label="Replacement product">
                  <option value="">Replacement product (optional)</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>
        ))}
      </Card>
      <Field label="Reason"><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. wrong size, cracked tile" className={error && !reason.trim() ? 'error' : ''} /></Field>
      <Field label="Condition"><Chips options={[{ value: 'ok', label: 'Perfect' }, { value: 'bad', label: 'Damaged' }]} value={damaged ? 'bad' : 'ok'} onChange={(v) => setDamaged(v === 'bad')} /></Field>
      {type === 'REFUND' && <Field label="Refund by"><Chips options={[{ value: 'CASH', label: 'Cash' }, { value: 'TRANSFER', label: 'Transfer' }, { value: 'CARD', label: 'Card' }]} value={method} onChange={setMethod} /></Field>}
    </Screen>
  );
}
