const { app, BrowserWindow, Menu, dialog, shell, session, ipcMain } = require('electron');
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const fs = require('fs');
const PrinterService = require('./printer/PrinterService');

// All data (database, JWT secret, Electron profile) lives in one folder.
// The portable build keeps it next to the .exe so the whole app can be moved
// between computers on a flash drive; otherwise it goes in the user profile.
const dataDir = process.env.FORTUNE_TILES_DATA
  || (process.env.PORTABLE_EXECUTABLE_DIR
    ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'FortuneTilesData')
    : path.join(app.getPath('appData'), 'FortuneTiles', 'data'));
fs.mkdirSync(dataDir, { recursive: true });
app.setPath('userData', path.join(dataDir, 'electron'));

let mainWindow;
let testWindow = null;
let backendProcess = null;
let quitting = false;

const printerService = new PrinterService();
let printerInitialized = false;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function waitForBackendReady(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!backendProcess) return false; // exited while starting
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return true;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 300));
  }
  return false;
}

function getBackendEntry() {
  // Packaged: resourcesPath/backend/server.js
  const packagedPath = path.join(process.resourcesPath, 'backend', 'server.js');
  if (fs.existsSync(packagedPath)) return packagedPath;
  // Dev: repo backend/server.js
  const devPath = path.join(__dirname, '..', 'backend', 'server.js');
  if (fs.existsSync(devPath)) return devPath;
  return null;
}

async function startBackend() {
  const entry = getBackendEntry();
  if (!entry) throw new Error('Backend files are missing from the application package.');

  const port = await getFreePort();
  backendProcess = spawn(process.execPath, [entry], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1', // run Electron's bundled Node, not a second app
      NODE_ENV: 'production',
      PORT: `${port}`,
      DATA_DIR: dataDir
    },
    stdio: 'inherit',
    windowsHide: true
  });
  backendProcess.on('exit', (code) => {
    console.log('Backend process exited with code', code);
    backendProcess = null;
    if (!quitting) {
      dialog.showErrorBox('Fortune Tiles', 'The local database service stopped unexpectedly. The application will close.');
      app.quit();
    }
  });

  return `http://127.0.0.1:${port}`;
}

async function createWindow() {
  if (!printerInitialized) {
    const useMock = process.env.PRINTER_MOCK === '1';
    printerService.initialize({
      mock: useMock,
      mockOutputPath: path.join(dataDir, 'mock-receipts')
    });
    printerInitialized = true;
    console.log('[Main] Printer service initialized. Status:', printerService.getStatus().status);
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'logo.png'),
    show: false
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  createMenu();

  // Never leave the local app: block navigation and pop-ups to anything else.
  let appOrigin = null;
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (appOrigin && new URL(url).origin !== appOrigin) event.preventDefault();
  });

  try {
    const base = await startBackend();
    appOrigin = new URL(base).origin;
    if (!(await waitForBackendReady(base))) {
      throw new Error('The local database service did not start. Check that the data folder is writable:\n' + dataDir);
    }
    mainWindow.loadURL(`${base}/inventory/`);
  } catch (err) {
    dialog.showErrorBox('Fortune Tiles failed to start', err.message);
    app.quit();
  }
}

function createTestWindow() {
  if (testWindow) {
    testWindow.focus();
    return;
  }

  testWindow = new BrowserWindow({
    width: 500,
    height: 700,
    parent: mainWindow,
    modal: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Printer Test'
  });

  testWindow.loadFile(path.join(__dirname, 'printer-test.html'));

  testWindow.on('closed', () => {
    testWindow = null;
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Backup Data',
          accelerator: 'CmdOrCtrl+B',
          click: async () => {
            await downloadBackup();
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.reload();
          }
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow.webContents.reloadIgnoringCache();
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Actual Size',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow.webContents.zoomLevel = 0;
          }
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            mainWindow.webContents.zoomLevel += 0.5;
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            mainWindow.webContents.zoomLevel -= 0.5;
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Fortune Tiles',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Fortune Tiles',
              message: 'Fortune Tiles Desktop',
              detail: `Offline Inventory Management System\nVersion ${app.getVersion()}`
            });
          }
        },
        {
          label: 'Open Data Folder',
          click: () => {
            shell.openPath(dataDir);
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function downloadBackup() {
  try {
    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Backup File',
      defaultPath: `fortune-tiles-backup-${new Date().toISOString().split('T')[0]}.json`,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      // Execute backup download via the web app
      mainWindow.webContents.executeJavaScript(`
        (async () => {
          try {
            const token = localStorage.getItem('token');
            if (!token) {
              alert('Please log in first to download backup');
              return;
            }
            
            const response = await fetch('/api/backup/export', {
              headers: {
                'Authorization': 'Bearer ' + token
              }
            });
            
            if (!response.ok) {
              throw new Error('Failed to download backup');
            }
            
            const data = await response.json();
            return JSON.stringify(data, null, 2);
          } catch (error) {
            alert('Backup failed: ' + error.message);
            return null;
          }
        })()
      `).then((backupData) => {
        if (backupData) {
          fs.writeFileSync(result.filePath, backupData);
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Backup Complete',
            message: 'Backup saved successfully!',
            detail: `File saved to: ${result.filePath}`
          });
        }
      }).catch((error) => {
        dialog.showErrorBox('Backup Error', `Failed to create backup: ${error.message}`);
      });
    }
  } catch (error) {
    dialog.showErrorBox('Backup Error', `Failed to create backup: ${error.message}`);
  }
}


// Only one instance may use the database at a time.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Allow camera access (product photos); deny everything else
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(permission === 'media');
    });
    createWindow();
  });
}

app.on('window-all-closed', () => {
  app.quit();
});

// IPC handlers for printer
ipcMain.handle('printer:getStatus', () => {
  return printerService.getStatus();
});

ipcMain.handle('printer:printTestPage', async () => {
  return printerService.printTestPage();
});

ipcMain.handle('printer:printReceipt', async (event, saleData) => {
  return printerService.printReceipt(saleData);
});

ipcMain.handle('printer:detect', () => {
  printerService.detectAndConnect();
  return printerService.getStatus();
});

ipcMain.handle('printer:updateConfig', (event, config) => {
  return printerService.updateConfig(config);
});


// Ensure the backend is terminated on quit
app.on('before-quit', () => {
  quitting = true;
  try {
    if (backendProcess && !backendProcess.killed) backendProcess.kill();
  } catch (_) {}
});
