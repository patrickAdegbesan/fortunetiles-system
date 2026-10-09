// Quantities are kept in the product's base unit (square metres for tiles). A product may also be sold in packs
// (cartons): packSize says how many base units one pack holds. Stock, prices and calculations stay in the base unit.
const roundQty = (n) => Math.round((Number(n) || 0) * 10000) / 10000;
const roundMoney = (n) => Math.round((Number(n) || 0) * 100) / 100;
const hasPack = (product) => Number(product && product.packSize) > 0;

module.exports = { roundQty, roundMoney, hasPack };
