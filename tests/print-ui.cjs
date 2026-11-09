const {app,BrowserWindow,dialog}=require('electron'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {pathToFileURL}=require('url'),esbuild=require('esbuild');
const work='C:/Users/Guido/Documents/Codex/2026-09-30/c-users-guido-seryverapp-nube-final/work';
const root='D:/SeryverApp_Nube_Final';const modules=process.argv.includes('--packaged-content')?root+'/dist_installer/win-unpacked/resources/app.asar':root;
app.setPath('userData',path.join(work,'print-ui-profile-'+Date.now()));app.on('window-all-closed',()=>{});
const source=fs.readFileSync(__dirname+'/print-runtime.cjs','utf8');const data=new Function(source.slice(source.indexOf('const quote='),source.indexOf('const deadline='))+'return {quote,config};')();
esbuild.buildSync({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import PDFPreview from './src/components/PDFPreview.jsx';const data="+JSON.stringify(data)+";createRoot(document.getElementById('root')).render(<PDFPreview quote={data.quote} pdfConfig={data.config} setQuote={()=>{}} setPdfConfig={()=>{}} setDefaultConditions={()=>{}} onBack={()=>{}} onSave={()=>{}}/>);",resolveDir:root,loader:'jsx'},bundle:true,platform:'browser',define:{'process.env.NODE_ENV':'"production"'},outfile:path.join(work,'print-ui.js')});
const css=fs.readdirSync(root+'/dist/assets').find(f=>f.endsWith('.css'));
const csp=fs.readFileSync(root+'/index.html','utf8').match(/<meta http-equiv="Content-Security-Policy"[^>]+>/)[0];
const html='<html><head>'+csp+'<meta charset="utf-8"><link rel="stylesheet" href="'+pathToFileURL(root+'/dist/assets/'+css).href+'"></head><body><div id="root"></div><script src="./print-ui.js"></script></body></html>';fs.writeFileSync(path.join(work,'print-ui.html'),html);
let target=path.join(work,'quote-ui-export.pdf'),canceled=true;
dialog.showSaveDialog=async()=>canceled?{canceled:true}:{canceled:false,filePath:target};
let win;const timeout=setTimeout(()=>finish({passed:false,error:'UI timeout'}),90000);
function finish(result){clearTimeout(timeout);fs.writeFileSync(path.join(work,'print-ui-result.json'),JSON.stringify(result,null,2));app.exit(result.passed?0:1);}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{try{
 const entry=pathToFileURL(path.join(work,'print-ui.html')).href;require(modules+'/electron/printing.cjs').registerPrinting(entry);
 win=new BrowserWindow({show:false,width:1250,height:950,webPreferences:{preload:path.join(modules,'electron/preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
 await win.loadURL(entry);const js=s=>win.webContents.executeJavaScript(s);
 for(let i=0;i<100;i++){if(await js('!!document.querySelector("iframe")?.contentDocument?.querySelector("table")'))break;await sleep(100);}
 const preview=await js('document.querySelector("iframe").contentDocument.body.innerText');
 assert.equal(preview.split('Motor para puerta automática').length-1,1);assert.equal(preview.split('Servicio técnico').length-1,1);
 const click=()=>js('[...document.querySelectorAll("button")].find(b=>b.textContent==="Guardar PDF").click()');
 await click();await sleep(500);assert.equal(await js('[...document.querySelectorAll("button")].find(b=>b.textContent==="Guardar PDF").disabled'),false);
 canceled=false;await click();for(let i=0;i<150;i++){if(await js('document.body.innerText.includes("PDF guardado con texto seleccionable.")'))break;await sleep(100);}
 assert.equal(await js('document.body.innerText.includes("PDF guardado con texto seleccionable.")'),true);assert.ok(fs.statSync(target).size>10000);
 win.showInactive();await sleep(500);try{const png=await win.webContents.capturePage();fs.writeFileSync(path.join(work,'print-ui.png'),png.toPNG());}catch{}
 finish({passed:true,cancelHandled:true,previewUniqueRows:true,bridgeExport:true,bytes:fs.statSync(target).size});
}catch(e){finish({passed:false,error:e.stack});}});
