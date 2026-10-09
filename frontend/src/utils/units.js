// Tiles are sold by the square metre or by the carton. Stock, prices and every calculation are kept in the base unit
// (square metres); a product with a carton size (packSize = sqm in one carton) can also be sold, and shown, in cartons.
export const roundQty = (n) => Math.round((Number(n) || 0) * 10000) / 10000;
export const roundMoney = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const hasPack = (p) => Number(p && p.packSize) > 0;
export const isTile = (p) => !!p && p.unitOfMeasure === 'sqm';
export const packName = (p) => (p && p.packUnit) || 'carton';

const UNIT_LABELS = { sqm: 'sqm', pcs: 'pcs', bag: 'bag', box: 'box', kg: 'kg', m: 'm', l: 'l', set: 'set' };
export const unitLabel = (p) => UNIT_LABELS[p && p.unitOfMeasure] || (p && p.unitOfMeasure) || 'pcs';

/** 3.6 -> "3.60", 2 -> "2.00": square metres always show two decimals. */
export const fmtSqm = (n) => (Number(n) || 0).toFixed(2);
/** 2.5 -> "2.5", 3 -> "3", 1.3333 -> "1.33": counts of cartons or pieces drop needless zeros. */
export const fmtCount = (n) => {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return String(v);
};
const plural = (word, n) => (Math.abs(Number(n) - 1) < 1e-9 ? word : word.endsWith('s') ? word : `${word}s`);

export const cartonPrice = (p) => roundMoney((Number(p.price) || 0) * (Number(p.packSize) || 0));

/** Quantity in the base unit for an amount typed in either the base unit or the carton. */
export const toBase = (p, amount, unit) => (unit === 'pack' && hasPack(p) ? roundQty(Number(amount) * Number(p.packSize)) : roundQty(amount));
export const fromBase = (p, base, unit) => (unit === 'pack' && hasPack(p) ? roundQty(Number(base) / Number(p.packSize)) : roundQty(base));

/** "12.50 cartons (18.00 sqm)" for tiles with a carton size, otherwise "18.00 sqm" / "20 pcs". */
export const quantityText = (p, base) => {
  const b = Number(base) || 0;
  if (isTile(p) && hasPack(p)) {
    const c = fromBase(p, b, 'pack');
    return `${fmtCount(c)} ${plural(packName(p), c)} (${fmtSqm(b)} sqm)`;
  }
  if (isTile(p)) return `${fmtSqm(b)} sqm`;
  return `${fmtCount(b)} ${unitLabel(p)}`;
};

/** The unit a sale line was entered in, as text: "2.5 cartons (3.60 sqm)". Falls back to the plain base quantity. */
export const soldText = (item) => {
  const base = Number(item.quantity) || 0;
  const unit = item.unit || 'sqm';
  if (item.soldUnit && item.soldQuantity !== null && item.soldQuantity !== undefined && item.soldUnit !== unit) {
    return `${fmtCount(item.soldQuantity)} ${plural(item.soldUnit, item.soldQuantity)} (${fmtSqm(base)} ${unit})`;
  }
  return unit === 'sqm' ? `${fmtSqm(base)} sqm` : `${fmtCount(base)} ${unit}`;
};

/** Tile size typed as length x width in cm -> square metres of one piece. */
export const sqmPerPiece = (lengthCm, widthCm) => {
  const l = Number(lengthCm);
  const w = Number(widthCm);
  return l > 0 && w > 0 ? (l * w) / 10000 : 0;
};
