import React, { useState } from 'react';
import { nonNegative } from '../utils/business';
import { DollarSign, Save, Trash2 } from 'lucide-react';

const getLocalDateString = () => {
  const d = new Date();
  return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

export default function AccountingManager({ transactions, setTransactions }) {
  const [newTrans, setNewTrans] = useState({ fecha: getLocalDateString(), descripcion: '', monto: '', tipo: 'Gasto' });
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const addTransaction = () => {
    if(!newTrans.descripcion || !newTrans.monto) return;
    let monto; try { monto = nonNegative(newTrans.monto, 'Monto'); if (!monto) throw new Error('El monto debe ser mayor que cero.'); } catch (e) { setError(e.message); return; }
    setError(''); setTransactions(prev => [{...newTrans, id: crypto.randomUUID(), monto}, ...prev]);
    setNewTrans({ ...newTrans, descripcion: '', monto: '' });
  };

  const confirmDelete = id => { if (transactions.some(t => t.id === id && (t.quoteId || t.categoria === 'Ventas'))) { setError('Los movimientos de ventas contabilizadas se conservan para mantener la trazabilidad.'); return; } setTransactions(prev => prev.filter(t => t.id !== id)); setDeleteId(null); };

  return (
    <div className="space-y-6 animate-fade-in">{error && <p role="alert" className="p-3 bg-red-50 text-red-800">{error}</p>}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-600"/> Registrar Movimiento</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div><label className="block text-xs font-bold text-gray-500 mb-1">Fecha</label><input type="date" className="w-full border p-2 rounded bg-gray-50" value={newTrans.fecha} onChange={e => setNewTrans({...newTrans, fecha: e.target.value})} /></div>
          <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 mb-1">Descripción</label><input className="w-full border p-2 rounded bg-gray-50" value={newTrans.descripcion} onChange={e => setNewTrans({...newTrans, descripcion: e.target.value})} placeholder="Ej: Compra de materiales" /></div>
          <div><label className="block text-xs font-bold text-gray-500 mb-1">Monto (S/)</label><input type="number" min="0.01" step="0.01" className="w-full border p-2 rounded font-bold text-gray-700 bg-gray-50" value={Number.isNaN(newTrans.monto) ? '' : newTrans.monto} onChange={e => setNewTrans({...newTrans, monto: e.target.value})} /></div>
          <div><label className="block text-xs font-bold text-gray-500 mb-1">Tipo</label><select className="w-full border p-2 rounded bg-gray-50" value={newTrans.tipo} onChange={e => setNewTrans({...newTrans, tipo: e.target.value})}><option value="Gasto">Gasto (Salida)</option><option value="Ingreso">Ingreso (Entrada)</option></select></div>
        </div>
        <div className="mt-4 flex justify-end"><button onClick={addTransaction} className="bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2"><Save className="h-4 w-4" /> Guardar Registro</button></div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto print:overflow-visible w-full pb-2 shadow-sm print:shadow-none rounded-lg print:rounded-none">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 uppercase font-bold border-b"><tr><th className="p-4">Fecha</th><th className="p-4">Descripción</th><th className="p-4 text-center">Tipo</th><th className="p-4 text-right">Monto</th><th className="p-4"></th></tr></thead>
            <tbody className="divide-y">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="p-4 text-gray-500">{t.fecha}</td><td className="p-4 font-medium text-gray-800">{t.descripcion}</td>
                  <td className="p-4 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${t.tipo === 'Ingreso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.tipo}</span></td>
                  <td className={`p-4 text-right font-bold ${t.tipo === 'Ingreso' ? 'text-green-600' : 'text-red-600'}`}>{t.tipo === 'Gasto' ? '-' : '+'} S/ {t.monto.toFixed(2)}</td>
                  <td className="p-4 text-center">{t.quoteId || t.categoria === 'Ventas' ? <span title="Movimiento de venta protegido">—</span> : deleteId === t.id ? <button onClick={() => confirmDelete(t.id)} className="text-red-600 font-bold text-xs bg-red-100 px-2 py-1 rounded">Confirmar</button> : <button onClick={() => setDeleteId(t.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
