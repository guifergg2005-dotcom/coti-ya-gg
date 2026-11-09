const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');
const { registerPrinting } = require('./printing.cjs');
const { pathToFileURL } = require('url');
const entry = pathToFileURL(path.join(__dirname, '../dist/index.html')).href;
const trustedExternal = url => {
  try { const parsed = new URL(url); return parsed.protocol === 'https:' && ['api.whatsapp.com', 'wa.me'].includes(parsed.hostname); }
  catch { return false; }
};
function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 1024, minHeight: 768,
    icon: path.join(__dirname, '../public/favicon.ico'), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, devTools: !app.isPackaged }
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (trustedExternal(url)) shell.openExternal(url).catch(console.error);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => { if (url !== entry) event.preventDefault(); });
  win.webContents.on('will-attach-webview', event => event.preventDefault());
  win.loadFile(path.join(__dirname, '../dist/index.html')).catch(console.error);
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { const win = BrowserWindow.getAllWindows()[0]; if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    registerPrinting(entry);
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    createWindow();
    app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
