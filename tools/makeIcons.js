#!/usr/bin/env node
/**
 * Gerador de icones PWA (PNG, sem dependencias).
 * Identidade Sala de Controle: navy #0E1A2B + ciano #22D3EE, com um raio de energia.
 * Gera: dist/icon-192.png, dist/icon-512.png, dist/icon-maskable-512.png
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const NAVY = [0x0E, 0x1A, 0x2B];
const CYAN = [0x22, 0xD3, 0xEE];

// ---- CRC32 (PNG) ----
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

/** Encoda um RGBA buffer em PNG. */
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  // raw: filter 0 por linha + RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/** Poligono do raio em coordenadas normalizadas (0..1), centrado. */
const BOLT = [
  [0.54, 0.10], [0.28, 0.52], [0.46, 0.52],
  [0.40, 0.90], [0.72, 0.40], [0.54, 0.40], [0.54, 0.10],
];

/** Preenche poligono em rgba (scanline), cor [r,g,b,a]. */
function fillPolygon(rgba, w, h, poly, color) {
  const xs = poly.map(p => p[0] * w);
  const ys = poly.map(p => p[1] * h);
  const n = poly.length;
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
      const x1 = Math.min(w - 1, Math.ceil(xs2[k + 1]));
      for (let x = x0; x < x1; x++) {
        const o = (y * w + x) * 4;
        rgba[o] = color[0]; rgba[o + 1] = color[1]; rgba[o + 2] = color[2]; rgba[o + 3] = 255;
      }
    }
  }
}

function makeIcon(size, bg, fg, maskable) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    rgba[i * 4] = bg[0]; rgba[i * 4 + 1] = bg[1]; rgba[i * 4 + 2] = bg[2]; rgba[i * 4 + 3] = 255;
  }
  // bolt escalado para a safe zone (60% central) quando maskable, senao 70%
  const scale = maskable ? 0.60 : 0.70;
  const poly = BOLT.map(([x, y]) => [0.5 + (x - 0.5) * scale, 0.5 + (y - 0.5) * scale]);
  fillPolygon(rgba, size, size, poly, fg);
  return encodePNG(size, size, rgba);
}

function main() {
  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(path.join(DIST, 'icon-192.png'), makeIcon(192, NAVY, CYAN, false));
  fs.writeFileSync(path.join(DIST, 'icon-512.png'), makeIcon(512, NAVY, CYAN, false));
  fs.writeFileSync(path.join(DIST, 'icon-maskable-512.png'), makeIcon(512, CYAN, NAVY, true));
  console.log('Icones PWA gerados em dist/ (192, 512, maskable-512)');
}

if (require.main === module) main();
module.exports = { main };
