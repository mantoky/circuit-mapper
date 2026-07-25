#!/usr/bin/env node
/**
 * BUNDLER DE ARQUIVO UNICO (sem dependencias)
 * ------------------------------------------------------------------
 * Empacota os modulos CommonJS de src/core e src/export junto com a UI web
 * em um unico .html autocontido, que roda offline no navegador do celular.
 *
 * O objetivo e permitir teste do FLUXO COMPLETO no dispositivo sem precisar
 * de build nativo: o motor executado e exatamente o mesmo do app Expo.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/** Modulos do app embarcados no bundle (ordem irrelevante: resolucao e lazy) */
const MODULES = [
  'src/core/schema.js',
  'src/core/treeEngine.js',
  'src/core/engineering.js',
  'src/core/validation.js',
  'src/core/loadTable.js',
  'src/core/seed.js',
  'src/core/importValidate.js',
  'src/export/fileName.js',
  'src/export/workbookSpec.js',
  'src/export/xlsxWriter.js',
  'src/export/templates/laudoHtml.js',
];

const norm = (p) => p.replace(/\\/g, '/').replace(/\.js$/, '');
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');

function defineModule(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  return `__define(${JSON.stringify(norm(rel))}, function (module, exports, require) {\n${safe(src)}\n});`;
}

function build() {
  const makeIcons = require('./makeIcons');
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
  const ui = safe(fs.readFileSync(path.join(ROOT, 'web/app.js'), 'utf8'));
  const css = fs.readFileSync(path.join(ROOT, 'web/style.css'), 'utf8');
  const shell = fs.readFileSync(path.join(ROOT, 'web/index.html'), 'utf8');

  const out = shell
    .replace('/*__CSS__*/', () => css)
    .replace('//__RUNTIME__', () => `${shim}\n${mods}`)
    .replace('//__APP__', () => ui)
    .replace('//__SW__', () =>
      "if ('serviceWorker' in navigator) { window.addEventListener('load', function () { " +
      "navigator.serviceWorker.register('sw.js').catch(function () {}); }); }"
    );

  const dest = path.join(ROOT, 'dist', 'CIRCUIT-MAPPER.html');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, out, 'utf8');

  // PWA: manifest, service worker e icones
  fs.copyFileSync(path.join(ROOT, 'web/manifest.webmanifest'), path.join(ROOT, 'dist/manifest.webmanifest'));
  fs.copyFileSync(path.join(ROOT, 'web/sw.js'), path.join(ROOT, 'dist/sw.js'));
  makeIcons.main();

  const kb = (fs.statSync(dest).size / 1024).toFixed(0);
  console.log(`Bundle gerado: dist/CIRCUIT-MAPPER.html  (${kb} kB, ${MODULES.length} modulos do core embarcados) + PWA (manifest, sw, icones)`);
  return dest;
}

if (require.main === module) build();
module.exports = { build, MODULES };
