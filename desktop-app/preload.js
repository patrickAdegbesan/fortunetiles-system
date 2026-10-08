const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,

  // Printer APIs
  printer: {
    getStatus: () => ipcRenderer.invoke('printer:getStatus'),
    printTestPage: () => ipcRenderer.invoke('printer:printTestPage'),
    printReceipt: (saleData) => ipcRenderer.invoke('printer:printReceipt', saleData),
    detect: () => ipcRenderer.invoke('printer:detect'),
    updateConfig: (config) => ipcRenderer.invoke('printer:updateConfig', config)
  }
});
