const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const fs=require('fs'),path=require('path');
const out='C:/Users/Guido/Documents/Codex/2026-09-30/c-users-guido-seryverapp-nube-final/work';
(async()=>{
 const profile=path.join(out,'test-profile-'+Date.now());
 const errors=[];
 const app=await electron.launch({args:['--user-data-dir='+profile,'.'],cwd:'D:/SeryverApp_Nube_Final',timeout:90000});
 try{
  const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
  await page.getByRole('heading',{name:'Iniciar Sesión'}).waitFor({timeout:30000});
  assert.equal(await page.evaluate(()=>typeof window.require),'undefined');
  const prefs=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());
  assert.equal(prefs.nodeIntegration,false);assert.equal(prefs.contextIsolation,true);assert.equal(prefs.sandbox,true);
  assert.equal(await page.getByText('Crear Cuenta Administrador').count(),0);
  await page.getByLabel('Usuario',{exact:true}).fill('otro-usuario');
  await page.getByLabel('Contraseña',{exact:true}).fill('incorrecta');
  await page.getByRole('button',{name:'Entrar al Sistema'}).click();
  await page.getByRole('alert').filter({hasText:'Usuario o contraseña incorrectos.'}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Iniciar Sesión'}).count(),1);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(out,'login-verificado.png')});
  console.log(JSON.stringify({passed:true,pageErrors:errors,security:{nodeIntegration:prefs.nodeIntegration,contextIsolation:prefs.contextIsolation,sandbox:prefs.sandbox}}));
 } finally {await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

