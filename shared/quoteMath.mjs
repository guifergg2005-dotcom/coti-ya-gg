/**
 * Formatea un número como moneda peruana: S/ 1,234.56
 */
export const formatCurrency = (value) => {
  const num = parseFloat(value) || 0;
  return num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Calcula el subtotal base de inventario de una sección individual (solo ítems).
 */
export const calculateSectionSubtotal = (section) => {
  if (!section || !section.items) return 0;
  return round2(section.items.reduce((sum, item) => sum + Math.max(0, parseFloat(item.total) || 0), 0));
};

/**
 * Calcula TODOS los totales de una cotización con redondeo monetario.
 */
export const calculateQuoteTotals = (quote) => {
  if (!quote || !quote.sections) return { subtotal: 0, ganancia: 0, baseImponible: 0, igv: 0, totalFinal: 0 };
  // Una actualización de software no debe reescribir importes ya contabilizados.
  if ((quote.saleRegistered || quote.status === 'Aceptada') && Number.isFinite(quote.totalFinal) && Number.isFinite(quote.igv)) {
    const base = round2(quote.totalFinal - quote.igv);
    return { subtotal: round2(quote.subtotal ?? base), ganancia: Number(quote.ganancia) || 0, baseImponible: base, igv: quote.igv, totalFinal: quote.totalFinal };
  }

  let subtotal = 0;
  quote.sections.forEach(section => {
    if (section.visible) subtotal += calculateSectionSubtotal(section);
  });

  const ganancia = Math.max(0, parseFloat(quote.ganancia) || 0);
  const baseImponible = round2(subtotal + ganancia);
  
  // El IGV siempre corresponde al porcentaje de la base; nunca absorbe descuentos ocultos.
  let totalFinal = round2(baseImponible * (quote.omitIgv ? 1 : 1.18));
  let igv = quote.omitIgv ? 0 : round2(baseImponible * 0.18);

  return { subtotal: round2(subtotal), ganancia: round2(ganancia), baseImponible, igv: round2(igv), totalFinal: round2(totalFinal) };
};

/**
 * Calcula el Sub Total comercial que se muestra en cada tabla/sección visible,
 * garantizando que la suma de los subtotales de las tablas coincida con baseImponible
 * y que la diferencia frente al inventario sea la ganancia.
 */
export const calculateSectionDisplaySubtotals = (quote) => {
  if (!quote || !Array.isArray(quote.sections)) return [];
  const totals = calculateQuoteTotals(quote);
  const visible = quote.sections.filter(s => s.visible);
  if (!visible.length) return [];

  const entries = visible.map(section => {
    const inventorySubtotal = calculateSectionSubtotal(section);
    const hasManual = section.subtotalManual !== undefined && section.subtotalManual !== null && section.subtotalManual !== '' && Number.isFinite(Number(section.subtotalManual));
    const displaySubtotal = hasManual ? Math.max(inventorySubtotal, round2(Number(section.subtotalManual))) : inventorySubtotal;
    return {
      sectionId: section.id,
      name: section.name || section.nombre || 'Propuesta',
      inventorySubtotal,
      displaySubtotal,
      ganancia: round2(displaySubtotal - inventorySubtotal)
    };
  });

  const currentSum = round2(entries.reduce((acc, e) => acc + e.displaySubtotal, 0));
  const diff = round2(totals.baseImponible - currentSum);
  if (Math.abs(diff) >= 0.01 && entries.length > 0) {
    entries[0].displaySubtotal = Math.max(0, round2(entries[0].displaySubtotal + diff));
    entries[0].ganancia = round2(entries[0].displaySubtotal - entries[0].inventorySubtotal);
  }

  return entries;
};

/**
 * Actualiza el Sub Total comercial de una tabla/sección y recalcula la ganancia total
 * como la diferencia entre el total de las tablas (PDF sin IGV) y los precios de inventario.
 */
export const applySectionSubtotal = (quote, sectionId, newSectionSubtotal) => {
  if (!quote || !Array.isArray(quote.sections)) return quote;
  const currentEntries = calculateSectionDisplaySubtotals(quote);
  const displayMap = new Map(currentEntries.map(e => [e.sectionId, e.displaySubtotal]));

  const sections = quote.sections.map(s => {
    if (!s.visible) return s;
    const inv = calculateSectionSubtotal(s);
    if (s.id === sectionId) {
      const desired = round2(Math.max(inv, parseFloat(newSectionSubtotal) || 0));
      return { ...s, subtotalManual: desired };
    }
    const existingDisplay = displayMap.has(s.id) ? displayMap.get(s.id) : inv;
    return { ...s, subtotalManual: Math.max(inv, round2(existingDisplay)) };
  });

  const visibleSections = sections.filter(s => s.visible);
  const totalInventory = round2(visibleSections.reduce((sum, s) => sum + calculateSectionSubtotal(s), 0));
  const totalTables = round2(visibleSections.reduce((sum, s) => sum + Math.max(calculateSectionSubtotal(s), round2(Number(s.subtotalManual ?? calculateSectionSubtotal(s)))), 0));
  const ganancia = Math.max(0, round2(totalTables - totalInventory));

  return { ...quote, sections, ganancia, totalManual: null };
};

/**
 * Sincroniza la ganancia cuando cambian los ítems de inventario y alguna tabla tiene un Sub Total fijado.
 */
export const syncQuoteGananciaFromSections = (quote) => {
  if (!quote || !Array.isArray(quote.sections)) return quote;
  const visible = quote.sections.filter(s => s.visible);
  const hasAnyManual = visible.some(s => s.subtotalManual !== undefined && s.subtotalManual !== null && s.subtotalManual !== '' && Number.isFinite(Number(s.subtotalManual)));
  if (!hasAnyManual) return quote;

  const sections = quote.sections.map(s => {
    if (!s.visible || s.subtotalManual === undefined || s.subtotalManual === null || s.subtotalManual === '') return s;
    const inv = calculateSectionSubtotal(s);
    return { ...s, subtotalManual: Math.max(inv, round2(Number(s.subtotalManual))) };
  });

  const visibleUpdated = sections.filter(s => s.visible);
  const totalInventory = round2(visibleUpdated.reduce((sum, s) => sum + calculateSectionSubtotal(s), 0));
  const totalTables = round2(visibleUpdated.reduce((sum, s) => {
    const inv = calculateSectionSubtotal(s);
    const hasManual = s.subtotalManual !== undefined && s.subtotalManual !== null && s.subtotalManual !== '' && Number.isFinite(Number(s.subtotalManual));
    return sum + (hasManual ? Math.max(inv, round2(Number(s.subtotalManual))) : inv);
  }, 0));
  const ganancia = Math.max(0, round2(totalTables - totalInventory));

  return { ...quote, sections, ganancia, totalManual: null };
};

/**
 * Calcula la ganancia necesaria para alcanzar un total deseado.
 */
export const reverseCalculateGanancia = (desiredTotal, itemsTotal, omitIgv) => {
  const desired = parseFloat(desiredTotal) || 0;
  const items = parseFloat(itemsTotal) || 0;
  if (omitIgv) return Math.max(0, round2(desired - items));
  return Math.max(0, round2((desired / 1.18) - items));
};

export const calculateQuoteTotal = (quote) => calculateQuoteTotals(quote).totalFinal;
function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
