/**
 * ReceiptBuilder
 * Formats receipt content into ESC/POS command arrays.
 * Supports 58mm and 80mm thermal paper widths.
 */

class ReceiptBuilder {
  constructor(config = {}) {
    this.width = config.paperWidthMm || 80; // 58 or 80
    this.headerLines = config.headerLines || 'FORTUNE TILES\n123 Warehouse Road\nLagos, Nigeria\n0800-123-4567';
    this.footerLines = config.footerLines || 'Thank you for your business!\nGoods sold in good condition\nare non-refundable.';
    this.showBarcode = config.showBarcode !== false;
    this.currencySymbol = config.currencySymbol || '\u20A6'; // ₦
  }

  /**
   * Build ESC/POS commands for a sale receipt
   * @param {Object} saleData
   * @returns {Array} Array of command objects for PrinterService
   */
  buildSaleReceipt(saleData) {
    const {
      receiptNumber,
      date,
      cashier,
      items = [],
      subtotal,
      discountType,
      discountValue,
      total,
      paymentMethod,
      tendered,
      change,
      customerName,
      customerPhone
    } = saleData;

    const commands = [];

    // Initialize
    commands.push({ type: 'init' });

    // Header (centered, bold)
    commands.push({ type: 'align', value: 'ct' });
    commands.push({ type: 'style', value: 'b' });
    commands.push({ type: 'size', width: 1, height: 1 });
    this.headerLines.split('\n').forEach(line => {
      commands.push({ type: 'text', value: line });
    });
    commands.push({ type: 'style', value: 'normal' });
    commands.push({ type: 'text', value: this.repeatChar('-', this.getDividerLength()) });

    // Receipt info (left aligned)
    commands.push({ type: 'align', value: 'lt' });
    commands.push({ type: 'size', width: 0, height: 0 });
    commands.push({ type: 'text', value: `Receipt: ${receiptNumber}` });
    commands.push({ type: 'text', value: `Date: ${date}` });
    commands.push({ type: 'text', value: `Cashier: ${cashier}` });
    if (customerName) {
      commands.push({ type: 'text', value: `Customer: ${customerName}` });
    }
    if (customerPhone) {
      commands.push({ type: 'text', value: `Phone: ${customerPhone}` });
    }
    commands.push({ type: 'text', value: this.repeatChar('-', this.getDividerLength()) });

    // Items
    items.forEach(item => {
      commands.push(...this.buildItemLine(item));
    });

    commands.push({ type: 'text', value: this.repeatChar('-', this.getDividerLength()) });

    // Totals (right aligned for amounts)
    commands.push({ type: 'align', value: 'rt' });
    commands.push({ type: 'text', value: `Subtotal:     ${this.formatMoney(subtotal)}` });
    
    if (discountValue && discountValue > 0) {
      const discountLabel = discountType === 'percentage' 
        ? `Discount (${discountValue}%):` 
        : 'Discount:';
      const discountAmount = discountType === 'percentage'
        ? (subtotal * discountValue / 100)
        : discountValue;
      commands.push({ type: 'text', value: `${discountLabel} -${this.formatMoney(discountAmount)}` });
    }

    commands.push({ type: 'style', value: 'b' });
    commands.push({ type: 'size', width: 1, height: 1 });
    commands.push({ type: 'text', value: `TOTAL:        ${this.formatMoney(total)}` });
    commands.push({ type: 'style', value: 'normal' });
    commands.push({ type: 'size', width: 0, height: 0 });

    // Payment details (left aligned)
    commands.push({ type: 'align', value: 'lt' });
    commands.push({ type: 'text', value: `Payment: ${paymentMethod.toUpperCase()}` });
    if (tendered !== undefined) {
      commands.push({ type: 'text', value: `Tendered:     ${this.formatMoney(tendered)}` });
    }
    if (change !== undefined) {
      commands.push({ type: 'text', value: `Change:       ${this.formatMoney(change)}` });
    }

    commands.push({ type: 'text', value: this.repeatChar('-', this.getDividerLength()) });

    // Footer (centered)
    commands.push({ type: 'align', value: 'ct' });
    this.footerLines.split('\n').forEach(line => {
      commands.push({ type: 'text', value: line });
    });

    // Barcode
    if (this.showBarcode && receiptNumber) {
      commands.push({ type: 'text', value: '' }); // spacing
      commands.push({ type: 'barcode', code: receiptNumber, type: 'CODE128' });
      commands.push({ type: 'text', value: receiptNumber });
    }

    // Cut paper
    commands.push({ type: 'text', value: '' });
    commands.push({ type: 'cut' });

    return commands;
  }

