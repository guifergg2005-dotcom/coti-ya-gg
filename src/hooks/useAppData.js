import { useEffect, useMemo, useState } from 'react';
import { createSyncEngine } from '../services/syncEngine';
import { subscribeRemote, saveToFirebase } from '../services/syncService';
import { createDefaults } from '../services/defaultData';
import { FIELDS } from '../services/syncModel';

export function useAppData(currentUser) {
  const engine = useMemo(() => currentUser ? createSyncEngine({
    username: currentUser.username, defaults: createDefaults(), storage: localStorage,
    subscribeRemote, commit: saveToFirebase
  }) : null, [currentUser?.username]);
  const [snapshot, setSnapshot] = useState(null);
  useEffect(() => {
    if (!engine) { setSnapshot(null); return; }
    setSnapshot(engine.getSnapshot());
    const unsubscribe = engine.subscribe(setSnapshot);
    const online = () => engine.setOnline(true), offline = () => engine.setOnline(false);
    const reconnect = () => engine.reconnect();
    const resume = () => { if (document.visibilityState === 'visible') engine.reconnect(); };
    engine.setOnline(navigator.onLine);
    engine.start();
    window.addEventListener('online', online); window.addEventListener('offline', offline);
    window.addEventListener('coti-auth-restored', reconnect); document.addEventListener('visibilitychange', resume);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); window.removeEventListener('coti-auth-restored', reconnect); document.removeEventListener('visibilitychange', resume); unsubscribe(); engine.stop(); };
  }, [engine]);
  const current = snapshot && engine ? snapshot : { data: createDefaults(), saveStatus: 'loading', cloudError: null, isReady: false };
  // Configuración nueva: conservar valores de presentación cuando el documento aún no existe.
  const data = { ...current.data, pdfConfig: current.data.pdfConfig || createDefaults().pdfConfig,
    currentQuote: current.data.currentQuote || createDefaults().currentQuote };
  const setters = Object.fromEntries(FIELDS.map(field => ['set' + field[0].toUpperCase() + field.slice(1), value => engine?.set(field, value)]));
  const legacyLocalBackup = Object.fromEntries(['clients','history','inventory_v2','transactions','work_orders','reminders','pdfConfig_v3','currentQuoteDraft_v2','defaultConditions'].flatMap(key => { const value = localStorage.getItem(key); if (value === null) return []; try { return [[key, JSON.parse(value)]]; } catch { return [[key, value]]; } }));
  return { ...data, ...setters, setMany: updates => engine?.setMany(updates), legacyLocalBackup, saveStatus: current.saveStatus, cloudError: current.cloudError, isReady: current.isReady, retry: () => engine?.retry(), discardPending: () => engine?.discardPending(), drain: () => engine?.drain() };
}
