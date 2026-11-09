import React, { useState, useEffect } from 'react';
import ComboFields from './ComboFields';
import { componentRows, configuredCombo } from '../utils/catalog';

export default function ComboConfigurator({ product, products, onSave, onClose, existing = false }) {
  const [value, setValue] = useState(() => ({ ...product, componentes: componentRows(product, products) }));
  const [error, setError] = useState('');
  const [reviewed, setReviewed] = useState(false);
  useEffect(() => { setError(''); }, [value]);
  const save = () => { try { if (!reviewed) throw new Error('Confirma que revisaste las cantidades, el equipo y el precio.'); if (onSave(configuredCombo(value, products)) !== false) onClose(); } catch (e) { setError(e.message); } };
  return <div className="fixed inset-0 z-[100] bg-slate-900/60 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Configurar combo"><div className="bg-white rounded-xl max-w-5xl mx-auto p-6 space-y-4">
    <div className="flex justify-between"><h3 className="text-xl font-bold">Configurar combo para esta cotización</h3><button onClick={onClose} className="border rounded px-3">Cancelar</button></div>
    <p className="text-sm text-gray-600">Los cambios se aplican a esta propuesta. Para cambiar la plantilla, usa Inventario. Selecciona sistema y motor según las dimensiones y el peso real de la puerta.</p>
    {value.notasInternas && <p className="bg-amber-50 p-3 text-sm">{value.notasInternas}</p>}
    {error && <p role="alert" className="bg-red-50 text-red-800 p-3">{error}</p>}
    <label className="block">Nombre comercial<input aria-label="Nombre comercial" className="block w-full border p-2" value={value.nombre} onChange={e => setValue({ ...value, nombre: e.target.value })} /></label>
    <label className="block">Descripción para el cliente<textarea aria-label="Descripción para el cliente" className="block w-full border p-2" value={value.descripcion || ''} onChange={e => setValue({ ...value, descripcion: e.target.value })} /></label>
    <ComboFields value={value} onChange={v => { setValue(v); setReviewed(false); }} products={products} />
    <label className="block font-bold">Precio de venta del combo (S/, antes del IGV)<input aria-label="Precio de venta del combo" type="number" min="0" step="0.01" className="block border p-2" value={value.precio} onChange={e => { setValue({ ...value, precio: e.target.value }); setReviewed(false); }} /></label>
    <label className="flex gap-2"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />Revisé materiales, cantidades, compatibilidad del equipo y precio de venta.</label>
    <button onClick={save} className="bg-blue-700 text-white px-5 py-3 rounded font-bold">{existing ? 'Guardar desglose de la partida' : 'Agregar combo a cotización'}</button>
  </div></div>;
}
