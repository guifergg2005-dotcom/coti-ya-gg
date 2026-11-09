import React from 'react';
import { ArrowLeft, Printer, MessageCircle } from 'lucide-react';
import { whatsappUrl } from '../utils/business';
const NativePrinter = null;

export default function WarrantyPDF({ wo, onBack, pdfConfig }) {
  const companyName = pdfConfig?.companyName || 'SERYVER G&G S.A.C';
  const companyRuc = pdfConfig?.companyRuc || '20614510421';
  const getLocalDateString = () => {
    const d = new Date();
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  };

  const handlePrint = async () => {
    const docName = `Garantia_${wo.quoteNumber}`;
    const np = window.NativePrinter || NativePrinter;
    if (np && np.printWebView) {
      try {
        await np.printWebView({ name: docName });
      } catch (e) {
        window.alert("No se pudo abrir la impresión: " + e.message);
      }
    } else {
      window.print();
    }
  };

  const handleWhatsApp = () => {
    const mensaje = `Hola, somos de *${companyName}*. \n\nQueremos agradecerte por confiar en nosotros para tu instalación (${wo.quoteNumber}). \n\nTu servicio cuenta con *1 AÑO DE GARANTÍA*. \nPor favor, guarda el documento PDF adjunto. \n\n¡Estaremos en contacto para tus mantenimientos preventivos!`;
    window.open(whatsappUrl(mensaje), '_blank');
  };

  return (
    <div className="bg-gray-200 min-h-screen p-4 print:p-0 print:bg-white flex flex-col items-center print:block print:min-h-0">
      {/* Barra superior no imprimible */}
      <div className="w-full max-w-4xl flex justify-between items-center bg-white p-3 rounded-xl shadow mb-4 print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium">
          <ArrowLeft size={18} /> Volver a la Obra
        </button>
        <div className="flex gap-3">
          <button onClick={handleWhatsApp} className="flex items-center gap-2 bg-green-500 text-white px-5 py-2 rounded-lg font-bold shadow-md hover:bg-green-600 transition-colors">
            <MessageCircle size={18} /> Texto WhatsApp
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2 rounded-lg font-bold shadow-md hover:bg-slate-900 transition-colors">
            <Printer size={18} /> Guardar PDF / Imprimir
          </button>
        </div>
      </div>

      {/* Hoja A4 */}
      <div className="bg-white shadow-2xl print:shadow-none print:w-auto print:max-w-none w-full max-w-4xl p-12 print:p-0 relative" >
        
        {/* Encabezado */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-blue-900 tracking-tighter">CERTIFICADO DE GARANTÍA</h1>
          <div className="w-32 h-1 bg-amber-500 mx-auto mt-4 mb-2"></div>
          <p className="text-lg font-bold text-slate-500 tracking-widest">{companyName}</p>
        </div>

        {/* Info de la Obra */}
        <div className="grid grid-cols-3 gap-4 items-start border-b-2 border-slate-200 pb-6 mb-8">
          <div>
            <p className="text-sm text-slate-500 font-bold uppercase">Titular / Cliente</p>
            <p className="text-lg font-bold text-slate-800 break-words">{wo.cliente}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 font-bold uppercase">Obra Ref.</p>
            <p className="text-lg font-bold text-blue-600 break-all">{wo.quoteNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 font-bold uppercase">Fecha de Emisión</p>
            <p className="text-xl font-bold text-slate-800">{getLocalDateString()}</p>
          </div>
        </div>

        {/* Condiciones de Garantía */}
        <div className="text-slate-700 leading-relaxed space-y-6 text-justify">
          <p>
            Por medio del presente documento, <strong>{companyName}</strong> certifica que el sistema, portón y/o motor instalado cuenta con una <strong>Garantía Oficial de 1 Año (12 meses)</strong> contra cualquier defecto de fabricación, fallas electromecánicas internas o defectos originados directamente por nuestro proceso de instalación.
          </p>

          <div>
            <h3 className="font-bold text-slate-900 mb-2">TÉRMINOS Y CONDICIONES:</h3>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>La garantía entra en vigencia a partir de la fecha de entrega y pruebas de conformidad.</li>
              <li>La garantía cubre el reemplazo de piezas defectuosas de fábrica y la mano de obra para su rectificación, siempre y cuando el diagnóstico técnico confirme que la falla no fue provocada por factores externos.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-2">LA GARANTÍA QUEDA ANULADA SI:</h3>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>El equipo sufre daños por picos de tensión eléctrica, rayos, cortocircuitos externos o desastres naturales.</li>
              <li>El portón o motor es manipulado, modificado o reparado por técnicos de terceros o personal no autorizado por SERYVER G&G.</li>
              <li>El daño es causado por choques, vandalismo, uso indebido, o forzamiento mecánico.</li>
              <li><strong>No se realizan los mantenimientos preventivos recomendados cada 6 meses.</strong> La falta de lubricación y limpieza exime a la empresa de responsabilidad por desgaste prematuro.</li>
            </ul>
          </div>
        </div>

        {/* Firmas */}
        <div className="mt-32 flex justify-between items-end">
          <div className="w-64 text-center">
            {pdfConfig?.signature ? (
              <div className="flex flex-col items-center">
                <img src={pdfConfig.signature} alt="Firma Digital" className="h-20 w-auto object-contain mb-2 mix-blend-multiply print:mix-blend-normal" />
                <div className="border-t border-slate-800 pt-2 font-bold text-sm text-slate-800 w-full">
                  Gerencia Comercial<br/>
                  {companyName}<br/>
                  RUC: {companyRuc}
                </div>
              </div>
            ) : (
              <div className="border-t border-slate-800 pt-2 font-bold text-sm text-slate-800 w-full mt-24">
                Gerencia Comercial<br/>
                {companyName}<br/>
                RUC: {companyRuc}
              </div>
            )}
          </div>
          
          <div className="w-24 h-24 border-4 border-blue-900 rounded-full flex items-center justify-center opacity-20 transform -rotate-12">
            <span className="font-black text-2xl text-blue-900 text-center leading-none">1 AÑO<br/>GARANTÍA</span>
          </div>
        </div>

      </div>
    </div>
  );
}
