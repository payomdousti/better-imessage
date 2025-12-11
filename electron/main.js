/**
 * Electron Main Process
 * 
 * This creates the native macOS application window and manages the app lifecycle.
 * The Express server runs directly in this process.
 */

'use strict';

const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep a global reference of the window object
let mainWindow = null;

// Server configuration
const PORT = 3000;
const SERVER_URL = `http://127.0.0.1:${PORT}`;

// Simple logger to userData path for packaged debugging
const logPath = path.join(app.getPath('userData'), 'imessage-search.log');
const log = (...args) => {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  try {
    fs.appendFileSync(logPath, line);
  } catch (_) {
    // ignore logging errors
  }
  console.log(...args);
};

/**
 * Start the Express server
 */
async function startServer() {
  // Set the PORT environment variable
  process.env.PORT = PORT.toString();
  
  // Use a unified path that works in dev and packaged (asar)
  const serverPath = path.join(__dirname, '..', 'server', 'index.js');
  log('Starting server from:', serverPath);
  
  // Require and start the server
  const server = require(serverPath);
  await server.start();
  
  log('Server started on', SERVER_URL);
}

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: '#111318',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    show: false
  });

  // Load the app
  mainWindow.loadURL(SERVER_URL);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Retry on load failure
  let retryCount = 0;
  mainWindow.webContents.on('did-fail-load', () => {
    if (retryCount < 10) {
      retryCount++;
      console.log(`Load failed, retrying (${retryCount}/10)...`);
      setTimeout(() => mainWindow.loadURL(SERVER_URL), 500);
    }
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Create the application menu
 */
function createMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// App ready
app.whenReady().then(async () => {
  log('iMessage Search starting...');
  log('Packaged:', app.isPackaged);
  
  createMenu();
  
  try {
    await startServer();
    createWindow();
  } catch (err) {
    log('Startup error:', err.message);
    dialog.showErrorBox(
      'Startup Error',
      `Failed to start: ${err.message}\n\nMake sure Full Disk Access is enabled.`
    );
    app.quit();
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
