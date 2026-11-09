import { calculateQuoteTotals } from '../utils/math';
import { localDate, nonNegative, newQuoteIdentity, isPosted, validateQuote } from '../utils/business';
import { validateFieldSize } from '../../shared/dataLimits.mjs';
import { configuredCombo, isCombo, stockRequirements } from '../utils/catalog';

export function useQuoteCart(appData, setView, showToast = () => {}) {
  const { currentQuote, history, clients, workOrders, inventory, transactions, defaultConditions } = appData;
  const fail = error => { showToast(error.message || error, 'error'); return false; };
  const locked = id => isPosted(history.find(q => q.id === id)) || workOrders.some(w => w.quoteId === id);
  const apply = changes => {
    if (appData.setMany) appData.setMany(changes);
    else for (const [key, value] of Object.entries(changes)) appData['set' + key[0].toUpperCase() + key.slice(1)](value);
  };
  const edit = update => {
    if (locked(currentQuote?.id) || isPosted(currentQuote)) return fail('Esta venta ya está contabilizada. Duplica la cotización para preparar otra propuesta.');
    try { appData.setCurrentQuote(update); return true; } catch (error) { return fail(error); }
  };
  const startNewQuote = () => {
    appData.setCurrentQuote({ ...newQuoteIdentity(), fecha: localDate(), cliente: { nombre: '', ruc: '', direccion: '', contacto: '', telefono: '' },
      sections: [{ id: crypto.randomUUID(), name: 'Propuesta Principal', items: [], visible: true }], omitIgv: false,
      ganancia: 0, moneda: 'S/', observaciones: defaultConditions, status: 'Pendiente' });
    setView('creator');
  };
  const duplicateQuote = quote => {
    const copy = { ...quote }; delete copy.acceptedAt;
    appData.setCurrentQuote({ ...copy, ...newQuoteIdentity(), fecha: localDate(), status: 'Pendiente', saleRegistered: false,
      sourceQuoteId: quote.id, totalManual: null }); setView('creator');
  };
  const addItemToSection = (product, sectionId) => {
    try {
      if (!currentQuote.sections.some(s => s.id === sectionId)) throw new Error('Selecciona una sección de destino.');
      if (isCombo(product)) {
        if (product.requiereConfiguracion) throw new Error('Configura el combo antes de agregarlo.');
        product = configuredCombo(product, inventory);
      }
      const precio = nonNegative(product.precio, 'Precio');
      return edit(prev => ({ ...prev, totalManual: null, sections: prev.sections.map(s => s.id === sectionId ? { ...s,
        items: [...s.items, { ...product, precio, uid: crypto.randomUUID(), cantidad: 1, ancho: 1, alto: 1, total: precio }] } : s) }));
    } catch (error) { return fail(error); }
  };
  const updateItemInSection = (sectionId, itemUid, field, value) => {
    try {
      if (field === 'comboConfig') value = configuredCombo(value, inventory);
      const numeric = ['cantidad', 'precio', 'ancho', 'alto'].includes(field);
      const normalized = numeric ? nonNegative(value, field) : value;
      return edit(prev => ({ ...prev, totalManual: null, sections: prev.sections.map(s => s.id !== sectionId ? s : { ...s,
        items: s.items.map(item => {
          if (item.uid !== itemUid) return item;
          if (field === 'comboConfig') {
            const config = configuredCombo(value, inventory);
            return { ...item, nombre: config.nombre, descripcion: config.descripcion, componentes: config.componentes, costo: config.costo, precio: config.precio, requiereConfiguracion: false,
              total: Math.round(item.cantidad * config.precio * 100) / 100 };
          }
          const updated = { ...item, [field]: normalized };
          if (numeric) {
            if (String(updated.unidad).toLowerCase() === 'm2' && ['ancho', 'alto'].includes(field))
              updated.cantidad = Math.round(nonNegative(updated.ancho) * nonNegative(updated.alto) * 100) / 100;
            updated.cantidad = nonNegative(updated.cantidad, 'Cantidad'); updated.precio = nonNegative(updated.precio, 'Precio');
            updated.total = Math.round(updated.cantidad * updated.precio * 100) / 100;
            if (!Number.isFinite(updated.total)) throw new Error('El importe supera el límite admitido.');
          }
          return updated;
        }) }) }));
    } catch (error) { return fail(error); }
  };
  const removeItemFromSection = (id, uid) => edit(q => ({ ...q, totalManual: null, sections: q.sections.map(s => s.id === id ? { ...s, items: s.items.filter(i => i.uid !== uid) } : s) }));
  const addSection = () => edit(q => ({ ...q, sections: [...q.sections, { id: crypto.randomUUID(), name: 'Nueva Sección', items: [], visible: true }] }));
  const toggleSectionVisibility = id => edit(q => ({ ...q, totalManual: null, sections: q.sections.map(s => s.id === id ? { ...s, visible: !s.visible } : s) }));
  const updateSectionName = (id, name) => edit(q => ({ ...q, sections: q.sections.map(s => s.id === id ? { ...s, name } : s) }));
  const removeSection = id => edit(q => ({ ...q, totalManual: null, sections: q.sections.filter(s => s.id !== id) }));
  const handleClientSelect = name => edit(q => ({ ...q, cliente: clients.find(c => c.nombre === name) || { ...q.cliente, nombre: name } }));
  const clearAllItems = () => edit(q => ({ ...q, totalManual: null, ganancia: 0, sections: [{ id: crypto.randomUUID(), name: 'Propuesta Principal', items: [], visible: true }] }));
  const saveAndRegister = () => {
    if (locked(currentQuote?.id) || isPosted(currentQuote)) return fail('La venta contabilizada se conserva sin modificaciones. Puedes duplicarla.');
    try {
      validateQuote(currentQuote);
      validateFieldSize('currentQuote', currentQuote);
      const totals = calculateQuoteTotals(currentQuote);
      nonNegative(totals.totalFinal, 'Total');
      const quote = { ...currentQuote, totalManual: null, totalFinal: totals.totalFinal, subtotal: totals.subtotal, igv: totals.igv };
      const newClients = !quote.cliente.nombre ? clients : clients.some(c => c.nombre === quote.cliente.nombre)
        ? clients.map(c => c.nombre === quote.cliente.nombre ? { ...c, ...Object.fromEntries(Object.entries(quote.cliente).filter(([, v]) => v)) } : c)
        : [...clients, { ...quote.cliente, id: crypto.randomUUID() }];
      apply({ history: [quote, ...history.filter(q => q.id !== quote.id)], clients: newClients });
      showToast('Cotización registrada. Consulta el estado de sincronización.', 'success'); setView('dashboard'); return true;
    } catch (error) { return fail(error); }
  };
  const changeQuoteStatus = (id, status) => {
    const quote = history.find(q => q.id === id); if (!quote) return false;
    if (!['Pendiente', 'Rechazada', 'Aceptada'].includes(status)) return false;
    if (locked(id) || isPosted(quote)) return status === quote.status || fail('No se puede cambiar el estado de una venta contabilizada. Se conserva su trazabilidad.');
    try {
      const changes = {};
      if (status === 'Aceptada') {
        validateQuote(quote);
        const items = quote.sections.flatMap(s => s.visible ? s.items : []);
        if (!items.length) throw new Error('Añade productos antes de aceptar la cotización.');
        const totals = calculateQuoteTotals(quote);
        nonNegative(totals.totalFinal, 'Total');
        const quantities = stockRequirements(items, inventory);
        changes.inventory = inventory.map(product => {
          const qty = quantities.get(product.id); if (!qty || ['Servicio', 'Servicios'].includes(product.categoria)) return product;
          const stock = nonNegative(product.stock ?? 0, 'Stock');
          if (qty > stock) throw new Error('Stock insuficiente de ' + (product.nombre || 'producto') + '. Actualiza las existencias antes de aceptar.');
          return { ...product, stock: Math.round((stock - qty) * 100) / 100 };
        });
        changes.workOrders = [{ id: 'wo-' + id, quoteId: id, quoteNumber: quote.numero, cliente: quote.cliente?.nombre || 'S/N', fecha: localDate(), estado: 'Por Despachar',
          items: items.map(i => ({ id: i.uid || crypto.randomUUID(), nombre: i.nombre || 'Ítem sin nombre', cantidad: Number(i.cantidad), unidad: i.unidad || 'UND', despachado: false, recibido: false, isManual: false })) }, ...workOrders];
        changes.transactions = [{ id: 'sale-' + id, quoteId: id, fecha: localDate(), descripcion: `Venta Cotizacion ${quote.numero} - ${quote.cliente?.nombre || 'S/N'}`,
          monto: totals.totalFinal, tipo: 'Ingreso', categoria: 'Ventas' }, ...transactions];
      }
      changes.history = history.map(q => q.id === id ? { ...q, status, ...(status === 'Aceptada' ? { saleRegistered: true, acceptedAt: localDate(), ...calculateQuoteTotals(q) } : {}) } : q);
      apply(changes);
      if (currentQuote?.id === id) { appData.setCurrentQuote(null); setView('dashboard'); }
      return true;
    } catch (error) { return fail(error); }
  };
  const deleteQuote = id => {
    if (locked(id) || transactions.some(t => t.quoteId === id)) return fail('No se puede borrar una cotización vinculada a una venta u obra.');
    appData.setHistory(prev => prev.filter(q => q.id !== id));
    if (currentQuote?.id === id) { appData.setCurrentQuote(null); setView('dashboard'); } return true;
  };
  const updateQuoteDetails = (id, updates) => appData.setHistory(prev => prev.map(q => q.id === id ? { ...q,
    ...Object.fromEntries(Object.entries(updates).filter(([key]) => ['ubicacion', 'fechaInicio', 'fechaEntrega', 'publicidad'].includes(key))) } : q));
  return { startNewQuote, duplicateQuote, addItemToSection, updateItemInSection, removeItemFromSection, addSection, toggleSectionVisibility,
    updateSectionName, removeSection, handleClientSelect, clearAllItems, saveAndRegister, changeQuoteStatus, deleteQuote, updateQuoteDetails };
}
