#!/usr/bin/env node
/**
 * Bundler do Flash Report standalone (sem Circuit Mapper).
 * Gera dist-flash/FLASH-REPORT.html + PWA.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist-flash');
const MODULES = ['src/core/flashReport.js'];

const norm = (p) => p.replace(/\\/g, '/').replace(/\.js$/, '');
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');

function defineModule(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  return `__define(${JSON.stringify(norm(rel))}, function (module, exports, require) {\n${safe(src)}\n});`;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}
function makeIcon(size, maskable) {
  const rgba = Buffer.alloc(size * size * 4);
  const NAVY = [0x0E, 0x1A, 0x2B, 0xFF];
  const CYAN = [0x22, 0xD3, 0xEE, 0xFF];
  const pad = maskable ? Math.floor(size * 0.1) : 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const edge = x < pad || y < pad || x >= size - pad || y >= size - pad;
      const c = edge && maskable ? [0, 0, 0, 0] : NAVY;
      rgba[i] = c[0]; rgba[i + 1] = c[1]; rgba[i + 2] = c[2]; rgba[i + 3] = c[3];
    }
  }
  // lightning bolt simplified
  const bolt = [
    [0.54, 0.18], [0.32, 0.52], [0.48, 0.52],
    [0.42, 0.82], [0.70, 0.42], [0.54, 0.42],
  ];
  const xs = bolt.map((p) => p[0] * size);
  const ys = bolt.map((p) => p[1] * size);
  const n = bolt.length;
  let minY = Math.min(...ys), maxY = Math.max(...ys);
  for (let y = Math.floor(minY); y < Math.ceil(maxY); y++) {
    const yc = y + 0.5;
    const xs2 = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const y1 = ys[i], y2 = ys[j];
      if ((y1 <= yc && y2 > yc) || (y2 <= yc && y1 > yc)) {
        const t = (yc - y1) / (y2 - y1);
        xs2.push(xs[i] + t * (xs[j] - xs[i]));
      }
    }
    xs2.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs2.length; k += 2) {
      const x0 = Math.max(0, Math.floor(xs2[k]));
      const x1 = Math.min(size - 1, Math.ceil(xs2[k + 1]));
      for (let x = x0; x <= x1; x++) {
        const i = (y * size + x) * 4;
        rgba[i] = CYAN[0]; rgba[i + 1] = CYAN[1]; rgba[i + 2] = CYAN[2]; rgba[i + 3] = 255;
      }
    }
  }
  return encodePNG(size, size, rgba);
}

function build() {
  const shim = `
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
  const ui = safe(fs.readFileSync(path.join(ROOT, 'flash-web/app.js'), 'utf8'));
  const css = fs.readFileSync(path.join(ROOT, 'flash-web/style.css'), 'utf8');
  const shell = fs.readFileSync(path.join(ROOT, 'flash-web/index.html'), 'utf8');

  fs.mkdirSync(DIST, { recursive: true });

  const out = shell
    .replace('/*__CSS__*/', () => css)
    .replace('//__RUNTIME__', () => `${shim}\n${mods}`)
    .replace('//__APP__', () => ui)
    .replace('//__SW__', () =>
      "if ('serviceWorker' in navigator) { window.addEventListener('load', function () { " +
      "navigator.serviceWorker.register('sw.js').catch(function () {}); }); }"
    );

  fs.writeFileSync(path.join(DIST, 'FLASH-REPORT.html'), out, 'utf8');
  fs.writeFileSync(path.join(DIST, 'index.html'), out, 'utf8');

  const manifest = {
    name: 'Flash Report TI/LTE',
    short_name: 'Flash Report',
    description: 'Informativos de falha em ambiente TI e LTE com logos contratada/contratante.',
    lang: 'pt-BR',
    start_url: './FLASH-REPORT.html',
    scope: './',
    display: 'standalone',
    background_color: '#0E1A2B',
    theme_color: '#0A1422',
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  fs.writeFileSync(path.join(DIST, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

  const cache = 'flash-' + Date.now().toString(36);
  const sw = `const CACHE='${cache}';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll([
  './','./FLASH-REPORT.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'
])).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(
  keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
)).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});`;
  fs.writeFileSync(path.join(DIST, 'sw.js'), sw);

  fs.writeFileSync(path.join(DIST, 'icon-192.png'), makeIcon(192, false));
  fs.writeFileSync(path.join(DIST, 'icon-512.png'), makeIcon(512, false));
  fs.writeFileSync(path.join(DIST, 'icon-maskable-512.png'), makeIcon(512, true));
  fs.writeFileSync(path.join(DIST, '_redirects'), '/  /FLASH-REPORT.html  200\n');

  const kb = (fs.statSync(path.join(DIST, 'FLASH-REPORT.html')).size / 1024).toFixed(0);
  console.log(`Bundle Flash Report: dist-flash/FLASH-REPORT.html (${kb} kB)`);
  return DIST;
}

if (require.main === module) build();
module.exports = { build };
