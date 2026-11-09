export const COLLECTIONS = { clients: 'clients', history: 'history', inventory: 'inventory', transactions: 'transactions', workOrders: 'work_orders', reminders: 'reminders' };
export const LOCAL_FIELDS = ['currentQuote'];
export const CONFIG_FIELDS = ['pdfConfig', 'defaultConditions'];
export const FIELDS = [...Object.keys(COLLECTIONS), ...LOCAL_FIELDS, ...CONFIG_FIELDS];
export const clone = value => JSON.parse(JSON.stringify(value));
export const canonical = value => JSON.stringify(value, (_, v) => v && !Array.isArray(v) && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
export const equal = (a, b) => canonical(a) === canonical(b);
export function itemKey(item) {
  const id = item?.id ?? item?.uid;
  if (id === undefined || id === null || String(id) === '' || String(id).includes('/')) throw new Error('Registro sin identificador válido.');
  return String(id);
}
export function makeChanges(field, before, after, nextVersion) {
  if (!COLLECTIONS[field]) return equal(before, after) ? [] : [{ field, id: null, before, value: after, version: nextVersion() }];
  const old = new Map(before.map(x => [itemKey(x), x]));
  const current = new Map(after.map(x => [itemKey(x), x]));
  if (current.size !== after.length) throw new Error('Hay identificadores duplicados.');
  const changes = [];
  for (const id of new Set([...old.keys(), ...current.keys()])) {
    const a = old.get(id) ?? null, b = current.get(id) ?? null;
    if (!equal(a, b)) changes.push({ field, id, before: a, value: b, version: nextVersion() });
  }
  return changes;
}
export const changeKey = change => change.field + ':' + (change.id ?? '');
export function overlay(data, pending) {
  const result = clone(data);
  for (const op of Object.values(pending)) {
    if (!COLLECTIONS[op.field]) { result[op.field] = op.value; continue; }
    const items = result[op.field].filter(item => itemKey(item) !== op.id);
    if (op.value !== null) items.push(op.value);
    result[op.field] = items;
  }
  return result;
}
