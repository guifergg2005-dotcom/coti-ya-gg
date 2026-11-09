/**
 * Formatea un número como moneda peruana: S/ 1,234.56
 */
export const formatCurrency = (value) => {
  const num = parseFloat(value) || 0;
  return num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Calcula el subtotal de una sección individual (solo ítems).
 */
export const calculateSectionSubtotal = (section) => {
  if (!section || !section.items) return 0;
  return section.items.reduce((sum, item) => sum + Math.max(0, parseFloat(item.total) || 0), 0);
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


  return { subtotal: round2(subtotal), ganancia, baseImponible, igv: round2(igv), totalFinal: round2(totalFinal) };
};

/**
 * Calcula la ganancia necesaria para alcanzar un total deseado.
 */
export const reverseCalculateGanancia = (desiredTotal, itemsTotal, omitIgv) => {
  const desired = parseFloat(desiredTotal) || 0;
  const items = parseFloat(itemsTotal) || 0;
  if (omitIgv) return Math.max(0, desired - items);
  return Math.max(0, round2((desired / 1.18) - items));
};

export const calculateQuoteTotal = (quote) => calculateQuoteTotals(quote).totalFinal;
function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
