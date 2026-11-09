const { test } = require('node:test'), assert = require('node:assert/strict'), Module = require('node:module'), path = require('node:path');
const esbuild = require('esbuild');
function load(rel) {
  const code = esbuild.buildSync({ entryPoints: [path.join(__dirname, '..', rel)], bundle: true, platform: 'node', format: 'cjs', write: false, external: ['react', 'react-dom'] }).outputFiles[0].text;
  const m = new Module(path.join(__dirname, 'compiled-fixes.cjs'), module); m.paths = module.paths; m._compile(code, m.id); return m.exports;
}
const { useQuoteCart } = load('src/hooks/useQuoteCart.js'), { createDefaults } = load('src/services/defaultData.js');
const { createSyncEngine } = load('src/services/syncEngine.js'), { FIELDS } = load('src/services/syncModel.js');
const { calculateQuoteTotals } = load('shared/quoteMath.mjs'), business = load('src/utils/business.js');
const clone = x => JSON.parse(JSON.stringify(x));
function cart() {
  const data = createDefaults(), messages = [];
  data.currentQuote = { ...data.currentQuote, id: 101, numero: 'COT-TEST', omitIgv: true, cliente: { nombre: 'PRUEBA' }, sections: [{ id: 1, visible: true, name: 'Prueba', items: [{ id: 1, uid: 11, nombre: 'Producto', unidad: 'UN', cantidad: 2, precio: 100, total: 200 }] }] };
  data.inventory = [{ id: 1, stock: 10 }];
  for (const key of FIELDS) data['set' + key[0].toUpperCase() + key.slice(1)] = value => data[key] = typeof value === 'function' ? value(data[key]) : value;
  return { data, messages, api: () => useQuoteCart(data, () => {}, text => messages.push(text)) };
}
function sync(commit = async () => {}) {
  const defaults = createDefaults(), memory = new Map(), subscriptions = [];
  const engine = createSyncEngine({ username: 'test', defaults, storage: { getItem: k => memory.get(k), setItem: (k, v) => memory.set(k, v) }, subscribeRemote: (_u, next, error) => { subscriptions.push({ next, error }); return () => {}; }, commit, delay: 100000, onError: () => {} });
  const hydrate = () => FIELDS.forEach(f => subscriptions.at(-1).next(f, clone(defaults[f]), false));
  engine.start(); hydrate(); return { engine, subscriptions, hydrate, memory };
}
test('A01 populated maintenance reminders render without undefined components', () => {
  const React = require('react'), { renderToString } = require('react-dom/server'), Panel = load('src/components/RemindersPanel.jsx').default;
  const html = renderToString(React.createElement(Panel, { reminders: [{ id: 1, estado: 'Pendiente', fecha: '2026-12-01', cliente: 'PRUEBA', quoteNumber: 'TEST' }], setReminders: () => {} }));
  assert.match(html, /PRUEBA/); assert.match(html, /Marcar Listo/);
});
test('A02 negative and nonfinite quantities cannot create stock or sales', () => {
  const f = cart();
  for (const value of ['-2', 'Infinity', 'NaN']) assert.equal(f.api().updateItemInSection(1, 11, 'cantidad', value), false);
  assert.equal(f.data.currentQuote.sections[0].items[0].cantidad, 2);
  f.data.currentQuote.sections[0].items[0].cantidad = -2;
  assert.equal(f.api().saveAndRegister(), false); assert.equal(f.data.history.length, 0); assert.equal(f.data.inventory[0].stock, 10);
});
test('A02 insufficient stock aborts acceptance before any financial effects', () => {
  const f = cart(); f.data.inventory[0].stock = 1; f.api().saveAndRegister();
  assert.equal(f.api().changeQuoteStatus(101, 'Aceptada'), false);
  assert.equal(f.data.history[0].status, 'Pendiente'); assert.equal(f.data.transactions.length, 0); assert.equal(f.data.workOrders.length, 0); assert.equal(f.data.inventory[0].stock, 1);
});
test('A03 A04 posted sales are immutable and duplicating does not duplicate a receipt', () => {
  const f = cart(); f.api().saveAndRegister(); assert.equal(f.api().changeQuoteStatus(101, 'Aceptada'), true);
  const sale = clone(f.data.history[0]); f.data.currentQuote = clone(sale);
  assert.equal(f.api().updateItemInSection(1, 11, 'cantidad', 3), false);
  f.data.currentQuote.sections[0].items[0].cantidad = 3;
  assert.equal(f.api().saveAndRegister(), false);
  assert.equal(f.api().changeQuoteStatus(101, 'Rechazada'), false); assert.equal(f.api().deleteQuote(101), false);
  assert.equal(f.api().changeQuoteStatus(101, 'Aceptada'), true);
  assert.deepEqual(f.data.history[0], sale); assert.equal(f.data.transactions.length, 1); assert.equal(f.data.transactions[0].monto, 200); assert.equal(f.data.inventory[0].stock, 8);
  f.api().duplicateQuote(sale); assert.notEqual(f.data.currentQuote.id, sale.id); assert.equal(f.data.currentQuote.saleRegistered, false); assert.equal(f.data.currentQuote.status, 'Pendiente'); assert.equal(f.data.transactions.length, 1);
});
test('A05 stale manual totals cannot change the tax rate or make total differ from base without tax', () => {
  const f = cart(), q = f.data.currentQuote; q.sections[0].items[0].total = 100.5; q.totalManual = 118; q.omitIgv = false;
  const taxed = calculateQuoteTotals(q); assert.equal(taxed.igv, 18.09); assert.equal(taxed.totalFinal, 118.59);
  q.omitIgv = true; q.totalManual = 100; assert.equal(calculateQuoteTotals(q).totalFinal, 100.5);
});
test('A06 terminal listener error stays visible, retry reconnects and ignores obsolete callbacks', async () => {
  const f = sync(); try {
    const old = f.subscriptions[0]; old.error(new Error('terminal')); old.next('clients', [{ id: 'stale' }], false);
    assert.equal(f.engine.getSnapshot().saveStatus, 'error'); assert.match(f.engine.getSnapshot().cloudError, /terminal/);
    f.engine.retry(); assert.equal(f.subscriptions.length, 2); old.next('clients', [{ id: 'obsolete' }], false);
    assert.equal(f.engine.getSnapshot().saveStatus, 'loading'); f.hydrate(); assert.equal(f.engine.getSnapshot().saveStatus, 'saved'); assert.deepEqual(f.engine.getSnapshot().data.clients, []);
  } finally { f.engine.stop(); }
});
test('A07 oversized config cannot poison the pending journal or partially mutate a batch', () => {
  const f = sync(); try {
    assert.throws(() => f.engine.setMany({ history: [{ id: 1 }], pdfConfig: { logo: 'A'.repeat(650000) } }), /demasiado/);
    assert.deepEqual(f.engine.getSnapshot().data.history, []); assert.equal(f.engine.getSnapshot().saveStatus, 'saved');
    assert.equal(Object.keys(JSON.parse(f.memory.values().next().value).pending).length, 0);
  } finally { f.engine.stop(); }
});
test('A06 choosing the cloud version also recreates a terminated subscription', () => {
  const f = sync(); try {
    f.engine.set('clients', [{ id: 1 }]); f.subscriptions[0].error(new Error('terminal'));
    f.engine.discardPending(); assert.equal(f.subscriptions.length, 2); assert.equal(f.engine.getSnapshot().saveStatus, 'loading');
    f.hydrate(); assert.equal(f.engine.getSnapshot().saveStatus, 'saved'); assert.deepEqual(f.engine.getSnapshot().data.clients, []);
  } finally { f.engine.stop(); }
});
test('A05 historical posted amounts stay unchanged by a software update', () => {
  const f = cart(), quote = { ...f.data.currentQuote, status: 'Aceptada', saleRegistered: true, totalFinal: 118, igv: 17.5, subtotal: 100.5 };
  const totals = calculateQuoteTotals(quote); assert.equal(totals.totalFinal, 118); assert.equal(totals.igv, 17.5);
  const { renderQuoteDocument } = load('electron/quoteDocument.mjs'); quote.omitIgv = false;
  assert.match(renderQuoteDocument({ quote }).html, /IGV registrado/);
});
test('A07 invalid preview retains customization and recovery controls', () => {
  const React = require('react'), { renderToString } = require('react-dom/server'), Preview = load('src/components/PDFPreview.jsx').default;
  const d = createDefaults(); d.pdfConfig.logo = 'data:image/png;base64,' + 'A'.repeat(8100000);
  const html = renderToString(React.createElement(Preview, { quote: d.currentQuote, pdfConfig: d.pdfConfig, setPdfConfig: () => {}, setQuote: () => {} }));
  assert.match(html, /Personalizar/); assert.match(html, /Quitar todas las imágenes/); assert.match(html, /role="alert"/); assert.doesNotMatch(html, /<iframe/);
});
test('A08 references remain unique across independent devices and deletion', () => {
  const a = cart(), b = cart(); a.api().startNewQuote(); b.api().startNewQuote(); const before = a.data.currentQuote.numero;
  assert.notEqual(before, b.data.currentQuote.numero); a.data.history = []; a.api().startNewQuote(); assert.notEqual(before, a.data.currentQuote.numero);
  const ids = new Set(Array.from({ length: 1000 }, () => business.newQuoteIdentity().numero)); assert.equal(ids.size, 1000);
});
test('A09 WhatsApp preserves ampersands, accents and line breaks', () => {
  const text = 'Hola SERYVER G&G.\nRevisión & mantenimiento + garantía #1'; assert.equal(new URL(business.whatsappUrl(text)).searchParams.get('text'), text);
});
test('A10 unsupported images are explicitly rejected before decoding', async () => {
  const { prepareDocumentImage } = load('src/utils/documentImages.js');
  await assert.rejects(prepareDocumentImage({ type: 'image/svg+xml', size: 200 }), /Formato no admitido/);
  await assert.rejects(prepareDocumentImage({ type: 'image/png', size: 13000000 }), /supera 12 MB/);
});
test('A11 due dates use calendar days and month-end maintenance clamps correctly', () => {
  assert.equal(business.isOverdue('2026-10-04', '2026-10-03'), false); assert.equal(business.isOverdue('2026-10-04', '2026-10-04'), false); assert.equal(business.isOverdue('2026-10-04', '2026-10-05'), true);
  assert.equal(business.futureDate(3, new Date(2026, 0, 31, 12)), '2026-04-30');
});
test('A12 logout waits for an active write and flushes newer edits', async () => {
  let release, count = 0; const f = sync(async () => { if (++count === 1) await new Promise(r => release = r); });
  try { f.engine.set('clients', [{ id: 1 }]); const save = f.engine.flush(); f.engine.set('clients', [{ id: 1, name: 'new' }]);
    const draining = f.engine.drain(); release(); await Promise.all([save, draining]); assert.equal(count, 2); assert.equal(f.engine.getSnapshot().saveStatus, 'saved');
  } finally { f.engine.stop(); }
});
test('build mitigation rejects deeply nested braces while ordinary patterns still work', () => {
  const braces = require('braces'); assert.deepEqual(braces.expand('file.{js,jsx}'), ['file.js', 'file.jsx']);
  assert.throws(() => braces('{'.repeat(5000) + 'a,b' + '}'.repeat(5000)), { name: 'SyntaxError' });
  let ast = { type: 'text', value: 'a' }; for (let i = 0; i < 1000; i++) ast = { type: 'root', nodes: [ast] };
  for (const action of ['compile', 'expand', 'stringify']) assert.throws(() => braces[action](ast), { name: 'SyntaxError' });
});
test('build mitigation never serves private/no-store/no-cache responses via max-stale', () => {
  const Policy = require('http-cache-semantics'), request = { url: 'https://example.test/a', method: 'GET', headers: { host: 'example.test' } };
  for (const directive of ['private', 'no-store', 'no-cache']) {
    const p = new Policy(request, { status: 200, headers: { 'cache-control': directive } });
    assert.equal(p.evaluateRequest({ ...request, headers: { ...request.headers, 'cache-control': 'max-stale' } }).response, undefined);
  }
  const p = new Policy(request, { status: 200, headers: { 'cache-control': 'public, max-age=3600' } }); assert.equal(p.satisfiesWithoutRevalidation(request), true);
});
test('A13 service category variants do not deduct stock and existing clients update contact fields on save', () => {
  const f = cart();
  f.data.inventory = [
    { id: 1, stock: 10 },
    { id: 501, nombre: 'Instalación A', categoria: 'Servicio', stock: 0, precio: 80 },
    { id: 502, nombre: 'Instalación B', categoria: 'Servicios', stock: 0, precio: 90 }
  ];
  f.api().addItemToSection({ id: 501, nombre: 'Instalación A', categoria: 'Servicio', precio: 80 }, 1);
  f.api().addItemToSection({ id: 502, nombre: 'Instalación B', categoria: 'Servicios', precio: 90 }, 1);
  f.data.clients = [{ id: 'cli-1', nombre: 'PRUEBA', ruc: '', telefono: '', direccion: '', contacto: '' }];
  f.data.currentQuote.cliente = { nombre: 'PRUEBA', ruc: '20614510421', telefono: '999888777', direccion: 'Av. Principal 123', contacto: 'Ing. Guido' };
  assert.equal(f.api().saveAndRegister(), true);
  assert.equal(f.data.clients.length, 1);
  assert.equal(f.data.clients[0].ruc, '20614510421');
  assert.equal(f.data.clients[0].telefono, '999888777');
  assert.equal(f.data.clients[0].direccion, 'Av. Principal 123');
  assert.equal(f.data.clients[0].contacto, 'Ing. Guido');
  assert.equal(f.api().changeQuoteStatus(101, 'Aceptada'), true);
  assert.equal(f.data.inventory[0].stock, 8);
  assert.equal(f.data.inventory[1].stock, 0);
  assert.equal(f.data.inventory[2].stock, 0);
});
