// Mitigaciones locales de las herramientas de construcción. No alteran la versión
// declarada ni ocultan los avisos de npm audit. Se reaplican tras npm ci/install.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
function patch(file, needle, replacement, marker) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes(marker)) return;
  if (!source.includes(needle)) throw new Error('Revisar mitigación: cambió ' + file);
  fs.writeFileSync(file, source.split(needle).join(replacement));
}
function packages(name) {
  const matches = [];
  function scan(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.name.startsWith('@')) { scan(p); continue; }
      const manifest = path.join(p, 'package.json');
      if (e.name === name && fs.existsSync(manifest) && JSON.parse(fs.readFileSync(manifest, 'utf8')).name === name) matches.push(p);
      scan(path.join(p, 'node_modules'));
    }
  }
  scan(path.join(root, 'node_modules')); return matches;
}
const guard = `'use strict';
module.exports = ast => {
  const queue = [[ast, 0]], seen = new WeakSet();
  while (queue.length) {
    const [node, depth] = queue.pop();
    if (!node || typeof node !== 'object') continue;
    if (depth > 64 || seen.has(node)) throw new SyntaxError('Brace pattern exceeds safe nesting depth');
    seen.add(node);
    if (Array.isArray(node.nodes)) for (const child of node.nodes) queue.push([child, depth + 1]);
  }
};
`;
for (const dir of packages('braces')) {
  fs.writeFileSync(path.join(dir, 'lib/coti-depth-guard.js'), guard);
  for (const name of ['compile', 'expand', 'stringify']) {
    const file = path.join(dir, 'lib', name + '.js');
    const needle = name === 'stringify' ? 'module.exports = (ast, options = {}) => {' : 'const ' + name + ' = (ast, options = {}) => {';
    patch(file, needle, needle + "\n  require('./coti-depth-guard')(ast); // COTI_DEPTH_GUARD", 'COTI_DEPTH_GUARD');
  }
  const file = path.join(dir, 'lib/parse.js');
  patch(file, 'stack.push(block);', "if (stack.length >= 64) throw new SyntaxError('Brace pattern exceeds safe nesting depth'); // COTI_PARSE_DEPTH\n      stack.push(block);", 'COTI_PARSE_DEPTH');
}
for (const dir of packages('http-cache-semantics')) {
  const file = path.join(dir, 'index.js'), needle = 'evaluateRequest(req) {\n        this._assertRequestHasHeaders(req);';
  const source = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n'); fs.writeFileSync(file, source);
  patch(file, needle, needle + "\n        // COTI_CACHE_STORAGE_GUARD: max-stale no puede reutilizar respuestas no almacenables.\n        if (!this.storable() || this._rescc['no-cache']) return this._evaluateRequestMissResult(req);", 'COTI_CACHE_STORAGE_GUARD');
}
console.log('Mitigaciones de construcción verificadas: profundidad de braces y reutilización de caché.');
