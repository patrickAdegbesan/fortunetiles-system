/**
 * PrinterService
 * High-level service for printing receipts via ESC/POS thermal printers.
 * Handles device connection, command execution, and error recovery.
 */

const escpos = require('escpos');

// Attempt to load USB support; gracefully degrade if native module fails
let USB;
let usbModuleAvailable = false;
try {
  USB = require('escpos-usb');
  usbModuleAvailable = true;
} catch (err) {
  console.warn('[PrinterService] escpos-usb not available:', err.message);
  console.warn('[PrinterService] Printer will run in mock mode.');
}

const PrinterDetector = require('./PrinterDetector');
const ReceiptBuilder = require('./ReceiptBuilder');

class PrinterService {
  constructor() {
    this.detector = new PrinterDetector();
    this.currentDevice = null;
    this.currentPrinter = null;
    this.config = {
      paperWidthMm: 80,
      headerLines: 'FORTUNE TILES\n123 Warehouse Road\nLagos, Nigeria\n0800-123-4567',
      footerLines: 'Thank you for your business!\nGoods sold in good condition\nare non-refundable.',
      showBarcode: true,
      currencySymbol: '\u20A6'
    };
    this.isMockMode = false;
    this.mockOutputPath = null;
    this.status = 'unknown'; // unknown, connected, error, mock
    this.lastError = null;
  }

  /**
   * Initialize the printer service
   * @param {Object} options
   * @param {boolean} options.mock - Use mock mode (no hardware)
   * @param {string} options.mockOutputPath - Path to write mock receipts
   * @param {Object} options.config - Receipt configuration
   */
  initialize(options = {}) {
    if (options.mock) {
      this.isMockMode = true;
      this.mockOutputPath = options.mockOutputPath || null;
      this.status = 'mock';
      console.log('[PrinterService] Initialized in MOCK mode');
      return;
    }

    if (options.config) {
      this.config = { ...this.config, ...options.config };
    }

    this.detectAndConnect();
  }

  /**
   * Auto-detect printer and attempt connection
   */
  detectAndConnect() {
    try {
      const detected = this.detector.findFirst();
      if (detected) {
        console.log(`[PrinterService] Detected: ${detected.name} (VID:${detected.vid}, PID:${detected.pid})`);
        this.connect(detected.vid, detected.pid);
      } else {
        console.log('[PrinterService] No USB printer detected');
        this.status = 'unknown';
      }
    } catch (error) {
      console.error('[PrinterService] Detection error:', error.message);
      this.status = 'error';
      this.lastError = error.message;
    }
  }

  /**
   * Connect to a specific USB printer
   * @param {number} vid - Vendor ID
   * @param {number} pid - Product ID
   */
  connect(vid, pid) {
    try {
      if (this.currentDevice) {
        this.disconnect();
      }

      const device = new USB(vid, pid);
      this.currentDevice = device;
      this.currentPrinter = new escpos.Printer(device);
      this.status = 'connected';
      this.lastError = null;
      console.log(`[PrinterService] Connected to printer (VID:${vid}, PID:${pid})`);
      return true;
    } catch (error) {
      console.error('[PrinterService] Connection failed:', error.message);
      this.status = 'error';
      this.lastError = error.message;
      return false;
    }
  }

  /**
   * Disconnect current printer
   */
  disconnect() {
    try {
      if (this.currentDevice && this.currentDevice.close) {
        this.currentDevice.close();
      }
    } catch (_) {
      // Ignore close errors
    }
    this.currentDevice = null;
    this.currentPrinter = null;
    this.status = 'unknown';
  }

