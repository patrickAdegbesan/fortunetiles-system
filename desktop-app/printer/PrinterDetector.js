/**
 * PrinterDetector
 * Auto-detects USB ESC/POS thermal printers connected to the system.
 * Uses the 'usb' package to scan devices by vendor/product IDs.
 */

const usb = require('usb');

// Known ESC/POS thermal printer VID/PID mappings
const KNOWN_PRINTERS = [
  { name: 'Epson TM-T20', vid: 0x04b8, pid: 0x0e15 },
  { name: 'Epson TM-T20II', vid: 0x04b8, pid: 0x0e28 },
  { name: 'Epson TM-T82', vid: 0x04b8, pid: 0x0202 },
  { name: 'Epson TM-T82II', vid: 0x04b8, pid: 0x0e15 },
  { name: 'Xprinter XP-58', vid: 0x1fc9, pid: 0x2016 },
  { name: 'Xprinter XP-80', vid: 0x1fc9, pid: 0x2016 },
  { name: 'HPRT TP58', vid: 0x0483, pid: 0x5741 },
  { name: 'HPRT TP80', vid: 0x0483, pid: 0x5740 },
  { name: 'Gprinter GP-58', vid: 0x6868, pid: 0x0200 },
  { name: 'Gprinter GP-80', vid: 0x6868, pid: 0x0500 },
  { name: 'Zjiang ZJ-58', vid: 0x0483, pid: 0x5740 },
];

class PrinterDetector {
  constructor() {
    this.knownPrinters = new Map(); // vid:pid -> name
    KNOWN_PRINTERS.forEach(p => {
      this.knownPrinters.set(`${p.vid.toString(16)}:${p.pid.toString(16)}`, p.name);
    });
  }

  /**
   * Scan all USB devices and return any detected thermal printers
   * @returns {Array<{name: string, vid: number, pid: number, device: usb.Device}>}
   */
  scan() {
    const found = [];
    try {
      const devices = usb.getDeviceList();
      for (const device of devices) {
        const desc = device.deviceDescriptor;
        const vid = desc.idVendor;
        const pid = desc.idProduct;
        const key = `${vid.toString(16)}:${pid.toString(16)}`;
        const knownName = this.knownPrinters.get(key);
        
        if (knownName) {
          found.push({
            name: knownName,
            vid,
            pid,
            device,
            key
          });
        }
      }
    } catch (error) {
      console.error('[PrinterDetector] Error scanning USB devices:', error.message);
    }
    return found;
  }

  /**
   * Find the first connected printer
   * @returns {Object|null} Printer info or null
   */
  findFirst() {
    const printers = this.scan();
    return printers.length > 0 ? printers[0] : null;
  }

  /**
   * Check if a specific printer is still connected
   */
  isConnected(vid, pid) {
    try {
      const devices = usb.getDeviceList();
      return devices.some(d => 
        d.deviceDescriptor.idVendor === vid && 
        d.deviceDescriptor.idProduct === pid
      );
    } catch {
      return false;
    }
  }

  /**
   * Get all connected printers as serializable info (no device objects)
   */
  getConnectedPrintersInfo() {
    return this.scan().map(p => ({
      name: p.name,
      vid: p.vid,
      pid: p.pid,
      key: p.key
    }));
  }
}

module.exports = PrinterDetector;
