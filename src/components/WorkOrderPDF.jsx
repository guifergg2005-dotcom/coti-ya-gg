import React, { useEffect } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
const NativePrinter = null;

export default function WorkOrderPDF({ wo, onBack, pdfConfig }) {
  const handlePrint = async () => {
    const docName = `OrdenTrabajo_${wo.quoteNumber}`;
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

  return (
    <div className="bg-gray-200 min-h-screen p-4 print:p-0 print:bg-white flex flex-col items-center print:block print:min-h-0">
      {/* Barra superior no imprimible */}
      <div className="w-full max-w-4xl flex justify-between items-center bg-white p-3 rounded-xl shadow mb-4 print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium">
          <ArrowLeft size={18} /> Volver
        </button>
        <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg font-bold shadow-md hover:bg-blue-700">
          <Printer size={18} /> Imprimir Orden de Trabajo
        </button>
      </div>

      {/* Hoja A4 */}
      <div className="bg-white shadow-2xl print:shadow-none print:w-auto print:max-w-none w-full max-w-4xl p-10 print:p-0 relative" >
        
        {/* Encabezado */}
        <div className="border-b-4 border-slate-800 pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tighter">ORDEN DE TRABAJO</h1>
            <p className="text-sm font-bold text-slate-500 tracking-widest mt-1">LOGÍSTICA Y DESPACHO</p>
          </div>
          <div className="text-right min-w-0 max-w-[55%] break-all">
            <p className="text-2xl font-bold text-blue-600">{wo.quoteNumber}</p>
            <p className="text-sm text-gray-500 mt-1">Generada: {wo.fecha}</p>
          </div>
        </div>

        {/* Info Cliente */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg mb-8">
          <p className="text-xs text-slate-500 font-bold uppercase mb-1">Cliente / Destino de Obra</p>
          <p className="text-lg font-bold text-slate-800">{wo.cliente}</p>
        </div>

        {/* Tabla de Materiales */}
        <div className="mb-8">
          <h3 className="font-bold text-slate-800 mb-3 border-b-2 border-slate-200 pb-1">CHECKLIST DE MATERIALES Y HERRAMIENTAS</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white text-xs uppercase">
                <th className="py-2 px-3 text-left border border-slate-700">Ítem / Descripción</th>
                <th className="py-2 px-3 text-center w-20 border border-slate-700">CANT</th>
                <th className="py-2 px-3 text-center w-24 border border-slate-700">DESPACHO</th>
                <th className="py-2 px-3 text-center w-24 border border-slate-700">RECEPCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {wo.items.map((item, idx) => (
                <tr key={item.id} className="border-b border-slate-200">
                  <td className="py-3 px-3 font-medium text-slate-800 border-r border-slate-200">
                    {item.nombre}
                    {item.isManual && <span className="ml-2 text-[9px] text-slate-500 uppercase italic">(Agregado)</span>}
                  </td>
                  <td className="py-3 px-3 text-center font-bold border-r border-slate-200 bg-slate-50">{item.cantidad} {item.unidad}</td>
                  
                  {/* Cajas para check manual con lapicero si no se marcaron en sistema */}
                  <td className="py-3 px-3 text-center border-r border-slate-200">
                    <div className="w-6 h-6 border-2 border-slate-400 rounded flex items-center justify-center mx-auto text-slate-800">
                      {item.despachado ? '✓' : ''}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center border-r border-slate-200">
                    <div className="w-6 h-6 border-2 border-slate-400 rounded flex items-center justify-center mx-auto text-slate-800">
                      {item.recibido ? '✓' : ''}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Firmas */}
        <div className="mt-20 pt-8 flex justify-around border-t-2 border-slate-200">
          <div className="text-center w-48">
            {pdfConfig?.signature ? (
              <div className="flex flex-col items-center">
                <img src={pdfConfig.signature} alt="Firma Digital" className="h-16 w-auto object-contain mb-1 mix-blend-multiply print:mix-blend-normal" />
                <div className="border-t border-slate-400 pt-1 font-bold text-sm text-slate-600 w-full">Firma Jefe de Almacén</div>
              </div>
            ) : (
              <div className="border-t border-slate-400 pt-1 font-bold text-sm text-slate-600 w-full mt-16">Firma Jefe de Almacén</div>
            )}
          </div>
          <div className="text-center w-48">
            <div className="border-t border-slate-400 pt-2 font-bold text-sm text-slate-600">Firma Técnico Receptor</div>
          </div>
        </div>

      </div>
    </div>
  );
}