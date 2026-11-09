export const localDate = (date = new Date()) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const isOverdue = (date, today = localDate()) => /^\d{4}-\d{2}-\d{2}$/.test(date || '') && date < today;
export function futureDate(months, now = new Date()) {
  const day = now.getDate(), result = new Date(now);
  result.setDate(1); result.setMonth(result.getMonth() + months);
  const last = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, last)); return localDate(result);
}
export const whatsappUrl = text => 'https://api.whatsapp.com/send?' + new URLSearchParams({ text }).toString();
export function nonNegative(value, label = 'Valor') {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || !Number.isSafeInteger(Math.round(number * 100))) throw new Error(label + ': introduce un número válido mayor o igual a cero, dentro del límite admitido.');
  return number;
}
export function newQuoteIdentity() {
  const id = crypto.randomUUID();
  // Conserva los 128 bits del UUID y funciona sin contador ni conexión.
  return { id, numero: 'COT-' + new Date().getFullYear() + '-' + BigInt('0x' + id.replaceAll('-', '')).toString(36).toUpperCase() };
}
export const isPosted = quote => !!quote && (quote.saleRegistered || quote.status === 'Aceptada');
export function validateQuote(quote) {
  for (const section of quote.sections || []) for (const item of section.items || []) {
    const quantity = nonNegative(item.cantidad, 'Cantidad');
    nonNegative(item.precio, 'Precio');
    if (section.visible && quantity <= 0) throw new Error('Las partidas visibles deben tener una cantidad mayor que cero.');
  }
  nonNegative(quote.ganancia ?? 0, 'Ganancia');
}
