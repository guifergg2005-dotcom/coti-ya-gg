const { BrowserWindow, ipcMain, dialog, app } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { pathToFileURL } = require('url');
const busy = new Set();
async function createQuoteWindow(payload, parent) {
  const { renderQuoteDocument } = await import(pathToFileURL(path.join(__dirname, 'quoteDocument.mjs')).href);
  const document = renderQuoteDocument(payload);
  const win = new BrowserWindow({ show: false, parent, width: 1000, height: 1000,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, devTools: false, partition: 'quote-print', backgroundThrottling: false } });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event,url) => { if (!url.startsWith('data:text/html')) event.preventDefault(); });
  win.webContents.session.setPermissionRequestHandler((_w,_p,callback)=>callback(false));
  win.webContents.session.setPermissionCheckHandler(()=>false);
  win.webContents.session.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','file://*/*']},(details,callback)=>callback({cancel:/^(https?|file):/.test(details.url)}));
  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(document.html));
    await win.webContents.executeJavaScript(`Promise.race([Promise.all([document.fonts.ready, ...[...document.images].map(image => image.decode().catch(() => {}))]), new Promise(resolve=>setTimeout(resolve,5000))])`);
    return { win, ...document };
  } catch (error) { win.destroy(); throw error; }
}
function registerPrinting(entry) {
  for (const mode of ['print', 'pdf']) ipcMain.handle('quote:' + mode, async(event,payload)=>{
    if (event.senderFrame !== event.sender.mainFrame || event.senderFrame.url !== entry) throw new Error('Origen de impresión no autorizado.');
    if (busy.has(event.sender.id)) throw new Error('Ya hay una impresión en curso.');
    const id=event.sender.id, parent=BrowserWindow.fromWebContents(event.sender);
    busy.add(id);let document;
    try {
      document=await createQuoteWindow(payload,parent);
      if(mode==='pdf') {
        const target=await dialog.showSaveDialog(parent,{title:'Guardar cotización como PDF',defaultPath:path.join(app.getPath('documents'),document.title+'.pdf'),filters:[{name:'Documento PDF',extensions:['pdf']}]});
        if(target.canceled || !target.filePath) return {canceled:true};
        const bytes=await document.win.webContents.printToPDF({pageSize:document.paper.native,preferCSSPageSize:true,printBackground:true,generateTaggedPDF:true});
        await fs.writeFile(target.filePath,bytes);
        return {canceled:false,saved:true};
      }
      return await new Promise((resolve,reject)=>document.win.webContents.print({silent:false,printBackground:true,pageSize:document.paper.native},(success,reason)=>{
        if(success)resolve({canceled:false,printed:true});
        else if(/cancel/i.test(reason||''))resolve({canceled:true});
        else reject(new Error(reason || 'La impresora no pudo completar el trabajo.'));
      }));
    } finally { if(document && !document.win.isDestroyed())document.win.destroy();busy.delete(id); }
  });
}
module.exports={registerPrinting,createQuoteWindow};
