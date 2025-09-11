const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
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
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false
  });

  // Load the app - change this URL to your deployed Heroku app
  const appUrl = process.env.FORTUNE_TILES_URL || 'https://your-app-name.herokuapp.com';
  mainWindow.loadURL(appUrl);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();
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
              detail: 'Professional Inventory Management System\nVersion 1.0.0'
            });
          }
        },
        {
          label: 'Open Web Version',
          click: () => {
            const appUrl = process.env.FORTUNE_TILES_URL || 'https://your-app-name.herokuapp.com';
            shell.openExternal(appUrl);
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

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});
