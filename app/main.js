const { app, BrowserWindow, Tray, Menu, clipboard, shell, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Load DB connection early to ensure handlers have access
require('../db/index');

// Load IPC handlers (modularized)
require('../ipc/handlers');

// Disable hardware acceleration
app.disableHardwareAcceleration();

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;
let tray = null;

function getValidIcon(iconPath, size = 256) {
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    console.warn('Icon not loaded:', iconPath);
    return undefined;
  }
  // Resize if needed (Electron prefers 256x256 for app, 24x24 for tray)
  return icon.resize({ width: size, height: size });
}

const iconPath = path.join(process.cwd(), 'src/icon256bit.png');
const trayIconPath = path.join(process.cwd(), 'src/icon24bit.png');
const appIcon = getValidIcon(iconPath, 256);
const trayIcon = getValidIcon(trayIconPath, 24);

// Create the clipboard widget window
function createWindow() {
  // Get the screen size for positioning
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  mainWindow = new BrowserWindow({
    width: 350,
    height: 450,
    x: width - 380, // Position near the right edge
    y: 70,
    frame: false, // No standard window frame
    transparent: true, // Enable transparency
    backgroundColor: '#00000000', // Transparent background
    resizable: true, // Allow user to resize
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    skipTaskbar: false, // Show in taskbar for better discoverability
    alwaysOnTop: true, // Stay on top of other windows
    minWidth: 250,
    minHeight: 200,
    icon: appIcon,
  });
  
  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Uncomment to open DevTools for debugging
  // mainWindow.webContents.openDevTools({ mode: 'detach' });

  // Hide window when closed rather than quitting the app
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
  
  // Clean up reference when window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Handle window position/size saving
  mainWindow.on('moved', saveWindowBounds);
  mainWindow.on('resized', saveWindowBounds);
}

// Save window position and size
function saveWindowBounds() {
  if (mainWindow) {
    const bounds = mainWindow.getBounds();
    global.windowBounds = bounds;
  }
}

// Create system tray
function createTray() {
  if (!trayIcon || trayIcon.isEmpty()) {
    console.error('Tray icon not loaded or invalid:', trayIconPath);
    return;
  }
  tray = new Tray(trayIcon);

  // Create a context menu for the tray
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show Clipboard Widget', 
      click: () => {
        if (mainWindow === null) {
          createWindow();
        } else {
          mainWindow.show();
        }
      }
    },
    { 
      label: 'Hide Clipboard Widget', 
      click: () => {
        if (mainWindow !== null) {
          mainWindow.hide();
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Clipboard Widget');
  tray.setContextMenu(contextMenu);
  
  // Show window when tray icon is clicked
  tray.on('click', () => {
    if (mainWindow === null) {
      createWindow();
    } else if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}

// Create the window when the app is ready
app.whenReady().then(() => {
  // Set the app icon for Linux/Windows
  if (process.platform === 'linux' && app.setIcon && appIcon) {
    app.setIcon(appIcon);
  }
  // Set the app icon for macOS
  if (process.platform === 'darwin' && app.dock && app.dock.setIcon && appIcon) {
    app.dock.setIcon(appIcon);
  }
  createWindow();
  createTray();

  // Register global shortcut for toggling window visibility
  globalShortcut.register('Control+Shift+\\', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });

  globalShortcut.register('Control+Shift+=', () => {
    exec('xclip -o -selection primary', (err, stdout) => {
      if (!err && stdout.trim()) {
        if (mainWindow) {
          mainWindow.webContents.send('add-clipboard-item', stdout.trim());
          mainWindow.show();
        }
      }
    });
  });

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});