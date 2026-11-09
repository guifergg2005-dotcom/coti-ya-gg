import React, { useState } from 'react';
import { Bell, CheckCircle, Calendar, Phone, Package } from 'lucide-react';

import { isOverdue, whatsappUrl } from '../utils/business';

export default function RemindersPanel({ reminders, setReminders }) {
  const [filter, setFilter] = useState('Pendiente'); // Pendiente, Completado, Todos

  const handleComplete = (id) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, estado: 'Completado' } : r));
  };

  const handleDelete = (id) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const filtered = (reminders || []).filter(r => filter === 'Todos' ? true : r.estado === filter)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha)); // Ordenar por fecha más próxima


  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500 rounded-lg"><Bell className="text-white h-5 w-5" /></div>
          <h2 className="text-xl font-bold text-slate-800">Alertas de Mantenimiento</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFilter('Pendiente')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === 'Pendiente' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Pendientes</button>
          <button onClick={() => setFilter('Completado')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === 'Completado' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Completados</button>
          <button onClick={() => setFilter('Todos')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === 'Todos' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todos</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 bg-slate-50">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Bell className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-slate-500">No hay alertas</h3>
            <p>No tienes recordatorios en esta categoría.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(r => {
              const overdue = isOverdue(r.fecha) && r.estado === 'Pendiente';
              return (
                <div key={r.id} className={`bg-white border rounded-xl p-4 shadow-sm relative overflow-hidden ${overdue ? 'border-red-300' : 'border-slate-200'}`}>
                  {overdue && <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>}
                  {r.estado === 'Completado' && <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>}
                  
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Package size={12}/> Ref: {r.quoteNumber}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${r.estado === 'Completado' ? 'bg-emerald-100 text-emerald-700' : (overdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}`}>
                      {r.estado}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{r.cliente}</h3>
                  <p className="text-sm font-medium text-blue-600 mb-4">{r.tipo}</p>
                  
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                    <Calendar size={14} className={overdue ? 'text-red-500' : ''}/> 
                    <span className={overdue ? 'text-red-600 font-bold' : ''}>Programado: {r.fecha}</span>
                  </div>

                  {r.estado === 'Pendiente' ? (
                    <div className="flex gap-2 border-t pt-3">
                      <button onClick={() => handleComplete(r.id)} className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors">
                        <CheckCircle size={16}/> Marcar Listo
                      </button>
                      <button onClick={() => window.open(whatsappUrl(`Hola ${r.cliente}, somos SERYVER G&G. Te escribimos para agendar tu ${r.tipo}.`), '_blank')} className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors" title="Contactar por WhatsApp">
                        <Phone size={16}/>
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 border-t pt-3">
                       <button onClick={() => handleDelete(r.id)} className="w-full text-xs text-slate-400 hover:text-red-500 font-medium py-1">
                          Eliminar Registro
                       </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
