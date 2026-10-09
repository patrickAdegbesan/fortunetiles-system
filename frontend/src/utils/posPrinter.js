// Printing on the NEXGO/XGD POS terminal's built-in thermal printer (Android app only).
// The native NexgoPrinter plugin draws a list of simple items (text rows, dashed lines, images) and prints it.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { PRINT_LOGO } from '../pos/printLogo';

const NexgoPrinter = registerPlugin('NexgoPrinter');

export const isPosTerminal = () => {
  try { return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'; } catch (_) { return false; }
};

const money = (v) => `₦${parseFloat(v || 0).toLocaleString('en-NG')}`;

const PAYMENT_LABELS = { cash: 'Cash', card: 'Card', bank_transfer: 'Bank transfer', pos: 'POS', transfer: 'Bank transfer' };

function formatDate(value) {
  const d = value ? new Date(value) : new Date();
  const date = isNaN(d.getTime()) ? new Date() : d;
  return date.toLocaleString('en-NG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

/** Turns a sale (as returned by the sales/orders API) into printer items. */
export async function buildReceiptItems(sale, { withLogo = true } = {}) {
  const items = [];
  const rule = { type: 'line' };

  if (withLogo) items.push({ type: 'image', data: PRINT_LOGO, maxWidth: 120 });
  items.push({ type: 'text', text: 'Fortune et Feveur', align: 'center', size: 'large', bold: true });
  items.push({ type: 'text', text: 'Lekki-Epe Expressway, Opp Sapphire Garden, Beside Danco Petrol Station, Awoyaya, Lagos', align: 'center', size: 'small' });
  items.push({ type: 'text', text: 'Tel: +234 806 219 5610', align: 'center', size: 'small' });
  items.push({ type: 'text', text: 'Fortuneetfeveur@gmail.com', align: 'center', size: 'small' });
  items.push({ type: 'text', text: 'www.fortuneetfeveur.com', align: 'center', size: 'small' });
  items.push(rule);
  items.push({ type: 'text', text: 'SALES RECEIPT', align: 'center', bold: true });
  items.push(rule);

  const cashier = sale.user || sale.cashier || {};
  const servedBy = [cashier.firstName, cashier.lastName].filter(Boolean).join(' ') || cashier.name || '';
  const location = (sale.location && sale.location.name) || (typeof sale.location === 'string' ? sale.location : '') || 'Main Store';
  const info = [
    ['Receipt No', `FT-${String(sale.id).padStart(6, '0')}`],
    ['Date', formatDate(sale.createdAt || sale.created_at || sale.saleDate)],
    ['Location', location],
    ['Customer', sale.customerName || 'Walk-in Customer'],
  ];
  if (sale.customerPhone) info.push(['Phone', sale.customerPhone]);
  if (servedBy) info.push(['Served by', servedBy]);
  info.forEach(([k, v]) => items.push({ type: 'row', left: `${k}:`, right: String(v), size: 'small' }));
  items.push(rule);

  (sale.items || []).forEach((item) => {
    const name = (item.product && item.product.name) || item.productName || 'Product';
    const qty = item.quantity;
    const unit = item.unit || (item.product && item.product.unitOfMeasure) || '';
    const total = item.lineTotal || item.totalPrice || item.quantity * item.unitPrice;
    items.push({ type: 'text', text: name, bold: true });
    items.push({ type: 'row', left: `${qty} ${unit} x ${money(item.unitPrice)}`.replace('  ', ' '), right: money(total), size: 'small' });
  });
  items.push(rule);

  const total = sale.totalAmount || sale.total;
  const subtotal = sale.subtotalAmount || total;
  let discount = 0;
  if (sale.discountType && sale.discountValue && sale.subtotalAmount) {
    discount = sale.discountType === 'percentage'
      ? (sale.subtotalAmount * sale.discountValue) / 100
      : Math.min(sale.discountValue, sale.subtotalAmount);
  }
  items.push({ type: 'row', left: 'Subtotal', right: money(subtotal) });
  if (discount > 0) {
    items.push({ type: 'row', left: `Discount${sale.discountType === 'percentage' ? ` (${sale.discountValue}%)` : ''}`, right: `-${money(discount)}` });
  }
  items.push({ type: 'row', left: 'TOTAL', right: money(total), size: 'large', bold: true });
  items.push({ type: 'row', left: 'Payment', right: PAYMENT_LABELS[sale.paymentMethod] || String(sale.paymentMethod || ''), size: 'small' });

  (sale.returns || []).forEach((ret) => {
    items.push(rule);
    items.push({ type: 'text', text: `RETURN #${ret.id} - ${ret.status || ''}`, bold: true, size: 'small' });
    if (ret.totalRefundAmount) items.push({ type: 'row', left: 'Refund', right: money(ret.totalRefundAmount), size: 'small' });
    if (ret.reason) items.push({ type: 'text', text: `Reason: ${ret.reason}`, size: 'small' });
  });

  items.push(rule);
  items.push({ type: 'text', text: 'BANK DETAILS', bold: true, size: 'small' });
  items.push({ type: 'text', text: 'Access Bank 0000000001', size: 'small' });
  items.push({ type: 'text', text: 'Zenith Bank 0000000003', size: 'small' });
  items.push({ type: 'text', text: 'Fortune et Fever Nig LTD', size: 'small' });
  items.push(rule);
  items.push({ type: 'text', text: 'Returns within 7 days with this receipt. No refund after payment, exchange only.', size: 'small', align: 'center' });
  items.push({ type: 'space', px: 10 });
  items.push({ type: 'text', text: 'Thank you for your business!', align: 'center', bold: true });
  items.push({ type: 'text', text: 'Quality tiles for your dream spaces', align: 'center', size: 'small' });
  return items;
}

function explain(error) {
  const msg = String((error && error.message) || error || 'Unknown error');
  if (/code (-1|9)|status 3|open the printer/i.test(msg)) {
    return 'The printer is not ready. Check that paper is loaded and the printer cover is closed, then try again.';
  }
  if (/ClassNotFound|NameNotFound|not implemented|not available/i.test(msg)) {
    return 'This device has no built-in printer service.';
  }
  return msg;
}

/** Prints a sale on the terminal. Resolves { ok, message }. */
export async function printReceiptOnTerminal(sale) {
  try {
    const items = await buildReceiptItems(sale);
    await NexgoPrinter.print({ items, width: 384, feed: 260, dump: !!window.__ftDump }); // long feed so the last lines clear the tear bar
    return { ok: true, message: 'Receipt printed.' };
  } catch (error) {
    return { ok: false, message: explain(error) };
  }
}

/** Prints a short test slip. */
export async function printTestSlip() {
  try {
    await NexgoPrinter.print({
      width: 384,
      feed: 180,
      items: [
        { type: 'text', text: 'Fortune et Feveur', align: 'center', size: 'large', bold: true },
        { type: 'text', text: 'Printer test', align: 'center' },
        { type: 'line' },
        { type: 'row', left: 'Sample item  2 x ₦45,000', right: '₦90,000', size: 'small' },
        { type: 'row', left: 'TOTAL', right: '₦90,000', bold: true },
        { type: 'line' },
        { type: 'text', text: formatDate(new Date()), align: 'center', size: 'small' },
        { type: 'text', text: 'If you can read this, printing works.', align: 'center', size: 'small' },
      ],
    });
    return { ok: true, message: 'Test slip printed.' };
  } catch (error) {
    return { ok: false, message: explain(error) };
  }
}

/** Asks the printer module whether the terminal's printer library is present and the printer opens. */
export async function printerStatus() {
  try {
    const s = await NexgoPrinter.status();
    return { available: !!s.available, ready: !!s.available && s.statusCode === 0, statusCode: s.statusCode, error: s.error };
  } catch (error) {
    return { available: false, ready: false, error: explain(error) };
  }
}
