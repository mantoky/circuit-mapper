#!/usr/bin/env node
/**
 * BUNDLER DO FLASH REPORT (sem dependências)
 * ------------------------------------------------------------------
 * Empacota o núcleo de src/flash + a UI de flash-report/ em um único
 * .html autocontido (offline) para uso em campo no celular.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MODULES = ['src/flash/flashReport.js'];

const norm = (p) => p.replace(/\\/g, '/').replace(/\.js$/, '');
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');

function defineModule(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  return `__define(${JSON.stringify(norm(rel))}, function (module, exports, require) {\n${safe(src)}\n});`;
}

function build() {
  const shim = `
/* ============ SHIM COMMONJS (resolucao relativa de caminhos) ============ */
var __defs = {}, __cache = {};
function __define(id, fn) { __defs[id] = fn; }
function __resolve(fromDir, spec) {
  if (spec.charAt(0) !== '.') return spec.replace(/\\.js$/, '');
  var parts = (fromDir ? fromDir.split('/') : []).concat(spec.split('/'));
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (p === '' || p === '.') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/').replace(/\\.js$/, '');
}
function __requireFrom(dir) {
  return function (spec) { return __require(__resolve(dir, spec)); };
}
function __require(id) {
  if (__cache[id]) return __cache[id].exports;
  var fn = __defs[id];
  if (!fn) throw new Error('Modulo nao encontrado no bundle: ' + id);
  var m = { exports: {} };
  __cache[id] = m;
  var dir = id.indexOf('/') >= 0 ? id.slice(0, id.lastIndexOf('/')) : '';
  fn(m, m.exports, __requireFrom(dir));
  return m.exports;
}
`;

  const mods = MODULES.map(defineModule).join('\n\n');
  const ui = safe(fs.readFileSync(path.join(ROOT, 'flash-report/app.js'), 'utf8'));
  const css = fs.readFileSync(path.join(ROOT, 'flash-report/style.css'), 'utf8');
  const shell = fs.readFileSync(path.join(ROOT, 'flash-report/index.html'), 'utf8');

  const out = shell
    .replace('/*__CSS__*/', () => css)
    .replace('//__RUNTIME__', () => `${shim}\n${mods}`)
    .replace('//__APP__', () => ui);

  const dest = path.join(ROOT, 'dist', 'FLASH-REPORT.html');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, out, 'utf8');

  const kb = (fs.statSync(dest).size / 1024).toFixed(0);
  console.log(`Bundle gerado: dist/FLASH-REPORT.html  (${kb} kB, ${MODULES.length} modulo(s) do nucleo embarcado)`);
  return dest;
}

if (require.main === module) build();
module.exports = { build, MODULES };
