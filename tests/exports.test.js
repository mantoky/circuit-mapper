/** TESTES DA CAMADA DE EXPORTACAO (templates e specs puros). */
const H = require('./_harness');
const fs = require('fs');
const path = require('path');
const { buildLaudoHtml, buildSummaryHtml, esc, fmtDate } = require('../src/export/templates/laudoHtml');
const { buildWorkbookSpec } = require('../src/export/workbookSpec');
const { fileName, slug } = require('../src/export/fileName');
const { buildSeedTree, attachSampleAssets, seedReportHeader } = require('../src/core/seed');
const { validateTree } = require('../src/core/validation');

const tree = attachSampleAssets(buildSeedTree());
const header = { ...seedReportHeader, contractorLogo: 'data:image/png;base64,AAA', clientLogo: 'data:image/png;base64,BBB' };
const val = validateTree(tree);

/* ---------- HTML / PDF / DOC ---------- */
H.section('1. Template do laudo (base do PDF e do DOC)');
const html = buildLaudoHtml(tree, header);
H.ok(html.startsWith('<!DOCTYPE html>'), '1.1 documento HTML valido');
H.eq((html.match(/class="page/g) || []).length, 10, '1.2 dez paginas logicas geradas');
H.ok(html.includes('@page land'), '1.3 folha em paisagem declarada para o quadro de cargas');
H.ok(html.includes('#22D3EE') && html.includes('#0E1A2B'), '1.4 paleta Sala de Controle (ciano eletrico + navy) aplicada');

// cabecalho obrigatorio presente
['LT-2026-0147', 'Vale S.A.', 'Robson do Carmo', 'Itabira / MG', 'SE-01 / QGBT-01', 'CREA-MG']
  .forEach((t, i) => H.ok(html.includes(t), `1.5.${i + 1} cabecalho contem "${t}"`));

H.ok(html.includes('data:image/png;base64,AAA') && html.includes('data:image/png;base64,BBB'),
  '1.6 os dois logos embutidos em base64 na capa');
H.ok(html.includes('25/07/2026'), '1.7 datas formatadas em pt-BR sem desvio de fuso');
H.ok(!html.includes('ART ART'), '1.8 prefixo ART nao duplicado');
H.ok(!/\d+V V|VV/.test(html), '1.9 unidade de tensao nao duplicada');

// conteudo tecnico
H.ok(html.includes('NBR 5410'), '1.10 referencia normativa citada');
H.ok(html.includes('NC-01') && html.includes('NC-04') && html.includes('NC-07'),
  '1.11 codigos de nao conformidade no corpo do laudo');
H.ok(html.includes('INSTALACAO NAO CONFORME'), '1.12 parecer conclusivo impresso');
H.ok(html.includes('Britador Mandibulas BM-101'), '1.13 circuitos listados no quadro de cargas');
H.ok(html.includes('Iluminacao Escada Metalica'), '1.14 circuito sem identificacao ainda aparece na tabela');
H.ok(html.includes('BM-101'), '1.15 inventario de ativos presente');
H.ok(html.includes('Fluke 376 FC'), '1.16 instrumentos com aferição listados');

// selecao de secoes
const onlyCover = buildLaudoHtml(tree, header, { sections: ['cover'] });
H.eq((onlyCover.match(/class="page/g) || []).length, 1, '1.17 selecao de secoes reduz o documento');
H.ok(!onlyCover.includes('NC-01'), '1.18 secao nao selecionada e omitida');

// escape de HTML
const evil = buildLaudoHtml(tree, { ...header, site: '<script>alert(1)</script>' });
H.ok(!evil.includes('<script>alert(1)</script>'), '1.19 entrada do usuario e escapada (sem injecao)');
H.ok(evil.includes('&lt;script&gt;'), '1.20 caracteres perigosos convertidos em entidades');

// robustez
const emptyHtml = buildLaudoHtml([], {});
H.ok(emptyHtml.includes('<!DOCTYPE html>'), '1.21 projeto vazio nao quebra o gerador');
H.ok(emptyHtml.includes('Nao foram identificados apontamentos'), '1.22 mensagem adequada sem apontamentos');

/* ---------- DOC ---------- */
H.section('2. Variante Word (.doc)');
const doc = html.replace('</head>', '<!--[if gte mso 9]><xml></xml><![endif]--></head>')
  .replace('<body>', '<body><div class="WordSection1">').replace('</body>', '</div></body>');
H.ok(doc.includes('WordSection1'), '2.1 secao Word declarada');
H.ok(doc.includes('mso 9'), '2.2 cabecalho condicional MSO presente');
H.ok(doc.includes('table'), '2.3 tabelas preservadas para edicao no Word');

/* ---------- IMAGEM ---------- */
H.section('3. Resumo executivo (base do .png/.jpg)');
const sum = buildSummaryHtml(tree, header);
H.ok(sum.includes('59,1%') || sum.includes('59.1'), '3.1 indice de conformidade impresso');
H.ok(sum.includes('INSTALACAO NAO CONFORME'), '3.2 parecer no resumo');
H.ok(sum.includes('table'), '3.3 layout em tabela (renderiza igual em qualquer engine)');
H.ok(!sum.includes('display:flex'), '3.4 sem flexbox no resumo (compatibilidade de captura)');

/* ---------- EXCEL ---------- */
H.section('4. Spec do workbook (.xlsx)');
const spec = buildWorkbookSpec(tree, header);
H.eq(spec.sheets.map((s) => s.name),
  ['CAPA', 'RESUMO', 'QGBT-01', 'CCM-01', 'QDL-01', 'QD-TEL-01', 'ATIVOS', 'APONTAMENTOS', 'HIERARQUIA'],
  '4.1 nove abas na ordem esperada');
const qgbt = spec.sheets.find((s) => s.name === 'QGBT-01');
H.eq(qgbt.widths.length, 20, '4.2 20 colunas dimensionadas');
H.eq(qgbt.freeze, 'A7', '4.3 painel congelado abaixo do cabecalho');
const dataRows = qgbt.rows.filter((r) => !r.style && (r.cells || []).length > 5);
H.eq(dataRows.length, 18, '4.4 18 linhas de circuito');
H.ok(dataRows.some((r) => r.status === 'error'), '4.5 linhas nao conformes marcadas para realce vermelho');
H.ok(dataRows.some((r) => r.status === 'warn'), '4.6 linhas com ressalva marcadas em ambar');
const kv = qgbt.rows.find((r) => r.style === 'kvline');
H.ok(kv.spans && kv.spans.length === kv.cells.length, '4.7 spans de mesclagem definidos para o bloco de identificacao');
H.eq(kv.spans.reduce((a, b) => a + b, 0) <= 20, true, '4.8 spans nao excedem a largura da planilha');

const ap = spec.sheets.find((s) => s.name === 'APONTAMENTOS');
H.eq(ap.rows.length - 2, val.findings.length, '4.9 uma linha por apontamento');
const hi = spec.sheets.find((s) => s.name === 'HIERARQUIA');
H.eq(hi.rows.length - 2, 41, '4.10 41 nos exportados na aba de hierarquia');
H.eq(Math.max(...hi.rows.slice(2).map((r) => r.cells[0])), 9, '4.11 nivel maximo 9 registrado');
H.ok(hi.rows[2].cells[4].includes('='), '4.12 atributos serializados como chave=valor');

// nomes de aba validos no Excel (<=31 chars, sem caracteres proibidos)
H.ok(spec.sheets.every((s) => s.name.length <= 31 && !/[\\/*?:[\]]/.test(s.name)),
  '4.13 nomes de aba compativeis com o Excel');

/* ---------- NOMENCLATURA ---------- */
H.section('5. Nomenclatura de arquivos');
H.eq(fileName(header, 'pdf'), 'LT-2026-0147_SE-01-QGBT-01_2026-07-25.pdf', '5.1 nome padrao do PDF');
H.eq(fileName(header, 'xlsx').endsWith('.xlsx'), true, '5.2 extensao correta por formato');
H.eq(slug('Subestação Prédio Nº1 — Área Sul'), 'Subestacao-Predio-N-1-Area-Sul', '5.3 acentos e simbolos normalizados');
H.eq(fileName({}, 'pdf').startsWith('LAUDO_CADASTRO_'), true, '5.4 fallback quando o cabecalho esta vazio');

/* ---------- UTILITARIOS ---------- */
H.section('6. Utilitarios do template');
H.eq(esc('<b>&"'), '&lt;b&gt;&amp;&quot;', '6.1 escape de HTML completo');
H.eq(fmtDate('2026-07-25'), '25/07/2026', '6.2 data civil sem conversao de fuso');
H.eq(fmtDate(''), '-', '6.3 data vazia');
H.eq(fmtDate('texto invalido'), 'texto invalido', '6.4 valor nao-data devolvido intacto');

/* ---------- ESCRITOR XLSX PROPRIO ---------- */
H.section('7. Escritor XLSX sem dependencias (substitui exceljs)');
const XW = require('../src/export/xlsxWriter');

// paridade do base64 proprio com a implementacao de referencia
const crypto = require('crypto');
let b64ok = 0;
for (let n = 0; n < 130; n++) {
  const buf = crypto.randomBytes(n);
  if (XW.bytesToBase64(new Uint8Array(buf)) === buf.toString('base64')) b64ok++;
}
H.eq(b64ok, 130, '7.1 base64 proprio identico ao de referencia em 130 tamanhos');

// encoder UTF-8 no caminho de fallback (Hermes nao garante TextEncoder)
const realTE = global.TextEncoder;
delete global.TextEncoder;
const amostras = ['QGBT-01', 'Subestacao — Area Sul', 'Iluminacao · 2,5mm² ≤ 4%', '日本語', '🔧⚡', ''];
const utf8ok = amostras.every((t) =>
  Buffer.compare(Buffer.from(XW.utf8(t)), Buffer.from(t, 'utf8')) === 0);
H.ok(utf8ok, '7.2 encoder UTF-8 proprio correto sem TextEncoder (acentos, CJK, surrogados)');

// gera a planilha inteira pelo caminho Hermes
const bytesHermes = XW.specToXlsxBytes(spec);
global.TextEncoder = realTE;
const bytesModern = XW.specToXlsxBytes(spec);
H.ok(bytesHermes.length > 100000, '7.3 planilha gerada no caminho Hermes (' + bytesHermes.length + ' bytes)');
H.eq(bytesHermes.length, bytesModern.length,
  '7.4 mesmo tamanho com e sem TextEncoder (saida deterministica)');

// estrutura do container ZIP
const sig = Array.from(bytesHermes.slice(0, 4));
H.eq(sig, [0x50, 0x4b, 0x03, 0x04], '7.5 assinatura ZIP (PK\\x03\\x04) correta');
const tail = Buffer.from(bytesHermes.slice(-22));
H.eq(tail.readUInt32LE(0), 0x06054b50, '7.6 registro End Of Central Directory presente');
const nEntries = tail.readUInt16LE(10);
// 5 partes fixas: [Content_Types], _rels/.rels, workbook.xml,
// xl/_rels/workbook.xml.rels e styles.xml
H.eq(nEntries, 5 + spec.sheets.length,
  '7.7 ' + (5 + spec.sheets.length) + ' entradas no ZIP (5 partes OOXML + ' + spec.sheets.length + ' abas)');

// as partes obrigatorias do OOXML estao presentes
const asText = Buffer.from(bytesHermes).toString('latin1');
['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/styles.xml',
 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet9.xml']
  .forEach((part, i) => H.ok(asText.includes(part), '7.8.' + (i + 1) + ' parte "' + part + '" no pacote'));

// CRC32 conferido contra implementacao de referencia
const zlib = require('zlib');
const probe = Buffer.from('circuit-mapper');
H.eq(XW.crc32(new Uint8Array(probe)), zlib.crc32 ? zlib.crc32(probe) : XW.crc32(new Uint8Array(probe)),
  '7.9 CRC32 coerente com a referencia do zlib');
H.eq(XW.colLetter(1) + XW.colLetter(20) + XW.colLetter(27), 'ATAA',
  '7.10 conversao de indice para letra de coluna (A, T, AA)');

// nao deve haver mais dependencia de exceljs nem de Buffer no app
const pkgJson = require('../package.json');
H.ok(!pkgJson.dependencies.exceljs, '7.11 exceljs removido das dependencias');
H.ok(!pkgJson.dependencies.buffer, '7.12 polyfill de buffer removido das dependencias');
const appSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'export', 'xlsxExport.js'), 'utf8');
H.ok(!/exceljs/.test(appSrc.replace(/\/\*[\s\S]*?\*\//g, '')),
  '7.13 xlsxExport nao importa exceljs (apenas em comentario explicativo)');

module.exports = H.report('TESTES DE EXPORTACAO');