  /**
   * Build ESC/POS commands for a test / configuration page
   */
  buildTestPage(config = {}) {
    const commands = [];
    commands.push({ type: 'init' });
    commands.push({ type: 'align', value: 'ct' });
    commands.push({ type: 'style', value: 'b' });
    commands.push({ type: 'size', width: 1, height: 1 });
    commands.push({ type: 'text', value: 'PRINTER TEST' });
    commands.push({ type: 'style', value: 'normal' });
    commands.push({ type: 'size', width: 0, height: 0 });
    commands.push({ type: 'text', value: this.repeatChar('-', this.getDividerLength()) });
    commands.push({ type: 'align', value: 'lt' });
    commands.push({ type: 'text', value: `Width: ${this.width}mm` });
    commands.push({ type: 'text', value: `Date: ${new Date().toLocaleString()}` });
    commands.push({ type: 'text', value: '' });
    commands.push({ type: 'text', value: 'Character test:' });
    commands.push({ type: 'text', value: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' });
    commands.push({ type: 'text', value: 'abcdefghijklmnopqrstuvwxyz' });
    commands.push({ type: 'text', value: '0123456789 !@#$%^&*()_+-=[]{}' });
    commands.push({ type: 'text', value: '' });
    commands.push({ type: 'text', value: `Currency: ${this.currencySymbol}1,234.56` });
    commands.push({ type: 'text', value: this.repeatChar('-', this.getDividerLength()) });
    commands.push({ type: 'align', value: 'ct' });
    commands.push({ type: 'text', value: 'Printer is working!' });
    commands.push({ type: 'text', value: '' });
    commands.push({ type: 'barcode', code: 'TEST123456', type: 'CODE128' });
    commands.push({ type: 'cut' });
    return commands;
  }

  buildItemLine(item) {
    const commands = [];
    const { name, quantity, unitPrice, totalPrice, unitOfMeasure } = item;
    const uom = unitOfMeasure || 'sqm';
    
    // Product name
    commands.push({ type: 'align', value: 'lt' });
    commands.push({ type: 'text', value: this.truncate(name, this.getMaxNameLength()) });
    
    // Quantity x price = total (right aligned)
    const qtyLine = `  ${quantity} ${uom} x ${this.formatMoney(unitPrice)}`;
    const totalStr = this.formatMoney(totalPrice);
    const padding = this.getContentWidth() - qtyLine.length - totalStr.length;
    const line = `${qtyLine}${this.repeatChar(' ', Math.max(0, padding))}${totalStr}`;
    commands.push({ type: 'text', value: line });
    
    return commands;
  }

  getDividerLength() {
    // Approximate characters per line
    return this.width === 58 ? 32 : 48;
  }

  getContentWidth() {
    return this.getDividerLength();
  }

  getMaxNameLength() {
    return this.getContentWidth();
  }

  formatMoney(amount) {
    if (amount === undefined || amount === null) return `${this.currencySymbol}0.00`;
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${this.currencySymbol}${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }

  truncate(str, maxLen) {
    if (!str) return '';
    return str.length > maxLen ? str.substring(0, maxLen - 3) + '...' : str;
  }

  repeatChar(char, count) {
    return char.repeat(Math.max(0, count));
  }
}

module.exports = ReceiptBuilder;
