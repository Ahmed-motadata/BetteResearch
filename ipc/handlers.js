require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const clipboardDB = require('../db/clipboard');
const { ipcMain, clipboard, shell } = require('electron');

ipcMain.handle('save-clipboard-item', async (event, { type, content, imageData }) => {
  try {
    const item = await clipboardDB.saveClipboardItem({ type, content, imageData });
    return { success: true, item };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-clipboard-items', async () => {
  try {
    const items = await clipboardDB.getClipboardItems();
    return { success: true, items };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-clipboard-item', async (event, id) => {
  try {
    await clipboardDB.deleteClipboardItem(id);
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
