import { nonNegative } from './business';

export const money = value => Math.round(nonNegative(value, 'Importe') * 100) / 100;
export const isCombo = product => product?.categoria === 'Combo';
export function componentRows(combo, products, refresh = false) {
  return (combo.componentes || []).map(row => {
    const product = products.find(p => String(p.id) === String(row.productId));
    return { ...row, nombre: product?.nombre || row.nombre || 'Material eliminado', unidad: product?.unidad || row.unidad || 'UN',
      costo: refresh || row.costo === undefined ? (product?.costo ?? product?.precio ?? 0) : row.costo };
  });
}
export function componentCost(rows) {
  return money(rows.reduce((sum, row) => sum + money(nonNegative(row.cantidad, 'Cantidad') * nonNegative(row.costo, 'Costo')), 0));
}
export function validateComponents(rows, products) {
  if (!Array.isArray(rows) || !rows.length) throw new Error('Agrega al menos un material o servicio al combo.');
  if (rows.length > 100) throw new Error('Un combo admite hasta 100 componentes.');
  const ids = new Set();
  return rows.map(row => {
    const product = products.find(p => String(p.id) === String(row.productId));
    if (!product) throw new Error('Falta un material del combo. Reemplázalo o quítalo del desglose.');
    if (isCombo(product)) throw new Error('Usa materiales o servicios directamente; no se permiten combos dentro de otros combos.');
    if (ids.has(String(product.id))) throw new Error('Material repetido: ' + product.nombre + '. Agrupa su cantidad en una sola fila.');
    ids.add(String(product.id));
    const cantidad = nonNegative(row.cantidad, 'Cantidad de ' + product.nombre);
    if (cantidad <= 0) throw new Error('Completa la cantidad de ' + product.nombre + ' o quita ese componente.');
    return { productId: product.id, nombre: product.nombre, unidad: product.unidad || 'UN', categoria: product.categoria || 'Producto', cantidad, costo: money(row.costo ?? product.costo ?? product.precio ?? 0) };
  });
}
export function configuredCombo(product, products) {
  if (!String(product.nombre || '').trim()) throw new Error('Introduce el nombre del combo.');
  const componentes = validateComponents(product.componentes, products);
  return { ...product, componentes, costo: componentCost(componentes), precio: money(product.precio), requiereConfiguracion: false };
}
export function normalizeProduct(product, products) {
  if (!String(product.nombre || '').trim()) throw new Error('Introduce el nombre del producto.');
  const base = { ...product, nombre: product.nombre.trim(), costo: money(product.costo ?? product.precio ?? 0), precio: money(product.precio), stock: nonNegative(product.stock ?? 0, 'Stock') };
  if (isCombo(base)) return { ...configuredCombo(base, products), unidad: 'CMB', stock: 0 };
  delete base.componentes; delete base.requiereConfiguracion;
  return base;
}
// Uses the saved bill of materials, never today's edited combo recipe.
export function stockRequirements(items, products) {
  const quantities = new Map();
  const add = (id, qty, name) => {
    const product = products.find(p => String(p.id) === String(id));
    if (!product) throw new Error('El material ' + (name || id) + ' fue eliminado. Duplica y actualiza la propuesta antes de aceptarla.');
    if (isCombo(product)) throw new Error('Este combo antiguo no tiene desglose. Duplica y configura la propuesta.');
    if (!['Servicio', 'Servicios'].includes(product.categoria)) quantities.set(product.id, nonNegative((quantities.get(product.id) || 0) + qty, 'Cantidad total'));
  };
  for (const item of items) {
    const cantidad = nonNegative(item.cantidad, 'Cantidad');
    if (isCombo(item)) {
      if (item.requiereConfiguracion) throw new Error('Configura el combo antes de aceptar la cotización.');
      const rows = validateComponents(item.componentes, products);
      rows.forEach(row => add(row.productId, nonNegative(row.cantidad * cantidad), row.nombre));
    } else if (item.id != null) add(item.id, cantidad, item.nombre);
  }
  return quantities;
}
