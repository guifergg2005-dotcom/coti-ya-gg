import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, DollarSign, FileText, Search } from 'lucide-react';
import { calculateQuoteTotals, formatCurrency } from '../utils/math';
import ComboConfigurator from './ComboConfigurator';
import { isCombo } from '../utils/catalog';

export default function QuoteBuilder({ quote, setQuote, products, clients, onAddItem, onUpdateItem, onRemoveItem, onAddSection, onToggleSection, onUpdateSectionName, onRemoveSection, onClear, onClientSelect, onPreview }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeSectionId, setActiveSectionId] = useState(quote.sections[0]?.id || null);
  const [deleteSectionId, setDeleteSectionId] = useState(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [comboEditing, setComboEditing] = useState(null);

  // --- Motor financiero centralizado (single source of truth) ---
  const { subtotal, igv, totalFinal } = calculateQuoteTotals(quote);
  const categories = [...new Set(products.map(p => p.categoria).filter(Boolean))];
  const filteredProducts = products.filter(p =>
    (!categoryFilter || p.categoria === categoryFilter) &&
    [p.nombre, p.descripcion, p.grupo].filter(Boolean).join(' ').toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (quote.sections.length > 0 && !quote.sections.find(s => s.id === activeSectionId)) {
      setActiveSectionId(quote.sections[0].id);
    } else if (!activeSectionId && quote.sections.length > 0) {
      setActiveSectionId(quote.sections[0].id);
    }
  }, [quote.sections, activeSectionId]);

  const handleClear = () => {
    if (clearConfirm) { onClear(); setClearConfirm(false); }
    else { setClearConfirm(true); setTimeout(() => setClearConfirm(false), 3000); }
  };

  const handleRemoveSection = (id) => {
    if (deleteSectionId === id) { onRemoveSection(id); setDeleteSectionId(null); }
    else { setDeleteSectionId(id); setTimeout(() => setDeleteSectionId(null), 3000); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* ===== COLUMNA PRINCIPAL ===== */}
      <div className="lg:col-span-2 space-y-6">
        <p className="text-sm text-blue-900 bg-blue-50 rounded-lg p-3">Borrador en este dispositivo. Usa «Previsualizar PDF» y «Guardar» para registrar la cotización y verla también en tus otros equipos.</p>

        {/* --- DATOS DEL CLIENTE --- */}
        <div key={quote.id + quote.cliente.nombre} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-blue-800">
            <Users className="h-5 w-5" /> Datos del Cliente
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Empresa</label>
              <input list="client-list" className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all" defaultValue={quote.cliente.nombre} onBlur={(e) => onClientSelect(e.target.value)} placeholder="Buscar o escribir..." />
              <datalist id="client-list">{clients.map((c, i) => <option key={i} value={c.nombre} />)}</datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">RUC / DNI</label>
              <input className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all" defaultValue={quote.cliente.ruc} onBlur={(e) => setQuote({...quote, cliente: {...quote.cliente, ruc: e.target.value}})} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Dirección</label>
              <input className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all" defaultValue={quote.cliente.direccion} onBlur={(e) => setQuote({...quote, cliente: {...quote.cliente, direccion: e.target.value}})} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Atención</label>
              <input className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all" defaultValue={quote.cliente.contacto} onBlur={(e) => setQuote({...quote, cliente: {...quote.cliente, contacto: e.target.value}})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Teléfono / Celular</label>
              <input className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all" defaultValue={quote.cliente.telefono || ''} onBlur={(e) => setQuote({...quote, cliente: {...quote.cliente, telefono: e.target.value}})} placeholder="Ej: 999 888 777" />
            </div>
          </div>
        </div>

        {/* --- SECCIONES DE PRODUCTOS --- */}
        <div className="space-y-6">
          {quote.sections.map((section) => (
            <div key={section.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all ${section.visible ? 'border-l-4 border-l-cyan-500' : 'border-l-4 border-l-gray-300 opacity-60'}`}>
              {/* Header de Sección */}
              <div className="flex flex-wrap justify-between items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50/50 border-b border-gray-100">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
                    <input type="checkbox" checked={section.visible} onChange={() => onToggleSection(section.id)} className="h-4 w-4 text-blue-600 rounded cursor-pointer accent-cyan-500" />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${section.visible ? 'text-cyan-600' : 'text-gray-400'}`}>
                      {section.visible ? 'Visible' : 'Oculto'}
                    </span>
                  </label>
                  <input
                    className="font-bold text-sm sm:text-base text-blue-900 border-b-2 border-transparent hover:border-blue-200 focus:border-blue-500 outline-none bg-transparent px-2 py-1 transition-colors min-w-0 flex-1"
                    defaultValue={section.name}
                    onBlur={(e) => onUpdateSectionName(section.id, e.target.value)}
                  />
                </div>
                <button onClick={() => handleRemoveSection(section.id)} className={`px-2 py-1 rounded-lg transition-all shrink-0 ${deleteSectionId === section.id ? 'bg-red-100 text-red-600 shadow-sm' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}>
                  {deleteSectionId === section.id ? <span className="text-xs font-bold px-1">¿Confirmar?</span> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>

              {/* Tabla de Ítems */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="p-3 text-left font-semibold">Descripción</th>
                      <th className="p-3 w-28 text-center font-semibold">Cantidad</th>
                      <th className="p-3 w-28 text-center font-semibold">P. Unitario</th>
                      <th className="p-3 w-24 text-right font-semibold">Total</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody key={"tbody-" + section.id + "-" + quote.id} className="divide-y divide-gray-100">
                    {section.items.length === 0 && (
                      <tr><td colSpan="5" className="p-6 text-center text-gray-400 text-xs italic">Sección vacía — selecciona productos del catálogo →</td></tr>
                    )}
                    {section.items.map((item) => (
                      <tr key={item.uid} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-3">
                          <input className="w-full font-semibold bg-transparent outline-none mb-1 text-blue-900 text-sm" key={item.nombre} defaultValue={item.nombre} onBlur={(e) => onUpdateItem(section.id, item.uid, 'nombre', e.target.value)} />
                          <textarea className="w-full text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100 hover:border-gray-300 focus:border-blue-300 focus:ring-1 focus:ring-blue-100 resize-none outline-none transition-all" key={item.descripcion} defaultValue={item.descripcion} rows={2} onBlur={(e) => onUpdateItem(section.id, item.uid, 'descripcion', e.target.value)} />
                          {isCombo(item) && <button className="text-blue-700 text-xs underline" onClick={() => setComboEditing({ product: item, sectionId: section.id, existing: true })}>Editar desglose interno del combo</button>}
                        </td>
                        <td className="p-3 align-top">
                          {item.unidad === 'M2' || item.unidad === 'm2' ? (
                            <div className="flex flex-col gap-1.5 items-center">
                              <div className="flex items-center gap-1 text-xs w-full justify-center">
                                <input type="number" min="0" className="w-14 border border-gray-300 rounded-lg p-1.5 text-center text-xs bg-white focus:ring-1 focus:ring-blue-200 outline-none" placeholder="A" defaultValue={Number.isNaN(item.ancho) ? '' : item.ancho} onBlur={(e) => { if (onUpdateItem(section.id, item.uid, 'ancho', e.target.value) === false) e.target.value = item.ancho; }} step="0.01" />
                                <span className="text-gray-400 font-bold text-xs">×</span>
                                <input type="number" min="0" className="w-14 border border-gray-300 rounded-lg p-1.5 text-center text-xs bg-white focus:ring-1 focus:ring-blue-200 outline-none" placeholder="H" defaultValue={Number.isNaN(item.alto) ? '' : item.alto} onBlur={(e) => { if (onUpdateItem(section.id, item.uid, 'alto', e.target.value) === false) e.target.value = item.alto; }} step="0.01" />
                              </div>
                              <div className="bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 text-center">
                                <span className="text-[10px] text-blue-500 font-bold">{(parseFloat(item.cantidad) || 0).toFixed(2)} m²</span>
                              </div>
                            </div>
                          ) : (
                            <input type="number" min="0" className="w-full border border-gray-300 rounded-lg p-1.5 text-center text-sm focus:ring-1 focus:ring-blue-200 outline-none" defaultValue={Number.isNaN(item.cantidad) ? '' : item.cantidad} onBlur={(e) => { if (onUpdateItem(section.id, item.uid, 'cantidad', e.target.value) === false) e.target.value = item.cantidad; }} />
                          )}
                        </td>
                        <td className="p-3 align-top">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">S/</span>
                            <input type="number" min="0" className="w-full border border-gray-300 rounded-lg p-1.5 pl-7 text-right text-sm focus:ring-1 focus:ring-blue-200 outline-none" key={item.precio} defaultValue={Number.isNaN(item.precio) ? '' : item.precio} onBlur={(e) => { if (onUpdateItem(section.id, item.uid, 'precio', e.target.value) === false) e.target.value = item.precio; }} />
                          </div>
                        </td>
                        <td className="p-3 text-right font-bold align-top text-sm text-gray-800">
                          S/ {formatCurrency(item.total || 0)}
                        </td>
                        <td className="p-3 align-top">
                          <button onClick={() => onRemoveItem(section.id, item.uid)} className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <button onClick={onAddSection} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex justify-center items-center gap-2 group">
            <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" /> Agregar Nueva Sección
          </button>
        </div>

        {/* --- RESUMEN FINANCIERO --- */}
        <div className="flex justify-end">
          <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-5">
              <button onClick={handleClear} disabled={quote.sections.every(s => s.items.length === 0)} className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all font-semibold ${clearConfirm ? 'bg-red-600 text-white border-red-600 shadow-md' : 'text-red-400 border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed'}`}>
                <Trash2 className="h-3 w-3" /> {clearConfirm ? '¿Confirmar Limpieza?' : 'Limpiar Todo'}
              </button>
            </div>

            <div className="space-y-3">
              {/* Ganancia Oculta */}
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-1.5 text-green-700 font-bold text-xs">
                  <DollarSign className="h-4 w-4" /> Ganancia (Oculta):
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-green-600 text-xs font-medium">S/</span>
                  <input type="number" min="0" step="0.01" className="w-24 p-1.5 border border-green-300 rounded-lg text-right font-bold text-green-700 text-sm bg-white focus:ring-1 focus:ring-green-200 outline-none" defaultValue={Number.isNaN(quote.ganancia) ? '' : quote.ganancia} onBlur={(e) => { const val = Math.max(0, Math.round((parseFloat(e.target.value) || 0) * 100) / 100); e.target.value = val; setQuote({ ...quote, ganancia: val, totalManual: null }); }} />
                </div>
              </div>

              {/* Subtotal */}
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Subtotal (Visibles):</span>
                <span className="font-semibold">S/ {formatCurrency(subtotal)}</span>
              </div>

              {/* Checkbox IGV */}
              <div className="flex justify-end">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" id="omitIgv" checked={quote.omitIgv || false} onChange={(e) => {
    // Al omitir/restaurar IGV, debemos borrar el totalManual para que el motor recalcule desde 0 el nuevo total real
    setQuote({ ...quote, omitIgv: e.target.checked, totalManual: null });
}} className="accent-blue-600 h-3.5 w-3.5" />
                  <span className="text-gray-600 text-xs font-medium">Omitir IGV (18%)</span>
                </label>
              </div>

              {/* IGV */}
              {!quote.omitIgv && (
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>IGV (18%):</span>
                  <span className="font-semibold">S/ {formatCurrency(igv)}</span>
                </div>
              )}

              {/* Total Final */}
              <div className="flex justify-between items-center pt-3 border-t-2 border-blue-200">
                <span className="text-lg font-extrabold text-blue-900">Total Final:</span>
                <span className="text-lg font-extrabold text-blue-900">S/ {formatCurrency(totalFinal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra rápida móvil para previsualizar PDF sin subir al catálogo */}
        <div className="lg:hidden sticky bottom-2 z-30 bg-white/95 backdrop-blur border border-blue-200 p-3 rounded-xl shadow-lg flex items-center justify-between gap-3">
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400">Total Cotización</span>
            <span className="text-base font-extrabold text-blue-900">S/ {formatCurrency(totalFinal)}</span>
          </div>
          <button onClick={onPreview} disabled={quote.sections.every(s => s.items.length === 0)} className="bg-gradient-to-r from-blue-600 to-blue-700 disabled:from-gray-300 disabled:to-gray-300 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 disabled:shadow-none">
            <FileText className="h-4 w-4" /> Ver PDF
          </button>
        </div>
      </div>

      {/* ===== BARRA LATERAL: CATÁLOGO ===== */}
      <div className="space-y-4 quote-catalog">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-[calc(100vh-100px)] sticky top-4 flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-gray-700 mb-3 text-base">Catálogo</h3>
            <div className="mb-3 bg-blue-50 p-2.5 rounded-lg border border-blue-100">
              <label className="text-[10px] uppercase font-bold text-blue-500 block mb-1 tracking-wider">Destino:</label>
              <select aria-label="Sección de destino" className="w-full text-xs p-1.5 border border-blue-200 rounded-lg font-bold text-blue-900 outline-none bg-white focus:ring-1 focus:ring-blue-300" value={activeSectionId || ''} onChange={(e) => setActiveSectionId(quote.sections.find(s => String(s.id) === e.target.value)?.id ?? null)}>
                {quote.sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Buscar producto..." className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <select aria-label="Filtrar catálogo por categoría" className="w-full text-xs p-2 border border-gray-200 rounded-lg text-gray-700 bg-gray-50 outline-none focus:ring-1 focus:ring-blue-200" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">Todas las categorías ({products.length})</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredProducts.length === 0 && (
              <p className="text-center text-gray-400 text-xs mt-8 italic">No se encontraron productos.</p>
            )}
            {filteredProducts.map(p => (
              <div key={p.id} onClick={() => isCombo(p) ? setComboEditing({ product: p, sectionId: activeSectionId, existing: false }) : onAddItem(p, activeSectionId)} className="p-3 border border-gray-200 rounded-lg hover:border-blue-400 cursor-pointer group hover:bg-blue-50/50 hover:shadow-sm transition-all">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-800 group-hover:text-blue-900 transition-colors truncate">{p.nombre}</p>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{p.descripcion}</p>
                    {isCombo(p) && <p className="text-xs text-blue-700">Configurar materiales y precio →</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap">S/ {formatCurrency(p.precio)}</span>
                    <span className="text-[9px] text-gray-400 font-bold bg-gray-100 px-1.5 py-0.5 rounded">{p.unidad || 'UN'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button onClick={onPreview} disabled={quote.sections.every(s => s.items.length === 0)} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-300 text-white py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex justify-center gap-2 disabled:shadow-none disabled:cursor-not-allowed">
              <FileText className="h-5 w-5" /> Previsualizar PDF
            </button>
          </div>
        </div>
      </div>
      {comboEditing && <ComboConfigurator key={comboEditing.product.uid || comboEditing.product.id} product={comboEditing.product} products={products} existing={comboEditing.existing} onClose={() => setComboEditing(null)} onSave={value => comboEditing.existing ? onUpdateItem(comboEditing.sectionId, comboEditing.product.uid, 'comboConfig', value) : onAddItem(value, comboEditing.sectionId)} />}
    </div>
  );
}
