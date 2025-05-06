const { app, BrowserWindow, Tray, Menu, clipboard, shell, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
require('dotenv').config();

// Load IPC handlers (modularized)
require('./ipc/handlers');

// Disable hardware acceleration
app.disableHardwareAcceleration();

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;
let tray = null;
let aiChatWindow = null;

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

// Create the AI chat window
function createAIChatWindow() {
  if (aiChatWindow && !aiChatWindow.isDestroyed()) {
    aiChatWindow.focus();
    return;
  }
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  aiChatWindow = new BrowserWindow({
    width: 600,
    height: 380,
    x: width - 650, // Position near the right edge
    y: 150,
    resizable: true,
    minimizable: false,
    maximizable: false,
    frame: false, // Frameless, no titlebar
    alwaysOnTop: true, // Always on top
    skipTaskbar: false,
    transparent: true, // Make window transparent
    backgroundColor: '#00000000', // Transparent background
    title: 'Chat with AI',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'icon.png'),
  });
  aiChatWindow.loadFile(path.join(__dirname, 'app/ai_chat/ai_chat.html'));
  aiChatWindow.on('closed', () => {
    aiChatWindow = null;
  });
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

// Listen for toggle-ai-chat event from renderer
const { ipcMain } = require('electron');
ipcMain.on('toggle-ai-chat', () => {
  if (aiChatWindow && !aiChatWindow.isDestroyed()) {
    aiChatWindow.close();
  } else {
    createAIChatWindow();
  }
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