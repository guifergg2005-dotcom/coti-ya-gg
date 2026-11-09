const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const esbuild=require('esbuild');
function compile(source,context={}){const code=esbuild.transformSync(source,{format:'cjs'}).code;const module={exports:{}};new Function(...Object.keys(context),'module','exports',code)(...Object.values(context),module,module.exports);return module.exports;}
const model=compile(fs.readFileSync(__dirname+'/../src/services/syncModel.js','utf8'));
function fixture(initial={}){
 const docs=new Map(Object.entries(initial)),events=[];
 const mock={doc:(...parts)=>parts.filter(p=>p!==db).join('/'),collection:(...parts)=>parts.join('/'),onSnapshot:()=>{},runTransaction:async(_db,fn)=>{
  const changes=[];let writing=false;
  await fn({get:async ref=>{assert.equal(writing,false,'all reads precede writes');events.push(['get',ref]);return{exists:()=>docs.has(ref),data:()=>docs.get(ref),id:ref.split('/').at(-1)};},set:(ref,value,options)=>{writing=true;changes.push(['set',ref,value,options]);},delete:ref=>{writing=true;changes.push(['delete',ref]);}});
  for(const [kind,ref,value,options] of changes){events.push([kind,ref]);if(kind==='delete')docs.delete(ref);else docs.set(ref,options?.merge?{...docs.get(ref),...value}:value);}
 }};const db={};
 let source=fs.readFileSync(__dirname+'/../src/services/syncService.js','utf8').replace(/import[^;]+from 'firebase\/firestore';/,"const {doc,collection,onSnapshot,runTransaction}=mock;").replace(/import[^;]+from '\.\.\/firebase';/,'').replace(/import[^;]+from '\.\/syncModel';/,'const {COLLECTIONS,CONFIG_FIELDS,equal}=model;');
 return{...compile(source,{mock,db,model}),docs,events};
}
const root='user_data/SERYVER-admin';
test('transaction writes work orders and reminders, merges config and deletes a specific record',async()=>{
 const old={id:5,nombre:'A'};const f=fixture({[root]:{pdfConfig:{name:'x'},retained:42},[root+'/clients/5']:old,[root+'/clients/6']:{id:6}});
 await f.saveToFirebase('SERYVER-admin',[{field:'workOrders',id:'w1',before:null,value:{id:'w1'}},{field:'reminders',id:'r1',before:null,value:{id:'r1'}},{field:'clients',id:'5',before:old,value:null},{field:'defaultConditions',id:null,before:'',value:'Conditions'}]);
 assert.equal(f.docs.has(root+'/clients/5'),false);assert.equal(f.docs.has(root+'/clients/6'),true);assert.equal(f.docs.get(root).retained,42);assert.equal(f.docs.get(root).defaultConditions,'Conditions');assert.equal(f.docs.has(root+'/work_orders/w1'),true);assert.equal(f.docs.has(root+'/reminders/r1'),true);
});
test('conflicting remote changes abort the whole transaction and preserve business records',async()=>{
 const f=fixture({[root+'/clients/a']:{id:'a',name:'remote'}});
 await assert.rejects(f.saveToFirebase('SERYVER-admin',[{field:'reminders',id:'new',before:null,value:{id:'new'}},{field:'clients',id:'a',before:{id:'a',name:'old'},value:{id:'a',name:'local'}}]),/Conflicto/);
 assert.equal(f.docs.has(root+'/reminders/new'),false);assert.equal(f.docs.get(root+'/clients/a').name,'remote');
});
test('already committed changes are safe to retry after loss of acknowledgment',async()=>{
 const value={id:1,name:'done'};const f=fixture({[root+'/history/1']:value});await f.saveToFirebase('SERYVER-admin',[{field:'history',id:'1',before:null,value}]);assert.deepEqual(f.docs.get(root+'/history/1'),value);
});
