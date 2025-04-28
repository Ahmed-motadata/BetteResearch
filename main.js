const { app, BrowserWindow, ipcMain, Tray, Menu, clipboard, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;
let tray = null;

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
    minHeight: 200
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
  try {
    // Try to create a basic tray icon using a data URL if the image file doesn't exist
    let iconPath = path.join(__dirname, 'clipboard-icon.png');
    
    // Check if the icon file exists
    if (!fs.existsSync(iconPath)) {
      // Create a simple tray icon as fallback
      const image = nativeImage.createFromDataURL(`
        data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAA
        pElEQVR42mNgGAVDCvynApYH4v1A/B+KDwCxAiXmygPxfyj+D8RvgXg+EG8A4v9Q9iYgliPXcAYoZzMSewPUcQ+QxLdA+eBItIOh
        g4G4AWpJA1TMkFyLNwPxZyB2HIClGlB9/4H4HRArUJKCD0A1a1HK4QEgPgvVfBeIzYDYAYgvQ+W+A/FcauSDE0DsALXsMZT9E4jN
        qZnZBnSBGgWjYOgDAJXwMBz+3AI8AAAAAElFTkSuQmCC
      `);
      tray = new Tray(image);
    } else {
      // Use the actual icon file if it exists
      tray = new Tray(iconPath);
    }
    
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
  } catch (error) {
    console.error('Failed to create tray:', error);
    // Continue without tray in case of error
  }
}

// Create the window when the app is ready
app.whenReady().then(() => {
  createWindow();
  createTray();
  
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