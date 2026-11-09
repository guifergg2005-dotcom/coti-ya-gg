import { FIELDS, COLLECTIONS, LOCAL_FIELDS, clone, makeChanges, changeKey, overlay } from './syncModel';
import { validateFieldSize } from '../../shared/dataLimits.mjs';
export function createSyncEngine({ username, defaults, storage, subscribeRemote, commit, delay = 300, onError = console.error }) {
  const storageKey = 'coti:v3:' + encodeURIComponent(username);
  let cached;
  try { cached = JSON.parse(storage.getItem(storageKey) || 'null'); } catch { cached = null; }
  if (cached && (!cached.base || !cached.pending || Object.keys(COLLECTIONS).some(field => !Array.isArray(cached.base[field])))) cached = null;
  let base = { ...clone(defaults), ...(cached?.base || {}) };
  let pending = cached?.pending || {};
  // Migrate an unsent draft from v3 without publishing it over another device's work.
  for (const [key, op] of Object.entries(pending)) if (LOCAL_FIELDS.includes(op.field)) { base[op.field] = op.value; delete pending[key]; }
  const renderData = () => { const data = overlay(base, pending); for (const field of ['currentQuote', 'pdfConfig']) if (data[field] === null) data[field] = clone(defaults[field]); return data; };
  let sequence = Math.max(0, ...Object.values(pending).map(op => op.version || 0));
  let view = { data: renderData(), saveStatus: Object.keys(pending).length ? 'offline' : 'loading', cloudError: null, isReady: !!cached };
  let active = false, started = false, online = true, generation = 0, timer, inflight = false, inflightPromise, cloudFatal = false, writeError = false, unsub = () => {};
  const ready = new Set(), listeners = new Set();
  function emit() { view = { ...view, data: renderData() }; listeners.forEach(fn => fn(view)); }
  function persist() {
    try { storage.setItem(storageKey, JSON.stringify({ base, pending })); return true; }
    catch (error) { view.cloudError = 'No se pudo guardar el respaldo local. Libera espacio y exporta una copia.'; onError(error); return false; }
  }
  function schedule() { clearTimeout(timer); if (active) timer = setTimeout(flush, delay); }
  function flush() { if (inflight) return; inflightPromise = runFlush(); return inflightPromise; }
  async function runFlush() {
    if (!active || !online || cloudFatal || inflight || ready.size !== FIELDS.length || !Object.keys(pending).length) return;
    inflight = true;
    const sent = clone(pending);
    view.saveStatus = 'saving'; emit();
    try {
      await commit(username, Object.values(sent));
      for (const [key, op] of Object.entries(sent)) {
        // Aplicar solo lo confirmado; conservar cambios hechos durante la escritura.
        base = overlay(base, { [key]: op });
        if (pending[key]?.version === op.version) delete pending[key];
        else if (pending[key]) pending[key] = { ...pending[key], before: op.value };
      }
      const localOK = persist();
      writeError = false;
      view.saveStatus = !localOK || cloudFatal ? 'error' : !online ? 'offline' : Object.keys(pending).length ? 'saving' : 'saved';
      if (localOK && !cloudFatal) view.cloudError = null;
    } catch (error) {
      writeError = true;
      view.saveStatus = error.code === 'unavailable' ? 'offline' : 'error';
      view.cloudError = error.message || 'No se pudo guardar en la nube. Los cambios siguen en el respaldo local.';
      onError(error); persist();
    } finally {
      inflight = false;
      if (active) { emit(); if (view.saveStatus === 'saving') schedule(); }
    }
  }
  const engine = {
    getSnapshot: () => view,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    start() {
      if (started) return;
      started = true; active = true;
      ready.clear(); cloudFatal = false;
      LOCAL_FIELDS.forEach(field => ready.add(field));
      const run = ++generation;
      unsub = subscribeRemote(username, (field, value, fromCache) => {
        if (!active || !online || cloudFatal || run !== generation || LOCAL_FIELDS.includes(field)) return;
        // No tomar una caché vacía como confirmación de la carga remota.
        if (fromCache) return;
        base[field] = value;
        ready.add(field);
        if (ready.size === FIELDS.length) {
          view.isReady = true;
          if (!writeError) { view.saveStatus = Object.keys(pending).length ? 'saving' : 'saved'; view.cloudError = null; }
          if (!persist()) view.saveStatus = 'error'; schedule();
        }
        emit();
      }, error => {
        if (!active || run !== generation) return;
        cloudFatal = true; ready.clear(); clearTimeout(timer);
        view.saveStatus = 'error';
        view.cloudError = 'No se pudo cargar la nube. ' + (error.message || 'Comprueba tu conexión.');
        view.isReady = view.isReady || !!cached;
        onError(error); emit();
      });
    },
    set(field, update) {
      return engine.setMany({ [field]: update });
    },
    setMany(updates) {
      if (!active || !view.isReady) return;
      const next = { ...pending };
      const nextBase = { ...base };
      for (const [field, update] of Object.entries(updates)) {
        if (!FIELDS.includes(field)) throw new Error('Campo desconocido.');
        const before = view.data[field];
        let after = typeof update === 'function' ? update(clone(before)) : update;
        validateFieldSize(field, after);
        if (LOCAL_FIELDS.includes(field)) { nextBase[field] = clone(after); continue; }
        if (COLLECTIONS[field]) {
          if (!Array.isArray(after)) throw new Error('Se esperaba una lista.');
          after = after.map(item => item.id == null && item.uid == null ? { ...item, id: crypto.randomUUID() } : item);
        }
        for (const op of makeChanges(field, before, after, () => ++sequence)) {
          const key = changeKey(op);
          next[key] = { ...op, before: pending[key] ? pending[key].before : COLLECTIONS[field] ? op.before : base[field] };
        }
      }
      pending = next;
      base = nextBase;
      view.saveStatus = !persist() || cloudFatal ? 'error' : Object.keys(pending).length ? (ready.size === FIELDS.length ? 'saving' : 'offline') : (ready.size === FIELDS.length ? 'saved' : 'offline');
      emit(); schedule();
    },
    retry() { writeError = false; if (cloudFatal) { engine.stop(); view.saveStatus = 'loading'; view.cloudError = 'Reconectando con la nube…'; engine.start(); emit(); } else { view.cloudError = null; emit(); schedule(); } },
    reconnect() { if (!active || !online) return; engine.stop(); writeError = false; view.saveStatus = 'loading'; view.cloudError = null; engine.start(); emit(); },
    setOnline(value) {
      if (online === value) return;
      online = value;
      if (value) engine.reconnect();
      else { clearTimeout(timer); ready.clear(); LOCAL_FIELDS.forEach(field => ready.add(field)); view.saveStatus = 'offline'; view.cloudError = null; emit(); }
    },
    discardPending() {
      if (inflight) throw new Error('Espera a que termine el guardado.');
      pending = {}; writeError = false;
      if (cloudFatal) { persist(); engine.retry(); return; }
      view.cloudError = null; view.saveStatus = ready.size === FIELDS.length ? 'saved' : 'loading';
      if (!persist()) view.saveStatus = 'error'; emit();
    },
    async drain() { clearTimeout(timer); await inflightPromise; await flush(); if (Object.keys(pending).length) throw new Error('Hay cambios pendientes. Reintenta la sincronización antes de cerrar sesión.'); },
    stop() { active = false; started = false; ++generation; clearTimeout(timer); unsub(); },
    flush
  };
  return engine;
}
