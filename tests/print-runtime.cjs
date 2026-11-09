const {app}=require('electron'),fs=require('fs'),path=require('path');
const work='C:/Users/Guido/Documents/Codex/2026-09-30/c-users-guido-seryverapp-nube-final/work';
app.setPath('userData',path.join(work,'print-test-profile-'+Date.now()));
app.on('window-all-closed',()=>{});
app.commandLine.appendSwitch('disable-renderer-backgrounding');
const {createQuoteWindow}=require('../electron/printing.cjs');
const quote={numero:'COT-DEMO-0001',fecha:'2026-10-02',cliente:{nombre:'Cliente de demostración',ruc:'00000000000',direccion:'Av. Ejemplo 123',contacto:'Área de compras'},ganancia:0,omitIgv:false,moneda:'S/',observaciones:'Forma de pago: 50% al aprobar la propuesta y 50% al entregar.\nVigencia de la oferta: 15 días.\nGarantía: 12 meses, conforme a las condiciones acordadas.',sections:[{id:1,name:'Equipos y materiales',visible:true,items:[{id:1,nombre:'Motor para puerta automática',descripcion:'Equipo de demostración con accesorios de montaje. Texto nítido incluso al ampliar.',cantidad:2,unidad:'UND',total:1800},{id:2,nombre:'Control remoto',descripcion:'Transmisor de dos canales.',cantidad:4,unidad:'UND',total:200}]},{id:2,name:'Instalación y puesta en marcha',visible:true,items:[{id:3,nombre:'Servicio técnico',descripcion:'Instalación, configuración y pruebas de funcionamiento.',cantidad:1,unidad:'SERV',total:600}]},{id:3,name:'Sección oculta',visible:false,items:[{nombre:'NO_IMPRIMIR',cantidad:1,total:999999}]}]};
const config={companyName:'SERYVER G&G S.A.C.',companySubtitle:'Seguridad y automatización',companyRuc:'20614510421',color:'#1e3a8a',tableStyle:'bordered',accounts:[{banco:'Banco de demostración',moneda:'Soles',numero:'000-0000000',cci:'00000000000000000000'}]};
const deadline=setTimeout(()=>{fs.writeFileSync(path.join(work,'print-test-result.json'),JSON.stringify({passed:false,error:'PDF test timeout'}));app.exit(1)},120000);
app.whenReady().then(async()=>{const results=[];try{
 for(const [name,paper,long] of [['sample','A4',false],['multi','A4',true],['letter','Carta',false],['legal','Oficio',false]]){
  const q=structuredClone(quote),c={...config,pageSize:paper};
  if(long){q.sections[0].items=Array.from({length:55},(_,i)=>({id:i+10,nombre:'PRODUCTO-'+String(i+1).padStart(3,'0'),descripcion:'Descripción detallada de demostración: suministro, instalación y comprobación del equipo. '+('Especificación técnica. '.repeat(i%4)),cantidad:i===0?0:i+1,unidad:'UND',total:100}));q.observaciones=Array.from({length:30},(_,i)=>'CONDICION-'+String(i+1).padStart(3,'0')+': '+('El servicio se realizará según las condiciones pactadas y los plazos de entrega establecidos. '.repeat(3))).join('\n\n');c.watermark='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aYc8AAAAASUVORK5CYII=';c.watermarkOpacity=0.1;}
  const document=await createQuoteWindow({quote:q,pdfConfig:c});
  try{const bytes=await document.win.webContents.printToPDF({pageSize:document.paper.native,preferCSSPageSize:true,printBackground:true,generateTaggedPDF:true});const target=path.join(work,'quote-'+name+'.pdf');fs.writeFileSync(target,bytes);results.push({name,paper,path:target,bytes:bytes.length});}finally{document.win.destroy();}
 }
 clearTimeout(deadline);fs.writeFileSync(path.join(work,'print-test-result.json'),JSON.stringify({passed:true,results},null,2));app.exit(0);
}catch(e){clearTimeout(deadline);fs.writeFileSync(path.join(work,'print-test-result.json'),JSON.stringify({passed:false,error:e.stack},null,2));app.exit(1);}});
