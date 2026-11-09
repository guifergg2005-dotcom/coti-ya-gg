const {app}=require('electron');const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const work='C:/Users/Guido/Documents/Codex/2026-09-30/c-users-guido-seryverapp-nube-final/work';
app.setPath('userData',path.join(work,'native-test-profile-'+Date.now()));app.commandLine.appendSwitch('disable-renderer-backgrounding');
const errors=[],trace=[];let completed=false;
const log=x=>{trace.push(x);fs.writeFileSync(path.join(work,'electron-runtime-trace.json'),JSON.stringify(trace,null,2));};
function done(result){if(completed)return;completed=true;fs.writeFileSync(path.join(work,'electron-runtime-result.json'),JSON.stringify({...result,errors,trace},null,2));app.exit(result.passed?0:1);}
setTimeout(()=>done({passed:false,error:'Application startup timeout'}),120000);
app.on('browser-window-created',(_event,win)=>{
 win.webContents.setBackgroundThrottling(false);win.hide();
 const js=source=>win.webContents.executeJavaScript(source);
 const waitFor=async(source,ms=45000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await js(source))return;await new Promise(r=>setTimeout(r,200));}throw Error('UI condition timed out: '+source+'; '+await js('document.body.innerText.slice(0,600)'));};
 win.webContents.on('render-process-gone',(_e,d)=>errors.push(d.reason));win.webContents.on('did-fail-load',(_e,code,description)=>errors.push({code,description}));
 win.webContents.once('did-finish-load',async()=>{try{
  log('loaded');const p=win.webContents.getLastWebPreferences();assert.equal(p.nodeIntegration,false);assert.equal(p.contextIsolation,true);assert.equal(p.sandbox,true);assert.equal(await js('typeof window.require'),'undefined');
  await waitFor('!!document.querySelector("input[autocomplete=username]")');log('login visible');
  assert.equal(await js('!!document.querySelector("meta[http-equiv=Content-Security-Policy]")'),true);
  const submit=async(user,password)=>js(`(()=>{const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;for(const [selector,value] of ${JSON.stringify([['input[autocomplete=username]',user],['input[type=password]',password]])}){const el=document.querySelector(selector);set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));}document.querySelector('form').requestSubmit();})()`);
  await submit('invalid-user','incorrect');await waitFor('document.querySelector("[role=alert]")?.innerText.includes("incorrectos")');log('invalid credentials rejected');
  await submit('SERYVER-admin','FamSeryver2026');await waitFor('document.body.innerText.includes("Sincronizado")',60000);log('administrator authenticated and cloud data loaded');
  for(const label of ['Reportes','Caja','Obras','Alertas','Inventario','Usuarios','Ventas']){
   await js(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()===${JSON.stringify(label)});if(!b)throw Error('Missing navigation');b.click();})()`);await new Promise(r=>setTimeout(r,300));assert.equal(await js('!!document.querySelector("nav")'),true);log('view '+label);
  }
  await js(`document.querySelector('button[title="Cerrar Sesión"]').click()`);await waitFor('!!document.querySelector("input[autocomplete=username]")');log('logout successful');
  let screenshot;try{win.showInactive();await new Promise(r=>setTimeout(r,600));const png=await win.webContents.capturePage();fs.writeFileSync(path.join(work,'login-verificado.png'),png.toPNG());screenshot=true;}catch(e){screenshot=e.message;}
  assert.deepEqual(errors,[]);done({passed:true,screenshot,security:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 }catch(e){done({passed:false,error:e.message});}});
});
require(process.argv.includes('--packaged-content') ? 'D:/SeryverApp_Nube_Final/dist_installer/win-unpacked/resources/app.asar/electron/main.js' : 'D:/SeryverApp_Nube_Final/electron/main.js');
