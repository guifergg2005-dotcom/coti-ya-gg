import React, { useState } from 'react';
import ComboFields from './ComboFields';
import { componentRows, componentCost, isCombo, normalizeProduct } from '../utils/catalog';

const blank = () => ({ nombre: '', descripcion: '', notasInternas: '', costo: 0, precio: 0, stock: 0, categoria: 'Materiales', unidad: 'UN' });
const categories = ['Producto', 'Materiales', 'Paneles', 'Sistemas', 'Motores', 'Accesorios', 'Servicio', 'Servicios', 'Combo'];
const units = ['UN', 'M2', 'ML', 'SRV', 'CMB', 'GLB', 'PERSONA_DIA', 'DIA', 'KG', 'GAL'];
export default function InventoryManager({ products, onUpdate, onAdd, onDelete }) {
  const [search, setSearch] = useState(''), [category, setCategory] = useState('');
  const [form, setForm] = useState(null), [original, setOriginal] = useState(null), [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const open = p => { setError(''); setOriginal(p || null); setForm(p ? { ...p, costo: p.costo ?? p.precio ?? 0, ...(isCombo(p) ? { componentes: componentRows(p, products) } : {}) } : blank()); };
  const save = e => { e.preventDefault(); try {
    if (original && JSON.stringify(products.find(p => p.id === original.id)) !== JSON.stringify(original)) throw new Error('Este producto cambió en otro equipo. Cancela y vuelve a abrirlo para revisar los datos actuales.');
    const value = normalizeProduct(form, products);
    if ((original ? onUpdate(value) : onAdd(value)) !== false) { setForm(null); setError(''); }
  } catch (e) { setError(e.message); } };
  const field = (key, label, type = 'text') => <label className="block text-sm font-semibold">{label}<input aria-label={label} type={type} min={type === 'number' ? '0' : undefined} step={type === 'number' ? 'any' : undefined} className="block w-full border rounded p-2 mt-1 font-normal" value={form[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>;
  const filtered = products.filter(p => (!category || p.categoria === category) && [p.nombre, p.descripcion, p.grupo].join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const deleting = products.find(p => p.id === deleteId);
  const dependent = products.filter(p => p.componentes?.some(r => String(r.productId) === String(deleteId)));
  return <div className="space-y-5">
    <div className="bg-white p-6 rounded-xl border space-y-3"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-2xl font-bold">Inventario y combos</h2><p className="text-gray-600">Materiales, servicios, costos internos y precios de venta editables.</p></div><button onClick={() => open()} className="bg-cyan-700 text-white px-4 py-2 rounded">Nuevo producto o material</button><button onClick={() => { open(); setForm({ ...blank(), categoria: 'Combo', unidad: 'CMB', componentes: [] }); }} className="bg-blue-700 text-white px-4 py-2 rounded">Nuevo combo</button></div>
      <p className="text-sm bg-amber-50 p-3">Los importes del PDF son referencias de costo. Los nuevos precios de venta parten de ese costo, sin utilidad añadida. Revisa precios e IGV antes de cotizar. El documento no informa existencias: registra el stock real antes de aceptar ventas.</p>
      <div className="flex gap-3"><input aria-label="Buscar producto" placeholder="Buscar producto, material o combo…" className="border p-2 rounded flex-1" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Filtrar categoría" className="border p-2 rounded" value={category} onChange={e => setCategory(e.target.value)}><option value="">Todas las categorías</option>{[...new Set([...categories, ...products.map(p => p.categoria).filter(Boolean)])].map(c => <option key={c}>{c}</option>)}</select></div><p className="text-sm text-gray-500">{filtered.length} de {products.length} registros</p>
    </div>
    {form && <form onSubmit={save} className="bg-white border-2 border-blue-200 rounded-xl p-6 space-y-4" aria-label="Editor de catálogo">
      <div className="flex justify-between"><h3 className="text-xl font-bold">{original ? 'Editar' : 'Crear'} {isCombo(form) ? 'combo' : 'material o servicio'}</h3><button type="button" onClick={() => { setForm(null); setError(''); }} className="border px-3 rounded">Cancelar</button></div>
      {error && <p role="alert" className="p-3 bg-red-50 text-red-800">{error}</p>}
      <div className="grid md:grid-cols-3 gap-4">{field('nombre', 'Nombre')}
        <label>Categoría<select aria-label="Categoría" className="block border p-2 w-full" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value, ...(e.target.value === 'Combo' ? { unidad: 'CMB', componentes: form.componentes || [] } : {}) })}>{[...new Set([...categories, form.categoria])].map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Unidad<select aria-label="Unidad" disabled={isCombo(form)} className="block border p-2 w-full" value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })}>{[...new Set([...units, form.unidad])].map(u => <option key={u}>{u}</option>)}</select></label>
        {!isCombo(form) && field('costo', 'Costo interno (S/)', 'number')}{field('precio', 'Precio de venta (S/, antes del IGV)', 'number')}{!isCombo(form) && !['Servicio', 'Servicios'].includes(form.categoria) && field('stock', 'Stock disponible', 'number')}
      </div>
      <label className="block">Descripción comercial<textarea aria-label="Descripción comercial" className="block border p-2 w-full" value={form.descripcion || ''} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></label>
      <label className="block">Notas internas (no se imprimen al cliente)<textarea aria-label="Notas internas" className="block border p-2 w-full" value={form.notasInternas || ''} onChange={e => setForm({ ...form, notasInternas: e.target.value })} /></label>
      {isCombo(form) && <ComboFields value={form} onChange={setForm} products={products} />}
      <button type="submit" className="bg-blue-700 text-white py-2 px-5 rounded font-bold">Guardar {isCombo(form) ? 'combo' : 'producto'}</button>
    </form>}
    {deleting && <div role="alertdialog" aria-label="Eliminar del catálogo" className="border border-red-300 bg-red-50 p-4 rounded space-y-2"><p>¿Eliminar «{deleting.nombre}» del catálogo? Las cotizaciones guardadas conservarán su información.</p>{dependent.length > 0 && <p>Quedará pendiente reemplazar o quitar este material en: {dependent.map(p => p.nombre).join(', ')}. Esos combos no podrán usarse hasta corregir el desglose.</p>}<button onClick={() => { if (onDelete(deleteId) !== false) setDeleteId(null); }} className="bg-red-700 text-white p-2 rounded mr-3">Confirmar eliminación</button><button onClick={() => setDeleteId(null)} className="border p-2 rounded">Cancelar eliminación</button></div>}
    <div className="bg-white border rounded-xl overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-left"><tr><th className="p-4">Producto / material / combo</th><th className="p-4">Costo interno</th><th className="p-4">Venta S/</th><th className="p-4">Stock</th><th className="p-4">Acciones</th></tr></thead><tbody>{filtered.map(p => {
      let cost = p.costo ?? p.precio; try { if (isCombo(p)) cost = componentCost(componentRows(p, products)); } catch { cost = null; }
      const missing = isCombo(p) && (!p.componentes?.length || p.componentes.some(r => !products.some(x => String(x.id) === String(r.productId)) || !(Number(r.cantidad) > 0)));
      return <tr key={p.id} className="border-t"><td className="p-4"><strong>{p.nombre}</strong><p className="text-xs text-gray-500">{p.categoria} · {p.unidad || 'UN'} {p.grupo ? '· ' + p.grupo : ''}</p><p className="text-xs max-w-lg">{p.descripcion}</p>{p.notasInternas && <details className="text-xs text-gray-500 mt-1"><summary>Notas de costo</summary>{p.notasInternas}</details>}{isCombo(p) && <p className={missing ? 'text-amber-800' : 'text-blue-700'}>{p.componentes?.length || 0} componentes · {missing ? 'Completar o reparar desglose' : 'Configurable al cotizar'}</p>}</td><td className="p-4">{cost == null ? '—' : Number(cost).toFixed(2)}</td><td className="p-4">{Number(p.precio || 0).toFixed(2)}</td><td className="p-4">{isCombo(p) ? 'Por materiales' : ['Servicio', 'Servicios'].includes(p.categoria) ? 'No aplica' : Number(p.stock || 0)}</td><td className="p-4"><div className="flex gap-3"><button aria-label={'Editar ' + p.nombre} onClick={() => open(p)} className="text-blue-700">Editar</button><button aria-label={'Eliminar ' + p.nombre} onClick={() => setDeleteId(p.id)} className="text-red-700">Eliminar</button></div></td></tr>;
    })}</tbody></table>{!filtered.length && <p className="p-6 text-gray-500">Sin resultados.</p>}</div>
  </div>;
}
