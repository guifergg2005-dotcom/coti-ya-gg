const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');
function load(rel) {
  const code = esbuild.buildSync({entryPoints:[path.join(__dirname,'..',rel)],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
  const m=new Module(path.join(__dirname,'compiled.cjs'),module);m.paths=module.paths;m._compile(code,m.id);return m.exports;
}
const {createSyncEngine}=load('src/services/syncEngine.js');
const {FIELDS}=load('src/services/syncModel.js');
const {createDefaults}=load('src/services/defaultData.js');
const {hashPassword,verifyPassword}=load('src/utils/crypto.js');
function fixture(options={}) {
 const memory=options.memory || new Map(), calls=[];
 const storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
 let receive;
 const engine=createSyncEngine({username:options.username||'SERYVER-admin',defaults:createDefaults(),storage,delay:100000,
  subscribeRemote:(_u,cb)=>{receive=cb;return()=>{};},commit:options.commit|| (async(u,changes)=>calls.push({u,changes})),onError:()=>{}});
 engine.start();
 const hydrate=(overrides={})=>{const data={...createDefaults(),...overrides};for(const field of FIELDS)receive(field,data[field],false);};
 return {engine,memory,calls,hydrate,receive:(...args)=>receive(...args)};
}
test('waits for every server snapshot; cached or partial snapshots never trigger saving',async()=>{
 const f=fixture();for(const name of FIELDS.slice(0,-1))f.receive(name,createDefaults()[name],false);
 f.engine.set('workOrders',[{id:1}]);await f.engine.flush();assert.equal(f.calls.length,0);assert.equal(f.engine.getSnapshot().isReady,false);
 f.receive(FIELDS.at(-1),'',true);assert.equal(f.engine.getSnapshot().isReady,false);
 f.receive(FIELDS.at(-1),'',false);assert.equal(f.engine.getSnapshot().isReady,true);f.engine.stop();
});
test('work orders, reminders and clients without IDs persist locally and remotely',async()=>{
 const f=fixture();f.hydrate();f.engine.set('workOrders',[{id:1,name:'obra'}]);f.engine.set('reminders',[{id:2,name:'aviso'}]);f.engine.set('clients',[{nombre:'cliente'}]);
 const cached=JSON.parse(f.memory.values().next().value);assert.equal(Object.keys(cached.pending).length,3);
 await f.engine.flush();assert.deepEqual(new Set(f.calls[0].changes.map(c=>c.field)),new Set(['workOrders','reminders','clients']));
 assert.equal(f.engine.getSnapshot().saveStatus,'saved');assert.ok(f.engine.getSnapshot().data.clients[0].id);f.engine.stop();
});
test('deleting an existing numeric ID emits a delete and untouched remote records survive',async()=>{
 const f=fixture();f.hydrate({clients:[{id:7,nombre:'A'}]});
 f.engine.set('clients',[]);f.receive('clients',[{id:7,nombre:'A'},{id:8,nombre:'B'}],false);
 assert.deepEqual(f.engine.getSnapshot().data.clients,[{id:8,nombre:'B'}]);
 await f.engine.flush();assert.equal(f.calls[0].changes[0].id,'7');assert.equal(f.calls[0].changes[0].value,null);f.engine.stop();
});
test('edits to a new record retain null as their original cloud value',async()=>{
 const f=fixture();f.hydrate();f.engine.set('reminders',[{id:1,v:1}]);f.engine.set('reminders',[{id:1,v:2}]);await f.engine.flush();
 assert.equal(f.calls[0].changes[0].before,null);assert.equal(f.calls[0].changes[0].value.v,2);f.engine.stop();
});
test('in-flight save does not erase a newer edit, and writes are serialized',async()=>{
 let release;const calls=[];const f=fixture({commit:async(u,c)=>{calls.push(c);if(calls.length===1)await new Promise(r=>release=r);}});
 f.hydrate();f.engine.set('reminders',[{id:1,v:1}]);const saving=f.engine.flush();
 f.engine.set('reminders',[{id:1,v:2}]);await f.engine.flush();assert.equal(calls.length,1);release();await saving;await f.engine.flush();
 assert.equal(calls.length,2);assert.equal(calls[1][0].before.v,1);assert.equal(calls[1][0].value.v,2);f.engine.stop();
});
test('failed saves retain recoverable changes across restart and can be retried',async()=>{
 const memory=new Map();const f=fixture({memory,commit:async()=>{throw Error('permission-denied');}});f.hydrate();f.engine.set('workOrders',[{id:1}]);await f.engine.flush();
 assert.equal(f.engine.getSnapshot().saveStatus,'error');f.engine.stop();
 const recovered=fixture({memory});recovered.hydrate();assert.equal(recovered.engine.getSnapshot().data.workOrders.length,1);
 await recovered.engine.flush();assert.equal(recovered.calls.length,1);recovered.engine.stop();
});
test('account caches are isolated and corrupt JSON does not crash',()=>{
 const f=fixture();f.hydrate();f.engine.set('history',[{id:9}]);f.engine.stop();
 const g=fixture({memory:f.memory,username:'another'});assert.equal(g.engine.getSnapshot().data.history.length,0);g.engine.stop();
 const h=fixture({memory:new Map([['coti:v3:SERYVER-admin','invalid json']])});assert.equal(h.engine.getSnapshot().isReady,false);h.engine.stop();
});
test('React StrictMode stop/start resumes subscriptions',()=>{
 const f=fixture();f.engine.stop();f.engine.start();f.hydrate();assert.equal(f.engine.getSnapshot().isReady,true);f.engine.stop();
});
test('new config uses display defaults but compares against absent cloud value',async()=>{
 const f=fixture();f.hydrate({pdfConfig:null});f.engine.set('pdfConfig',old=>({...old,companyName:'Test'}));await f.engine.flush();
 assert.equal(f.calls[0].changes[0].before,null);assert.equal(f.calls[0].changes[0].value.companyName,'Test');f.engine.stop();
});
test('PBKDF2 verifies the requested admin password and rejects incorrect passwords',async()=>{
 const encoded=fs.readFileSync(path.join(__dirname,'../src/config/adminAccount.js'),'utf8').match(/ADMIN_PASSWORD_HASH = '([^']+)'/)[1];
 assert.equal(await verifyPassword('FamSeryver2026',encoded),true);assert.equal(await verifyPassword('incorrecta',encoded),false);
 assert.notEqual(await hashPassword('test'),await hashPassword('test'));
});
test('compiled application sources do not contain a cleartext admin password',()=>{
 for(const rel of ['src/config/adminAccount.js','src/components/LoginScreen.jsx','src/hooks/useAuth.js'])
 assert.equal(fs.readFileSync(path.join(__dirname,'..',rel),'utf8').includes('FamSeryver2026'),false);
});
test('quote registration is idempotent and new clients have IDs',()=>{
 const {useQuoteCart}=load('src/hooks/useQuoteCart.js');
 const data={currentQuote:{id:4,numero:'COT-2026-0007',cliente:{nombre:'Client'},sections:[],omitIgv:true},history:[{id:4,numero:'COT-2026-0007'}],clients:[],transactions:[],inventory:[],workOrders:[],defaultConditions:''};
 for(const k of ['history','clients','currentQuote'])data['set'+k[0].toUpperCase()+k.slice(1)]=v=>data[k]=typeof v==='function'?v(data[k]):v;
 const cart=useQuoteCart(data,()=>{},()=>{});cart.saveAndRegister();assert.equal(data.history.length,1);assert.ok(data.clients[0].id);
 cart.startNewQuote();assert.match(data.currentQuote.numero,new RegExp('^COT-'+new Date().getFullYear()+'-[A-Z0-9]+$'));const number=data.currentQuote.numero;cart.startNewQuote();assert.notEqual(data.currentQuote.numero,number);
});

