import React, { useState } from 'react';
import { HardHat, Search, ArrowRight, Clock, Truck, CheckCircle } from 'lucide-react';
import WorkOrderDetail from './WorkOrderDetail';

export default function WorkOrderManager({ workOrders, setWorkOrders, reminders, setReminders, pdfConfig, showToast }) {
  const [selectedId, setSelectedId] = useState(null);
  const selectedWO = workOrders.find(wo => wo.id === selectedId);
  const [searchTerm, setSearchTerm] = useState('');

  const handleUpdateWO = (update) => setWorkOrders(prev => prev.map(wo => wo.id === selectedId ? update(wo) : wo));

  if (selectedWO) {
    return <WorkOrderDetail wo={selectedWO} onBack={() => setSelectedId(null)} onUpdate={handleUpdateWO} reminders={reminders} setReminders={setReminders} pdfConfig={pdfConfig} showToast={showToast} />;
  }

  const filtered = workOrders.filter(wo => 
    wo.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    wo.cliente.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600 rounded-lg"><HardHat className="text-white h-5 w-5" /></div>
          <h2 className="text-xl font-bold text-slate-800">Control de Obras</h2>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input 
            type="text" 
            placeholder="Buscar por COT o cliente..." 
            className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full sm:w-64 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <HardHat className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No hay obras activas en este momento.</p>
            <p className="text-sm mt-1">Acepta una cotización para generar una obra.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(wo => (
              <div key={wo.id} onClick={() => setSelectedId(wo.id)} className="border border-slate-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer bg-white flex flex-wrap items-center justify-between gap-3 group">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                    <span className="font-bold text-slate-800">{wo.quoteNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1
                      ${wo.estado === 'Por Despachar' ? 'bg-amber-100 text-amber-700' : 
                        wo.estado === 'En Obra' ? 'bg-blue-100 text-blue-700' : 
                        'bg-emerald-100 text-emerald-700'}`}>
                      {wo.estado === 'Por Despachar' && <Clock size={12}/>}
                      {wo.estado === 'En Obra' && <Truck size={12}/>}
                      {wo.estado === 'Finalizado' && <CheckCircle size={12}/>}
                      {wo.estado}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 truncate">{wo.cliente}</p>
                </div>
                <div className="text-right flex items-center gap-3 sm:gap-4 ml-auto">
                  <div className="text-xs text-slate-400">
                    <p>Generada: {wo.fecha}</p>
                    <p>{wo.items.length} ítems logísticos</p>
                  </div>
                  <ArrowRight className="text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
