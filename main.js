const { app, BrowserWindow, ipcMain, Tray, Menu, clipboard, shell, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Disable hardware acceleration
app.disableHardwareAcceleration();

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;
let tray = null;

// Create the clipboard widget window
function createWindow() {
  // Get the screen size for positioning
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  const iconPath = path.join(__dirname, 'icon.png');
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
    icon: iconPath,
  });
  
  // Load the index.html file
  mainWindow.loadFile('index.html');
  
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
  const iconPath = path.join(__dirname, 'icon.png');
  tray = new Tray(nativeImage.createFromPath(iconPath));

  // Create a context menu for the tray
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show BetteResearch', 
      click: () => {
        if (mainWindow === null) {
          createWindow();
        } else {
          mainWindow.show();
        }
      }
    },
    { 
      label: 'Hide BetteResearch', 
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
  
  tray.setToolTip('BetteResearch');
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
  const iconPath = path.join(__dirname, 'icon.png');
  if (process.platform === 'linux' && app.setIcon) {
    app.setIcon(iconPath);
  }
  // Set the app icon for macOS
  if (process.platform === 'darwin' && app.dock && app.dock.setIcon) {
    app.dock.setIcon(iconPath);
  }
  createWindow();
  createTray();
  
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

// Handle IPC messages from the renderer process
ipcMain.on('hide-window', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('copy-to-clipboard', (event, text) => {
  clipboard.writeText(text);
});

// Add handler for opening URLs in default browser
ipcMain.on('open-url', (event, url) => {
  shell.openExternal(url).catch(err => {
    console.error('Failed to open URL:', err);
  });
});