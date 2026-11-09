const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Coti YA G&G",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.setMenuBarVisibility(false); // Oculta el menú superior feo
  win.loadFile(path.join(__dirname, 'dist/index.html'));
}
app.whenReady().then(createWindow);