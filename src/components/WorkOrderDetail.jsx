import React, { useState } from 'react';
import { ArrowLeft, Printer, Plus, Trash2, CheckSquare, Square, Package, Award, Bell } from 'lucide-react';
import WorkOrderPDF from './WorkOrderPDF';
import WarrantyPDF from './WarrantyPDF';
import { futureDate, nonNegative } from '../utils/business';

export default function WorkOrderDetail({ wo, onBack, onUpdate, reminders, setReminders, pdfConfig, showToast }) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrintingWarranty, setIsPrintingWarranty] = useState(false);
  const [newItem, setNewItem] = useState({ nombre: '', cantidad: 1, unidad: 'UN' });

  const handleToggleCheck = (itemId, type) => onUpdate(current => ({ ...current,
    items: current.items.map(i => i.id === itemId ? { ...i, [type]: !i[type] } : i) }));

  const handleAddManualItem = () => {
    if (!newItem.nombre.trim()) return;
    let cantidad;
    try { cantidad = nonNegative(newItem.cantidad, 'Cantidad'); if (!cantidad) throw new Error('Introduce una cantidad mayor que cero.'); } catch (e) { showToast?.(e.message, 'error'); return; }
    const added = {
      id: crypto.randomUUID(),
      nombre: newItem.nombre,
      cantidad,
      unidad: newItem.unidad,
      despachado: false,
      recibido: false,
      isManual: true
    };
    onUpdate(current => ({ ...current, items: [...current.items, added] }));
    setNewItem({ nombre: '', cantidad: 1, unidad: 'UN' });
  };

  const handleDeleteItem = (itemId) => {
    onUpdate(current => ({ ...current, items: current.items.filter(i => i.id !== itemId) }));
  };

  const handleChangeEstado = (e) => {
    const newEstado = e.target.value;
    onUpdate(current => ({ ...current, estado: newEstado }));

    // Lógica Automática CRM: Si se finaliza, agendar mantenimientos
    if (newEstado === 'Finalizado' && wo.estado !== 'Finalizado') {
      const exists = reminders?.some(r => (r.quoteId === wo.quoteId || (!r.quoteId && r.quoteNumber === wo.quoteNumber)));
      if (!exists && setReminders) {
        const rem3 = {
          id: 'maintenance-3-' + wo.id,
          quoteId: wo.quoteId,
          quoteNumber: wo.quoteNumber,
          cliente: wo.cliente,
          fecha: futureDate(3),
          tipo: 'Mantenimiento Preventivo (3 Meses)',
          estado: 'Pendiente'
        };
        const rem6 = {
          id: 'maintenance-6-' + wo.id,
          quoteId: wo.quoteId,
          quoteNumber: wo.quoteNumber,
          cliente: wo.cliente,
          fecha: futureDate(6),
          tipo: 'Mantenimiento Preventivo (6 Meses)',
          estado: 'Pendiente'
        };
        setReminders(prev => [...prev.filter(r => r.id !== rem3.id && r.id !== rem6.id), rem3, rem6]);
        if(showToast) showToast('¡Obra finalizada! Mantenimientos de 3 y 6 meses programados.', 'success');
      }
    }
  };

  if (isPrinting) return <WorkOrderPDF wo={wo} onBack={() => setIsPrinting(false)} pdfConfig={pdfConfig} />;
  if (isPrintingWarranty) return <WarrantyPDF wo={wo} onBack={() => setIsPrintingWarranty(false)} pdfConfig={pdfConfig} />;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Checklist de Obra: {wo.quoteNumber}</h2>
            <p className="text-sm text-slate-500">{wo.cliente}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={wo.estado} 
            onChange={handleChangeEstado}
            className="border-slate-300 rounded-lg text-sm font-medium focus:ring-blue-500 bg-white"
          >
            <option value="Por Despachar">Por Despachar (Taller)</option>
            <option value="En Obra">En Obra (Instalando)</option>
            <option value="Finalizado">Finalizado</option>
          </select>
          <button 
            onClick={() => setIsPrinting(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
          >
            <Printer size={16} /> Imprimir Orden
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 bg-slate-50 flex flex-col gap-4">
        {/* Modulo Logística */}
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <div className="p-3 border-b bg-blue-50/50 flex justify-between items-center">
            <span className="font-bold text-blue-900 flex items-center gap-2"><Package size={16}/> Logística y Materiales</span>
          </div>
          
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Ítem / Herramienta</th>
                <th className="px-4 py-3 text-center">Cant.</th>
                <th className="px-4 py-3 text-center bg-amber-50">Despacho (Taller)</th>
                <th className="px-4 py-3 text-center bg-blue-50">Recepción (Obra)</th>
                <th className="px-4 py-3 text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wo.items.map((item, idx) => (
                <tr key={item.id} className={item.isManual ? 'bg-slate-50/50' : 'bg-white'}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{item.nombre}</span>
                    {item.isManual && <span className="ml-2 text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase">Manual</span>}
                  </td>
                  <td className="px-4 py-3 text-center font-bold">{item.cantidad} {item.unidad}</td>
                  <td className="px-4 py-3 text-center bg-amber-50/30">
                    <button onClick={() => handleToggleCheck(item.id, 'despachado')} className={`p-1 rounded hover:bg-amber-100 transition-colors ${item.despachado ? 'text-emerald-600' : 'text-slate-300'}`}>
                      {item.despachado ? <CheckSquare size={24} /> : <Square size={24} />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center bg-blue-50/30">
                    <button onClick={() => handleToggleCheck(item.id, 'recibido')} className={`p-1 rounded hover:bg-blue-100 transition-colors ${item.recibido ? 'text-emerald-600' : 'text-slate-300'}`}>
                      {item.recibido ? <CheckSquare size={24} /> : <Square size={24} />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDeleteItem(item.id)} className="text-red-400 hover:text-red-600 p-1" title="Eliminar de la lista">
                        <Trash2 size={16} />
                      </button>
                  </td>
                </tr>
              ))}
              
              <tr className="bg-white border-t-2 border-dashed border-slate-200">
                <td className="px-4 py-3">
                  <input type="text" placeholder="Ej. Andamios, Cemento..." className="w-full text-sm border-slate-300 rounded focus:ring-blue-500" value={newItem.nombre} onChange={e => setNewItem({...newItem, nombre: e.target.value})} />
                </td>
                <td className="px-4 py-3 flex gap-1">
                  <input type="number" className="w-16 text-sm border-slate-300 rounded focus:ring-blue-500" value={newItem.cantidad} onChange={e => setNewItem({...newItem, cantidad: e.target.value})} />
                  <select className="w-20 text-sm border-slate-300 rounded focus:ring-blue-500" value={newItem.unidad} onChange={e => setNewItem({...newItem, unidad: e.target.value})}>
                    <option value="UN">UN</option>
                    <option value="GLB">GLB</option>
                    <option value="KG">KG</option>
                    <option value="MT">MT</option>
                  </select>
                </td>
                <td colSpan="3" className="px-4 py-3">
                  <button onClick={handleAddManualItem} className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded font-medium transition-colors">
                    <Plus size={16} /> Añadir a la lista
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Modulo Post-Venta (Solo si está finalizado) */}
        {wo.estado === 'Finalizado' && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 shadow-sm mt-2 animate-fade-in-up">
            <h3 className="font-bold text-emerald-900 mb-3 flex items-center gap-2">
              <Award size={20} className="text-emerald-600"/> Acciones Post-Venta (Fidelización)
            </h3>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsPrintingWarranty(true)}
                className="flex-1 bg-white border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-500 hover:text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Award size={20} /> Generar Certificado de Garantía
              </button>
              <div className="flex-1 bg-white/60 border border-emerald-200 py-3 rounded-lg flex items-center justify-center gap-2 text-emerald-800 text-sm font-medium">
                <Bell size={18} className="text-emerald-500 animate-pulse"/>
                Alertas de 3 y 6 meses programadas.
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}