const { test } = require('node:test'), assert = require('node:assert/strict'), Module = require('node:module'), path = require('node:path');
const esbuild = require('esbuild'), catalog = require('../catalog/seryver-2026.json');
function load(rel) {
 const code = esbuild.buildSync({entryPoints:[path.join(__dirname,'..',rel)],bundle:true,platform:'node',format:'cjs',write:false,external:['react','react-dom']}).outputFiles[0].text;
 const m = new Module(path.join(__dirname,'compiled-catalog.cjs'),module);m.paths=module.paths;m._compile(code,m.id);return m.exports;
}
const utils = load('src/utils/catalog.js'), {useQuoteCart} = load('src/hooks/useQuoteCart.js'), {createDefaults}=load('src/services/defaultData.js'), {FIELDS}=load('src/services/syncModel.js');
const clone = v => JSON.parse(JSON.stringify(v));
function fixture() {
 const data=createDefaults(),messages=[];
 data.inventory=[{id:'panel',nombre:'PANEL INTERNO',unidad:'M2',costo:186.2,precio:186.2,stock:50,categoria:'Materiales'},{id:'service',nombre:'TÉCNICO INTERNO',unidad:'SRV',costo:100,precio:100,stock:999,categoria:'Servicios'}];
 for(const key of FIELDS)data['set'+key[0].toUpperCase()+key.slice(1)]=v=>data[key]=typeof v==='function'?v(data[key]):v;
 const api=()=>useQuoteCart(data,()=>{},m=>messages.push(m));api().startNewQuote();data.currentQuote.cliente={nombre:'PRUEBA'};
 const combo={id:'combo',nombre:'Paquete comercial',descripcion:'Descripción comercial',categoria:'Combo',unidad:'CMB',precio:3500,notasInternas:'NOTA PRIVADA',componentes:[{productId:'panel',cantidad:15.4,costo:186.2},{productId:'service',cantidad:1,costo:100}]};
 data.inventory.push(combo);return {data,api,combo,messages};
}
test('PDF catalog contains 56 source materials/services and seven editable nonrecursive combos',()=>{
 assert.equal(catalog.filter(p=>p.categoria!=='Combo').length,56);assert.equal(catalog.filter(utils.isCombo).length,7);assert.equal(new Set(catalog.map(p=>p.id)).size,63);
 for(const p of catalog){assert.ok(p.costo>=0&&p.precio>=0);if(utils.isCombo(p))for(const r of p.componentes)assert.ok(catalog.some(m=>m.id===r.productId&&!utils.isCombo(m)));}
 const food=catalog.find(p=>p.codigoCatalogo==='alimentacion');assert.equal(food.costo*6,180);
 assert.equal(utils.componentCost([{cantidad:15.4,costo:186.2}]),2867.48);
});
test('combo validation rejects incomplete, missing, nested and duplicate materials',()=>{
 const f=fixture();
 for(const rows of [[],[{productId:'panel',cantidad:0}],[{productId:'missing',cantidad:1}],[{productId:'combo',cantidad:1}],[{productId:'panel',cantidad:1},{productId:'panel',cantidad:2}]]) assert.throws(()=>utils.configuredCombo({...f.combo,componentes:rows},f.data.inventory));
 for(const value of [-1,Infinity,NaN])assert.throws(()=>utils.configuredCombo({...f.combo,precio:value},f.data.inventory));
});
test('accepting two combos and a direct item deducts each material once and leaves services unchanged',()=>{
 const f=fixture(),section=f.data.currentQuote.sections[0].id;
 assert.equal(f.api().addItemToSection(utils.configuredCombo(f.combo,f.data.inventory),section),true);
 const uid=f.data.currentQuote.sections[0].items[0].uid;f.api().updateItemInSection(section,uid,'cantidad',2);
 f.api().addItemToSection(f.data.inventory[0],section);f.api().saveAndRegister();const id=f.data.currentQuote.id;
 assert.equal(f.api().changeQuoteStatus(id,'Aceptada'),true);
 assert.equal(f.data.inventory[0].stock,18.2);assert.equal(f.data.inventory[1].stock,999);assert.equal(f.data.transactions.length,1);
 assert.equal(f.api().changeQuoteStatus(id,'Aceptada'),true);assert.equal(f.data.inventory[0].stock,18.2);
});
test('saved combo recipe and cost survive later template edits',()=>{
 const f=fixture(),section=f.data.currentQuote.sections[0].id;
 f.api().addItemToSection(utils.configuredCombo(f.combo,f.data.inventory),section);f.api().saveAndRegister();const id=f.data.currentQuote.id,saved=clone(f.data.history[0]);
 f.data.inventory[2]={...f.combo,componentes:[{productId:'panel',cantidad:99,costo:999}]};f.data.inventory[0].costo=999;
 assert.deepEqual(f.data.history[0],saved);assert.equal(f.api().changeQuoteStatus(id,'Aceptada'),true);assert.equal(f.data.inventory[0].stock,34.6);
});
test('deleting a component preserves old proposal but blocks accepting missing inventory',()=>{
 const f=fixture(),section=f.data.currentQuote.sections[0].id;f.api().addItemToSection(utils.configuredCombo(f.combo,f.data.inventory),section);f.api().saveAndRegister();const id=f.data.currentQuote.id;
 f.data.inventory=f.data.inventory.filter(p=>p.id!=='panel');assert.equal(f.api().changeQuoteStatus(id,'Aceptada'),false);assert.equal(f.data.transactions.length,0);assert.equal(f.data.workOrders.length,0);assert.equal(f.data.history[0].sections[0].items[0].componentes.length,2);
});
test('insufficient combo component stock aborts all financial and inventory changes',()=>{
 const f=fixture(),section=f.data.currentQuote.sections[0].id;f.data.inventory[0].stock=1;f.api().addItemToSection(utils.configuredCombo(f.combo,f.data.inventory),section);f.api().saveAndRegister();assert.equal(f.api().changeQuoteStatus(f.data.currentQuote.id,'Aceptada'),false);assert.equal(f.data.inventory[0].stock,1);assert.equal(f.data.transactions.length,0);
});
test('quote-specific combo edits recalculate total without changing template',()=>{
 const f=fixture(),section=f.data.currentQuote.sections[0].id;f.api().addItemToSection(utils.configuredCombo(f.combo,f.data.inventory),section);const uid=f.data.currentQuote.sections[0].items[0].uid;
 f.api().updateItemInSection(section,uid,'cantidad',2);
 assert.equal(f.api().updateItemInSection(section,uid,'comboConfig',{...f.combo,precio:4000}),true);assert.equal(f.data.currentQuote.sections[0].items[0].total,8000);assert.equal(f.data.inventory[2].precio,3500);
 assert.equal(f.api().updateItemInSection(section,uid,'comboConfig',{...f.combo,componentes:[]}),false);assert.equal(f.data.currentQuote.sections[0].items[0].total,8000);
});
test('customer document contains commercial combo only, never bill of materials, cost or internal notes',()=>{
 const f=fixture(),section=f.data.currentQuote.sections[0].id;f.api().addItemToSection(utils.configuredCombo(f.combo,f.data.inventory),section);
 const {renderQuoteDocument}=load('electron/quoteDocument.mjs'),html=renderQuoteDocument({quote:f.data.currentQuote}).html;
 assert.match(html,/Paquete comercial/);for(const secret of ['PANEL INTERNO','TÉCNICO INTERNO','NOTA PRIVADA','2867.48'])assert.ok(!html.includes(secret));
});
test('a missing destination cannot silently discard an added item',()=>{
 const f=fixture();assert.equal(f.api().addItemToSection(f.data.inventory[0],'missing'),false);assert.equal(f.data.currentQuote.sections[0].items.length,0);
});
