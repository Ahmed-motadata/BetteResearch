require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const clipboardDB = require('../db/clipboard');
const collectionsDB = require('../db/collections');
const { ipcMain, clipboard, shell } = require('electron');

ipcMain.handle('save-clipboard-item', async (event, { type, content, imageData, collectionName }) => {
  try {
    // Fallback to '2ndCollection' if no collectionName is provided
    const effectiveCollection = collectionName || '2ndCollection';
    const item = await clipboardDB.saveClipboardItem({ type, content, imageData, collectionName: effectiveCollection });
    return { success: true, item };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-clipboard-items', async (event, collectionName) => {
  try {
    const items = await clipboardDB.getClipboardItems(collectionName);
    return { success: true, items };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-clipboard-item', async (event, id, collectionName) => {
  try {
    await clipboardDB.deleteClipboardItem(id, collectionName);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-collections', async () => {
  try {
    const collections = await collectionsDB.getCollections();
    return { success: true, collections };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
ipcMain.handle('create-collection', async (event, name) => {
  try {
    await collectionsDB.createCollection(name);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
ipcMain.handle('delete-collection', async (event, name) => {
  try {
    await collectionsDB.deleteCollection(name);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.on('hide-window', (event) => {
  const win = event.sender.getOwnerBrowserWindow();
  if (win) win.hide();
});
ipcMain.on('minimize-window', (event) => {
  const win = event.sender.getOwnerBrowserWindow();
  if (win) win.minimize();
});
ipcMain.on('copy-to-clipboard', (event, text) => {
  clipboard.writeText(text);
});
ipcMain.on('open-url', (event, url) => {
  shell.openExternal(url).catch(err => {
    console.error('Failed to open URL:', err);
  });
});
