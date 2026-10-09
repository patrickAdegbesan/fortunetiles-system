import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes, FaCheck, FaPrint, FaLock, FaLockOpen } from 'react-icons/fa';
import { Screen, Card, Field, Button, Chips, Stepper, Empty, ConfirmDialog, money, Thumb } from '../ui';
import { useCatalog, useCart, useToast } from '../store';
import { createSale, verifyMarkupPin } from '../../services/api';
import { printReceiptOnTerminal, isPosTerminal } from '../../utils/posPrinter';

const PAYMENTS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Transfer' },
  { value: 'pos', label: 'POS' },
];

export default function Cart() {
  const cart = useCart();
  const { locationId, location, stock, reloadStock } = useCatalog();
  const toast = useToast();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [payment, setPayment] = useState('');
  const [discType, setDiscType] = useState('');
  const [discValue, setDiscValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  const subtotal = cart.subtotal;
  const dv = parseFloat(discValue) || 0;
  const discount = discType === 'percentage' ? Math.min(subtotal, (subtotal * dv) / 100) : discType === 'amount' ? Math.min(subtotal, dv) : 0;
  const total = Math.max(0, subtotal - discount);

  const charge = async () => {
    setError('');
    if (!payment) { setError('Choose how the customer is paying.'); return; }
    setBusy(true);
    try {
      const result = await createSale({
        locationId,
        customerName: customer.name.trim() || 'Walk-in Customer',
        customerPhone: customer.phone.trim(),
        paymentMethod: payment,
        discountType: discType || null,
        discountValue: dv,
        subtotalAmount: subtotal,
        items: cart.list.map((l) => ({ productId: l.product.id, quantity: l.qty, unitPrice: Number(l.product.price), markupPrice: l.markup || 0 })),
      });
      setDone(result.sale);
      cart.clear();
      reloadStock();
    } catch (e) {
      const detail = e && e.errors && e.errors.map((x) => x.message).join(' ');
      setError(detail || (e && e.message) || 'Could not complete the sale');
    } finally {
      setBusy(false);
    }
  };

  const print = async () => {
    setPrinting(true);
    const r = await printReceiptOnTerminal(done);
    setPrinting(false);
    toast(r.message, r.ok ? 'ok' : 'error');
  };

  const tryPin = async () => {
    setPinError('');
    try {
      await verifyMarkupPin(pin);
      cart.unlockMarkup();
      setPinOpen(false);
      setPin('');
      toast('Price editing unlocked');
    } catch (e) {
      setPinError((e && e.message) || 'Wrong PIN');
    }
  };

  if (done) {
    return (
      <Screen title="Sale complete" right={null}>
        <div className="pos-done">
          <div className="big"><FaCheck aria-hidden="true" /></div>
          <h2>Sale complete</h2>
          <p>Receipt FT-{String(done.id).padStart(6, '0')}</p>
          <div className="amount">{money(done.totalAmount)}</div>
          {isPosTerminal() && <Button kind="primary" block busy={printing} onClick={print}><FaPrint aria-hidden="true" />Print receipt</Button>}
          <Button kind="ghost" block onClick={() => navigate(`/orders/${done.id}`)}>View order</Button>
          <Button kind="green" block onClick={() => navigate('/sell', { replace: true })}>New sale</Button>
        </div>
      </Screen>
    );
  }

  if (cart.list.length === 0) {
    return <Screen title="Cart" back="/sell"><Empty title="Your cart is empty" hint="Go back and add some products." /></Screen>;
  }

  const footer = (
    <>
      {error && <div className="pos-field-error" role="alert" style={{ marginBottom: 6 }}>{error}</div>}
      <Button kind="primary" block busy={busy} onClick={charge} disabled={!payment}>
        {payment ? `Charge ${money(total)}` : 'Choose a payment method'}
      </Button>
    </>
  );

  return (
    <Screen title="Cart" back="/sell" footer={footer}
      right={<button type="button" className="pos-icon-btn" aria-label="Clear cart" onClick={() => cart.clear()}><FaTimes aria-hidden="true" /></button>}>
      <Card>
        <h2>{location ? location.name : 'Items'}</h2>
        {cart.list.map((l) => {
          const max = stock[l.product.id] || 0;
          const unit = Number(l.product.price) + (l.markup || 0);
          return (
            <div className="pos-line" key={l.product.id}>
              <Thumb src={l.product.imageUrl} name={l.product.name} />
              <div className="pos-line-main">
                <div className="pos-row-title">{l.product.name}</div>
                <div className="pos-row-sub">{money(unit)} / {l.product.unitOfMeasure || 'pcs'}</div>
              </div>
              <button type="button" className="pos-x" aria-label={`Remove ${l.product.name}`} onClick={() => cart.setQty(l.product, 0)}><FaTimes aria-hidden="true" /></button>
              <Stepper value={l.qty} min={1} max={max} onChange={(n) => cart.setQty(l.product, n)} label={`${l.product.name} quantity`} />
              <strong className="pos-line-total">{money(l.qty * unit)}</strong>
              {cart.markupUnlocked && (
                <label className="pos-line-markup">Markup per unit ₦
                  <input inputMode="decimal" value={l.markup || ''} placeholder="0" onChange={(e) => cart.setMarkup(l.product.id, e.target.value)} />
                </label>
              )}
            </div>
          );
        })}
        <div style={{ marginTop: 8 }}>
          {cart.markupUnlocked
            ? <button type="button" className="pos-link" onClick={() => cart.lockMarkup()}><FaLockOpen aria-hidden="true" /> Price editing on - lock</button>
            : <button type="button" className="pos-link" onClick={() => setPinOpen(true)}><FaLock aria-hidden="true" /> Edit prices (PIN)</button>}
        </div>
      </Card>

      <Card>
        <h2>Payment</h2>
        <Chips options={PAYMENTS} value={payment} onChange={setPayment} />
      </Card>

      <Card>
        <h2>Customer (optional)</h2>
        <div className="pos-row2">
          <Field><input placeholder="Name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} /></Field>
          <Field><input placeholder="Phone" inputMode="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></Field>
        </div>
      </Card>

      <Card>
        <h2>Discount</h2>
        <Chips options={[{ value: '', label: 'None' }, { value: 'percentage', label: 'Percent %' }, { value: 'amount', label: 'Amount ₦' }]} value={discType} onChange={(v) => { setDiscType(v); setDiscValue(''); }} />
        {discType && <div style={{ marginTop: 8 }}><input inputMode="decimal" placeholder={discType === 'percentage' ? 'e.g. 10' : 'e.g. 500'} value={discValue} onChange={(e) => setDiscValue(e.target.value)} /></div>}
      </Card>

      <Card>
        <div className="pos-kv"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
        {discount > 0 && <div className="pos-kv"><span>Discount{discType === 'percentage' ? ` (${dv}%)` : ''}</span><strong>-{money(discount)}</strong></div>}
        <div className="pos-kv total"><span>Total</span><strong>{money(total)}</strong></div>
      </Card>

      {pinOpen && (
        <div className="pos-modal" role="dialog" aria-modal="true" aria-label="Enter PIN">
          <div className="pos-dialog">
            <h2>Admin PIN</h2>
            <p>Enter the 4-digit PIN to edit prices on this sale.</p>
            <input inputMode="numeric" maxLength={4} type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className={pinError ? 'error' : ''} autoFocus />
            {pinError && <div className="pos-field-error">{pinError}</div>}
            <div className="pos-dialog-actions" style={{ marginTop: 12 }}>
              <button type="button" className="pos-btn ghost" onClick={() => { setPinOpen(false); setPin(''); setPinError(''); }}>Cancel</button>
              <button type="button" className="pos-btn primary" disabled={pin.length !== 4} onClick={tryPin}>Unlock</button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}
