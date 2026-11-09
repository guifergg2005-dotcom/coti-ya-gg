import { doc, collection, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS, CONFIG_FIELDS, equal } from './syncModel';
export function subscribeRemote(username, onData, onError) {
  const root = doc(db, 'user_data', username);
  const unsubscribe = [onSnapshot(root, { includeMetadataChanges: true }, snap => {
    if (snap.metadata.hasPendingWrites) return;
    const data = snap.exists() ? snap.data() : {};
    for (const field of CONFIG_FIELDS) onData(field, data[field] ?? (field === 'defaultConditions' ? '' : null), snap.metadata.fromCache);
  }, onError)];
  for (const [field, name] of Object.entries(COLLECTIONS)) {
    unsubscribe.push(onSnapshot(collection(root, name), { includeMetadataChanges: true }, snap => {
      if (snap.metadata.hasPendingWrites) return;
      onData(field, snap.docs.map(d => ({ ...d.data(), id: d.data().id ?? d.id })), snap.metadata.fromCache);
    }, onError));
  }
  return () => unsubscribe.forEach(fn => fn());
}
export async function saveToFirebase(username, changes) {
  if (!changes.length) return;
  const root = doc(db, 'user_data', username);
  // Una transacción evita sobrescribir silenciosamente cambios de otro equipo.
  // El máximo evita guardar parcialmente una operación que exceda Firestore.
  if (changes.length > 400) throw new Error('Demasiados cambios pendientes. Exporta una copia antes de continuar.');
  await runTransaction(db, async transaction => {
    const refs = new Map();
    for (const op of changes) {
      const key = COLLECTIONS[op.field] ? op.field + ':' + op.id : 'config';
      if (!refs.has(key)) refs.set(key, COLLECTIONS[op.field] ? doc(collection(root, COLLECTIONS[op.field]), op.id) : root);
    }
    const snapshots = new Map(await Promise.all([...refs].map(async ([key, ref]) => [key, await transaction.get(ref)])));
    const config = {};
    for (const op of changes) {
      const key = COLLECTIONS[op.field] ? op.field + ':' + op.id : 'config';
      const snap = snapshots.get(key);
      let actual = COLLECTIONS[op.field] ? (snap.exists() ? { ...snap.data(), id: snap.data().id ?? snap.id } : null)
        : (snap.data()?.[op.field] ?? (op.field === 'defaultConditions' ? '' : null));
      if (!equal(actual, op.before) && !equal(actual, op.value)) {
        throw new Error('Conflicto: otro equipo modificó ' + op.field + '. Exporta tus cambios y vuelve a cargar antes de continuar.');
      }
      if (COLLECTIONS[op.field]) {
        if (op.value === null) transaction.delete(refs.get(key));
        else transaction.set(refs.get(key), op.value);
      } else config[op.field] = op.value;
    }
    if (Object.keys(config).length) transaction.set(root, config, { merge: true });
  });
}
