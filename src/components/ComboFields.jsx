import React, { useState } from 'react';
import { componentCost, componentRows, isCombo } from '../utils/catalog';

export default function ComboFields({ value, onChange, products }) {
  const [selected, setSelected] = useState('');
  const [markup, setMarkup] = useState('0');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [technicians, setTechnicians] = useState('2');
  const [days, setDays] = useState('3');
  const rows = value.componentes || [];
  const available = products.filter(p => !isCombo(p));
  const change = (index, patch) => onChange({ ...value, componentes: rows.map((r, i) => i === index ? { ...r, ...patch } : r) });
  let cost = null; try { cost = componentCost(rows); } catch { /* Incomplete numeric input is validated on save. */ }
  const add = () => {
    const p = available.find(p => String(p.id) === selected); if (!p) return;
    onChange({ ...value, componentes: [...rows, { productId: p.id, nombre: p.nombre, unidad: p.unidad || 'UN', cantidad: 1, costo: p.costo ?? p.precio ?? 0 }] }); setSelected('');
  };
  return <div className="space-y-3 border-t pt-4">
    <h4 className="font-bold text-blue-900">Desglose interno por cada combo</h4>
    <button type="button" className="text-blue-700 underline text-sm" onClick={() => onChange({ ...value, componentes: componentRows(value, products, true) })}>Actualizar costos desde el inventario</button>
    <p className="text-sm text-gray-600">El cliente verá el nombre, la descripción y el precio del paquete. Los materiales y sus costos quedan guardados internamente. Revisa qué accesorios incluye cada kit para evitar duplicarlos.</p>
    <div className="flex flex-wrap gap-2 items-end bg-blue-50 p-3 rounded">
      <label>Ancho (m)<input aria-label="Ancho del panel" type="number" min="0" step="any" value={width} onChange={e => setWidth(e.target.value)} className="block border p-2 w-28" /></label>
      <label>Alto (m)<input aria-label="Alto del panel" type="number" min="0" step="any" value={height} onChange={e => setHeight(e.target.value)} className="block border p-2 w-28" /></label>
      <button type="button" disabled={!(Number(width) > 0 && Number(height) > 0)} onClick={() => onChange({ ...value, componentes: rows.map(r => r.unidad?.toUpperCase() === 'M2' ? { ...r, cantidad: Math.round(Number(width) * Number(height) * 100) / 100 } : r) })} className="border bg-white rounded p-2 disabled:opacity-40">Aplicar área a paneles</button>
      <label>Técnicos<input aria-label="Técnicos" type="number" min="1" value={technicians} onChange={e => setTechnicians(e.target.value)} className="block border p-2 w-20" /></label>
      <label>Días<input aria-label="Días" type="number" min="1" value={days} onChange={e => setDays(e.target.value)} className="block border p-2 w-20" /></label>
      <button type="button" disabled={!(Number(technicians) > 0 && Number(days) > 0)} onClick={() => onChange({ ...value, componentes: rows.map(r => r.unidad === 'PERSONA_DIA' ? { ...r, cantidad: Number(technicians) * Number(days) } : r) })} className="border bg-white rounded p-2 disabled:opacity-40">Aplicar persona × día</button>
    </div>
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left"><th>Material o servicio</th><th>Cantidad</th><th>Costo unitario S/</th><th>Importe</th><th /></tr></thead><tbody>
      {rows.map((row, index) => <tr key={index} className="border-t"><td className="py-2 pr-2">
        <select aria-label={'Componente ' + (index + 1)} className="border p-2 w-full max-w-sm" value={String(row.productId)} onChange={e => { const p = available.find(p => String(p.id) === e.target.value); if (p) change(index, { productId: p.id, nombre: p.nombre, unidad: p.unidad || 'UN', costo: p.costo ?? p.precio ?? 0 }); }}>
          {!available.some(p => String(p.id) === String(row.productId)) && <option value={String(row.productId)}>Eliminado: {row.nombre}</option>}
          {available.map(p => <option key={p.id} value={String(p.id)}>{p.nombre}</option>)}
        </select><small className="block">{row.unidad}</small></td>
        <td><input aria-label={'Cantidad componente ' + (index + 1)} type="number" min="0" step="any" className="border p-2 w-24" value={row.cantidad} onChange={e => change(index, { cantidad: e.target.value })} /></td>
        <td><input aria-label={'Costo componente ' + (index + 1)} type="number" min="0" step="0.01" className="border p-2 w-28" value={row.costo} onChange={e => change(index, { costo: e.target.value })} /></td>
        <td className="p-2">{(Number(row.cantidad) * Number(row.costo)).toFixed(2)}</td>
        <td><button type="button" aria-label={'Quitar componente ' + (index + 1)} className="text-red-700 p-2" onClick={() => onChange({ ...value, componentes: rows.filter((_, i) => i !== index) })}>Quitar</button></td></tr>)}
    </tbody></table></div>
    <div className="flex gap-2"><select aria-label="Agregar material al combo" className="border p-2 flex-1 min-w-0" value={selected} onChange={e => setSelected(e.target.value)}><option value="">Seleccionar material o servicio…</option>{available.filter(p => !rows.some(r => String(r.productId) === String(p.id))).map(p => <option key={p.id} value={String(p.id)}>{p.nombre}</option>)}</select><button type="button" disabled={!selected} onClick={add} className="bg-blue-100 text-blue-900 p-2 rounded disabled:opacity-40">Agregar componente</button></div>
    <div className="flex flex-wrap gap-3 items-center p-3 bg-green-50 rounded"><strong>Costo interno: S/ {cost === null ? '—' : cost.toFixed(2)}</strong><label>Utilidad sobre costo (%) <input aria-label="Utilidad sobre costo" type="number" min="0" step="any" className="border p-2 w-20" value={markup} onChange={e => setMarkup(e.target.value)} /></label><button type="button" disabled={cost === null || !Number.isFinite(Number(markup)) || Number(markup) < 0} onClick={() => onChange({ ...value, precio: Math.round(cost * (1 + Number(markup) / 100) * 100) / 100 })} className="border bg-white rounded p-2">Calcular precio de venta</button><span className="text-xs">Antes del IGV; el precio también se puede editar directamente.</span></div>
  </div>;
}
