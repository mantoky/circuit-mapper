#!/usr/bin/env node
/**
 * Copia dist-flash/ para uma pasta de destino (ex.: Windows local).
 * Uso: node tools/exportFlashBuild.js "D:\\Desenvolvedor\\APPs\\Flash report ti-lte"
 */
const fs = require('fs');
const path = require('path');
const { build } = require('./bundleFlashReport');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist-flash');

function copyEntry(src, dest) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyEntry(path.join(src, name), path.join(dest, name));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function writeReadme(dest) {
  const txt = `FLASH REPORT TI/LTE — build local
================================

Abra no Chrome/Edge:
  FLASH-REPORT.html

Atalhos:
  - DEMO: caso servidor de impressao (Vale / Xerox)
  - Copiar texto: WhatsApp / Teams
  - Baixar card PNG: logos contratada + contratante

Dados ficam no navegador (localStorage).

Regenerar esta pasta (no repo circuit-mapper):
  scripts\\BUILD-FLASH.bat
  ou: npm run build:flash && node tools/exportFlashBuild.js "${dest.replace(/\\/g, '\\\\')}"

Deploy VPS: npm run deploy:flash (requer credenciais)
URL producao: https://falha-ti-lte.techartsolucoes.com.br/
`;
  fs.writeFileSync(path.join(dest, 'COMO-USAR.txt'), txt, 'utf8');
}

function main() {
  const target = process.argv[2] || process.env.FLASH_REPORT_OUT_DIR;
  if (!target) {
    console.error('Uso: node tools/exportFlashBuild.js <pasta-destino>');
    process.exit(2);
  }
  build();
  if (!fs.existsSync(path.join(DIST, 'FLASH-REPORT.html'))) {
    console.error('Build ausente em dist-flash/');
    process.exit(1);
  }
  const abs = path.resolve(target);
  fs.mkdirSync(abs, { recursive: true });
  for (const name of fs.readdirSync(DIST)) {
    copyEntry(path.join(DIST, name), path.join(abs, name));
  }
  writeReadme(abs);
  console.log(`[OK] Build exportada para: ${abs}`);
}

if (require.main === module) main();
