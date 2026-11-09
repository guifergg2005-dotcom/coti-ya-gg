import React, { useState } from 'react';
import { isPosted, whatsappUrl } from '../utils/business';
import { Plus, Edit2, Trash2, Bell, AlertTriangle, Settings, Users, Phone } from 'lucide-react';

export default function Dashboard({ history, clients, onNew, onLoad, onDuplicate, onStatusChange, onDelete, onUpdateQuote }) {
  const [tab, setTab] = useState('cotizaciones');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const filteredHistory = history.filter(h => 
     h.cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     h.numero?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const safeCurrentPage = Math.min(currentPage, Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage)));
  const currentItems = filteredHistory.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));

  const filteredObras = history.filter(h => h.status === 'Aceptada' && (h.cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || h.numero?.toLowerCase().includes(searchTerm.toLowerCase())));
  const safeObrasPage = Math.min(currentPage, Math.max(1, Math.ceil(filteredObras.length / itemsPerPage)));
  const currentObras = filteredObras.slice((safeObrasPage - 1) * itemsPerPage, safeObrasPage * itemsPerPage);
  const totalObrasPages = Math.max(1, Math.ceil(filteredObras.length / itemsPerPage));

  const today = new Date();
  today.setHours(0, 0, 0, 0); 
  const getDaysDiff = (dateStr) => {
    if (!dateStr) return 0;
    const [year, month, day] = dateStr.split('-');
    const qDate = new Date(year, month - 1, day);
    const diffTime = today - qDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const alerts = history.map(h => {
    const days = getDaysDiff(h.status === 'Aceptada' ? (h.acceptedAt || h.fecha) : h.fecha);
    let alertType = null;
    let message = '';
    
    if (h.status === 'Pendiente' && days >= 2) {
      alertType = 'followup';
      message = `Llamar para seguimiento (enviada hace ${days} días)`;
    } 
    else if (h.status === 'Aceptada' && days >= 60) {
      alertType = 'maintenance';
      message = `Ofrecer mantenimiento preventivo (vendida hace ${days} días)`;
    }

    return { ...h, days, alertType, message };
  }).filter(h => h.alertType);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Panel Principal</h2>
          <div className="flex flex-wrap gap-4 mt-3">
            <button onClick={() => { setTab('cotizaciones'); setSearchTerm(''); setCurrentPage(1); }} className={`text-sm font-bold pb-2 border-b-2 transition-colors ${tab === 'cotizaciones' ? 'text-cyan-600 border-cyan-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>Lista de Cotizaciones</button>
            <button onClick={() => { setTab('crm'); setSearchTerm(''); setCurrentPage(1); }} className={`text-sm font-bold pb-2 border-b-2 transition-colors flex items-center gap-2 ${tab === 'crm' ? 'text-cyan-600 border-cyan-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
              Seguimiento CRM
              {alerts.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{alerts.length}</span>}
            </button>
            <button onClick={() => { setTab('obras'); setSearchTerm(''); setCurrentPage(1); }} className={`text-sm font-bold pb-2 border-b-2 transition-colors flex items-center gap-2 ${tab === 'obras' ? 'text-cyan-600 border-cyan-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
              Control de Obras
            </button>
          </div>
        </div>
        <button onClick={onNew} className="hidden md:flex bg-cyan-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-cyan-700 transition-all items-center gap-2 transform hover:scale-105"><Plus className="h-5 w-5" /> Nueva Cotización</button>
      </div>

      {tab === 'cotizaciones' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <input type="text" placeholder="🔍 Buscar cotizaciones por código o cliente..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full max-w-md px-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none" />
            <span className="text-xs font-bold text-gray-500">Total: {filteredHistory.length} registros</span>
          </div>
          <div className="overflow-x-auto print:overflow-visible w-full pb-2 shadow-sm print:shadow-none rounded-lg print:rounded-none">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 uppercase font-bold border-b">
                <tr><th className="p-4">Estado</th><th className="p-4">Código</th><th className="p-4">Cliente</th><th className="p-4 text-right">Total</th><th className="p-4 text-center">Acciones</th></tr>
              </thead>
              <tbody className="divide-y">
                {currentItems.length === 0 ? <tr><td colSpan="5" className="p-12 text-center text-gray-400">No se encontraron cotizaciones.</td></tr> : currentItems.map((h) => (
                  <tr key={h.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-4">
                      <select disabled={isPosted(h)} title={isPosted(h) ? 'Venta contabilizada: estado protegido' : 'Estado de la cotización'} value={h.status || 'Pendiente'} onChange={(e) => onStatusChange(h.id, e.target.value)} className={`px-3 py-1 rounded-full text-xs font-bold border-none outline-none cursor-pointer shadow-sm ${h.status === 'Aceptada' ? 'bg-green-100 text-green-700' : h.status === 'Rechazada' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        <option value="Pendiente">Pendiente</option><option value="Aceptada">Aceptada</option><option value="Rechazada">Rechazada</option>
                      </select>
                    </td>
                    <td className="p-4 font-medium text-gray-600 font-mono">{h.numero}</td><td className="p-4 font-bold text-gray-800">{h.cliente?.nombre}</td>
                    <td className="p-4 text-right font-bold text-blue-900">S/ {Number(h.totalFinal || 0).toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => onLoad(h)} className="text-cyan-600 hover:bg-cyan-100 px-3 py-1 rounded transition-colors flex items-center justify-center gap-1"><Edit2 className="h-3 w-3" /> Abrir</button>
                        {onDuplicate && <button onClick={() => onDuplicate(h)} className="text-blue-700 underline px-2 text-xs">Duplicar</button>}
                        {isPosted(h) ? <span className="text-xs text-slate-400">Contabilizada</span> : deleteConfirmId === h.id ? (
                          <button onClick={() => { onDelete(h.id); setDeleteConfirmId(null); }} className="text-red-600 hover:bg-red-100 px-3 py-1 rounded transition-colors flex items-center justify-center gap-1 font-bold text-xs">Confirmar</button>
                        ) : (
                          <button onClick={() => setDeleteConfirmId(h.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" title="Borrar cotización"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 border rounded-lg text-sm font-bold text-gray-600 disabled:opacity-50">Anterior</button>
              <span className="text-sm text-gray-600 font-bold">Página {safeCurrentPage} de {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 border rounded-lg text-sm font-bold text-gray-600 disabled:opacity-50">Siguiente</button>
            </div>
          )}
        </div>
      )}

      {tab === 'crm' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-600" />
              <h3 className="font-bold text-orange-800">Alertas y Recordatorios</h3>
            </div>
            <div className="overflow-x-auto print:overflow-visible w-full pb-2 shadow-sm print:shadow-none rounded-lg print:rounded-none">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-gray-600 uppercase font-bold border-b">
                  <tr>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Cliente / Contacto</th>
                    <th className="p-4">Cotización</th>
                    <th className="p-4">Acción Requerida</th>
                    <th className="p-4 text-center">Revisar</th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-white">
                  {alerts.length === 0 ? <tr><td colSpan="5" className="p-8 text-center text-gray-400">Todo al día. No hay seguimientos ni mantenimientos pendientes hoy.</td></tr> : alerts.map(a => (
                    <tr key={a.id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="p-4">
                        {a.alertType === 'followup' ? 
                          <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[10px] uppercase tracking-wide font-bold flex items-center w-max gap-1"><AlertTriangle size={12}/> Seguimiento</span> : 
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] uppercase tracking-wide font-bold flex items-center w-max gap-1"><Settings size={12}/> Mantenimiento</span>}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-gray-800">{a.cliente?.nombre}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{a.cliente?.contacto || 'Sin contacto'} {a.cliente?.telefono ? ` - Cel: ${a.cliente.telefono}` : ''}</p>
                      </td>
                      <td className="p-4 font-mono text-gray-600 text-xs">
                        {a.numero}<br/>
                        <span className="text-gray-400 font-sans font-bold">S/ {Number(a.totalFinal || 0).toFixed(2)}</span>
                      </td>
                      <td className="p-4 font-bold text-gray-700 text-xs">
                        {a.message}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => onLoad(a)} className="text-cyan-600 hover:bg-cyan-100 px-3 py-1 rounded transition-colors flex items-center justify-center gap-1"><Edit2 className="h-3 w-3" /> Ver Detalle</button>
                          <button onClick={() => window.open(whatsappUrl(`Hola ${a.cliente?.nombre || ''}, somos de SERYVER G&G. Te escribimos respecto a la cotización ${a.numero || ''}.`), '_blank')} className="p-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors" title="Contactar por WhatsApp"><Phone size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h3 className="font-bold text-gray-800">Base de Datos de Clientes</h3>
            </div>
            <div className="overflow-x-auto print:overflow-visible w-full pb-2 shadow-sm print:shadow-none rounded-lg print:rounded-none">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-gray-600 uppercase font-bold border-b">
                  <tr>
                    <th className="p-4">Empresa / Razón Social</th>
                    <th className="p-4">RUC / DNI</th>
                    <th className="p-4">Atención / Contacto</th>
                    <th className="p-4">Dirección</th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-white">
                  {(!clients || clients.length === 0) ? (
                    <tr><td colSpan="4" className="p-8 text-center text-gray-400">Aún no hay clientes registrados en la base de datos.</td></tr>
                  ) : clients.map((c, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-4 font-bold text-gray-800">{c.nombre}</td>
                      <td className="p-4 text-gray-600 font-mono text-xs">{c.ruc || '-'}</td>
                      <td className="p-4 text-gray-600">
                        {c.contacto ? <span className="block font-medium">{c.contacto}</span> : '-'}
                        {c.telefono && <span className="block text-xs text-gray-400">{c.telefono}</span>}
                      </td>
                      <td className="p-4 text-gray-600 text-xs">{c.direccion || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'obras' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
          <div className="p-4 bg-cyan-50 border-b border-cyan-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-bold text-cyan-800">Panel de Control de Obras</h3>
              <span className="text-xs text-cyan-600">Solo muestra cotizaciones con estado "Aceptada"</span>
            </div>
            <div className="w-full md:w-auto flex-1 max-w-md">
              <input type="text" placeholder="🔍 Buscar obra por código o cliente..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full px-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none" />
            </div>
          </div>
          <div className="overflow-x-auto print:overflow-visible w-full pb-2 shadow-sm print:shadow-none rounded-lg print:rounded-none">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 uppercase font-bold border-b">
                <tr>
                  <th className="p-4">Fecha Aceptada</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Ubicacion</th>
                  <th className="p-4">Inicio Obra</th>
                  <th className="p-4">Entrega Obra</th>
                  <th className="p-4 text-center">Publicidad</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {currentObras.length === 0 ? <tr><td colSpan="6" className="p-12 text-center text-gray-400">No hay obras aceptadas registradas.</td></tr> : currentObras.map((h) => (
                  <tr key={h.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="p-4 font-mono text-gray-600">{h.fecha}</td>
                    <td className="p-4 font-bold text-gray-800">{h.cliente?.nombre}</td>
                    <td className="p-4">
                      <input type="text" value={h.ubicacion || ''} onChange={(e) => onUpdateQuote(h.id, { ubicacion: e.target.value })} placeholder="Ej. Av. Los Pinos 123" className="w-full text-xs p-2 border rounded focus:ring-1 focus:ring-cyan-500 outline-none" />
                    </td>
                    <td className="p-4">
                      <input type="date" value={h.fechaInicio || ''} onChange={(e) => onUpdateQuote(h.id, { fechaInicio: e.target.value })} className="text-xs p-2 border rounded focus:ring-1 focus:ring-cyan-500 outline-none" />
                    </td>
                    <td className="p-4">
                      <input type="date" value={h.fechaEntrega || ''} onChange={(e) => onUpdateQuote(h.id, { fechaEntrega: e.target.value })} className="text-xs p-2 border rounded focus:ring-1 focus:ring-cyan-500 outline-none" />
                    </td>
                    <td className="p-4 text-center">
                      <input type="checkbox" checked={h.publicidad || false} onChange={(e) => onUpdateQuote(h.id, { publicidad: e.target.checked })} className="w-4 h-4 text-cyan-600 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500 cursor-pointer" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalObrasPages > 1 && (
            <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 border rounded-lg text-sm font-bold text-gray-600 disabled:opacity-50">Anterior</button>
              <span className="text-sm text-gray-600 font-bold">Página {safeObrasPage} de {totalObrasPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalObrasPages, p + 1))} disabled={currentPage === totalObrasPages} className="px-4 py-2 border rounded-lg text-sm font-bold text-gray-600 disabled:opacity-50">Siguiente</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