  /**
   * Execute a sequence of ESC/POS commands
   * @param {Array} commands - Commands from ReceiptBuilder
   * @returns {Promise<boolean>}
   */
  async executeCommands(commands) {
    if (this.isMockMode) {
      return this.executeMock(commands);
    }

    if (!this.currentDevice || !this.currentPrinter) {
      this.lastError = 'No printer connected';
      return false;
    }

    return new Promise((resolve) => {
      try {
        this.currentDevice.open((error) => {
          if (error) {
            console.error('[PrinterService] Device open error:', error.message);
            this.status = 'error';
            this.lastError = error.message;
            resolve(false);
            return;
          }

          try {
            let printer = this.currentPrinter;

            for (const cmd of commands) {
              switch (cmd.type) {
                case 'init':
                  // printer already initialized by constructor
                  break;
                case 'text':
                  if (cmd.value) printer.text(cmd.value);
                  break;
                case 'align':
                  printer.align(cmd.value); // lt, ct, rt
                  break;
                case 'style':
                  if (cmd.value === 'b') printer.style('b');
                  else if (cmd.value === 'bu') printer.style('bu');
                  else printer.style('normal');
                  break;
                case 'size':
                  printer.size(cmd.width || 0, cmd.height || 0);
                  break;
                case 'font':
                  printer.font(cmd.value || 'a');
                  break;
                case 'drawLine':
                case 'line':
                  printer.drawLine();
                  break;
                case 'barcode':
                  if (cmd.code && cmd.type) {
                    try {
                      printer.barcode(cmd.code, cmd.barcodeType || 'CODE128');
                    } catch (barcodeErr) {
                      // Barcode can fail on some printers, fallback to text
                      printer.text(`[${cmd.code}]`);
                    }
                  }
                  break;
                case 'cut':
                  printer.cut();
                  break;
                case 'beep':
                  printer.beep();
                  break;
                case 'cashdraw':
                  printer.cashdraw(cmd.pin || 2);
                  break;
                case 'feed':
                  printer.feed(cmd.lines || 1);
                  break;
                default:
                  console.warn('[PrinterService] Unknown command:', cmd.type);
              }
            }

            printer.close();
            this.status = 'connected';
            this.lastError = null;
            resolve(true);
          } catch (execError) {
            console.error('[PrinterService] Execution error:', execError.message);
            this.status = 'error';
            this.lastError = execError.message;
            resolve(false);
          }
        });
      } catch (error) {
        console.error('[PrinterService] Fatal execution error:', error.message);
        this.status = 'error';
        this.lastError = error.message;
        resolve(false);
      }
    });
  }

  /**
   * Mock execution - logs to console and optionally writes to file
   */
  async executeMock(commands) {
    const output = [];
    output.push('========== MOCK RECEIPT ==========');
    
    for (const cmd of commands) {
      switch (cmd.type) {
        case 'text':
          if (cmd.value) output.push(cmd.value);
          break;
        case 'align':
          output.push(`[ALIGN: ${cmd.value}]`);
          break;
        case 'style':
          output.push(`[STYLE: ${cmd.value}]`);
          break;
        case 'size':
          output.push(`[SIZE: ${cmd.width}x${cmd.height}]`);
          break;
        case 'barcode':
          output.push(`[BARCODE: ${cmd.code}]`);
          break;
        case 'cut':
          output.push('[CUT]');
          break;
        case 'line':
        case 'drawLine':
          output.push('--------------------------------');
          break;
      }
    }
    output.push('========== END MOCK ==========');
    
    const receiptText = output.join('\n');
    console.log('[PrinterService] MOCK PRINT:\n' + receiptText);

    if (this.mockOutputPath) {
      try {
        const fs = require('fs');
        const path = require('path');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filePath = path.join(this.mockOutputPath, `receipt-${timestamp}.txt`);
        fs.mkdirSync(this.mockOutputPath, { recursive: true });
        fs.writeFileSync(filePath, receiptText);
        console.log('[PrinterService] Mock receipt saved to:', filePath);
      } catch (err) {
        console.error('[PrinterService] Failed to save mock receipt:', err.message);
      }
    }

    return true;
  }

  /**
   * Print a sale receipt
   * @param {Object} saleData
   * @returns {Promise<boolean>}
   */
  async printReceipt(saleData) {
    const builder = new ReceiptBuilder(this.config);
    const commands = builder.buildSaleReceipt(saleData);
    return this.executeCommands(commands);
  }

  /**
   * Print a test page
   * @returns {Promise<boolean>}
   */
  async printTestPage() {
    const builder = new ReceiptBuilder(this.config);
    const commands = builder.buildTestPage();
    return this.executeCommands(commands);
  }

  /**
   * Get current printer status
   */
  getStatus() {
    return {
      status: this.status,
      lastError: this.lastError,
      isMockMode: this.isMockMode,
      config: this.config,
      connectedPrinter: this.detector.findFirst()?.name || null
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    return this.config;
  }
}

module.exports = PrinterService;
