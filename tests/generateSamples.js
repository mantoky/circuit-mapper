/**
 * GERADOR DE AMOSTRAS REAIS
 * Executa a mesma logica de exportacao do app (templates e specs puros)
 * e grava os artefatos em tests/output/ para inspecao.
 *
 * No dispositivo, expo-print e xlsxWriter consomem exatamente estes mesmos artefatos.
 */
const fs = require('fs');
const path = require('path');

const { buildLaudoHtml, buildSummaryHtml } = require('../src/export/templates/laudoHtml');
const { buildWorkbookSpec } = require('../src/export/workbookSpec');
const { fileName } = require('../src/export/fileName');
const { buildSeedTree, attachSampleAssets, seedReportHeader } = require('../src/core/seed');
const { validateTree } = require('../src/core/validation');
const { countAll, depth } = require('../src/core/treeEngine');

const OUT = path.join(__dirname, 'output');
fs.mkdirSync(OUT, { recursive: true });

/* Logos ficticios (SVG -> data URI) para provar o embutimento na capa */
function logoDataUri(text, bg, fg) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="140" viewBox="0 0 420 140">
    <rect width="420" height="140" rx="10" fill="${bg}"/>
    <rect x="0" y="0" width="420" height="10" fill="${fg}"/>
    <text x="210" y="80" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="bold"
      fill="${fg}" text-anchor="middle">${text}</text>
    <text x="210" y="112" font-family="Arial, Helvetica, sans-serif" font-size="16"
      fill="#BBBBBB" text-anchor="middle">LOGOTIPO DE DEMONSTRACAO</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

const tree = attachSampleAssets(buildSeedTree());
const header = {
  ...seedReportHeader,
  contractorLogo: logoDataUri('ROBSON DO CARMO', '#0A1422', '#22D3EE'),
  clientLogo: logoDataUri('CONTRATANTE', '#0A1422', '#22D3EE'),
};

const val = validateTree(tree);
const base = fileName(header, '').replace(/\.$/, '');

/* 1. HTML do laudo -> insumo do PDF (expo-print) */
const laudo = buildLaudoHtml(tree, header);
fs.writeFileSync(path.join(OUT, `${base}_LAUDO.html`), laudo, 'utf8');

/* 2. DOC (Word) - mesma transformacao MSO do docExport.js */
const MSO_HEAD = `<!--[if gte mso 9]><xml>
<w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument>
</xml><![endif]-->
<style>@page WordSection1 { size:21cm 29.7cm; margin:1.4cm 1.2cm 1.6cm 1.2cm; }
div.WordSection1 { page:WordSection1; } br.pb { page-break-before:always; }</style>`;
const doc = laudo
  .replace('</head>', `${MSO_HEAD}</head>`)
  .replace('<body>', '<body><div class="WordSection1">')
  .replace('</body>', '</div></body>');
fs.writeFileSync(path.join(OUT, `${base}_LAUDO.doc`), doc, 'utf8');

/* 3. Resumo executivo -> insumo da exportacao em imagem */
fs.writeFileSync(path.join(OUT, `${base}_RESUMO.html`), buildSummaryHtml(tree, header), 'utf8');

/* 4. Spec do workbook -> consumido pelo exceljs no app e pelo openpyxl no teste */
const spec = buildWorkbookSpec(tree, header);
fs.writeFileSync(path.join(OUT, 'workbook-spec.json'), JSON.stringify(spec, null, 1), 'utf8');

/* 5. Backup do projeto (.json) */
fs.writeFileSync(path.join(OUT, `${base}_PROJETO.json`), JSON.stringify({
  schemaVersion: 1, app: 'circuit-mapper',
  exportedAt: new Date().toISOString(), header, tree,
}, null, 2), 'utf8');

/* 6. Metricas para conferencia */
const metrics = {
  itens: countAll(tree),
  niveis: depth(tree),
  quadros: val.summary.panels,
  circuitos: val.summary.circuits,
  kva: val.summary.totalKva,
  naoConformidades: val.summary.errors,
  ressalvas: val.summary.warnings,
  indiceConformidade: val.summary.conformityIndex,
  parecer: val.summary.verdict,
  paginasLaudo: (laudo.match(/class="page/g) || []).length,
  abasExcel: spec.sheets.map((s) => s.name),
  arquivoBase: base,
};
fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(metrics, null, 2), 'utf8');

console.log('Artefatos gerados em tests/output/');
console.log(JSON.stringify(metrics, null, 2));
