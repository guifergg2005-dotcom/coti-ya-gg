const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('cotiDocuments', Object.freeze({
  printQuote: payload => ipcRenderer.invoke('quote:print', payload),
  saveQuotePdf: payload => ipcRenderer.invoke('quote:pdf', payload)
}));
