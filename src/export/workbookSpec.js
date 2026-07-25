/**
 * SPEC DE PLANILHA (pura) - fonte unica de verdade das planilhas.
 * Consumida por xlsxWriter.js (app nativo e build web) e, de forma
 * independente, por tests/buildXlsx.py (openpyxl) na verificacao cruzada.
 *
 * Abas geradas:
 *   CAPA | RESUMO | <um quadro de cargas por painel> | ATIVOS | APONTAMENTOS | HIERARQUIA
 */

const { buildAllTables, buildAssetInventory, COLUMNS } = require('../core/loadTable');
const { validateTree } = require('../core/validation');
const { flatten, countByType, countAll, depth } = require('../core/treeEngine');
const { typeInfo } = require('../core/schema');

const STYLE = {
  charcoal: 'FF2F2F2F',
  charcoalSoft: 'FF3A3A3A',
  yellow: 'FFFFCC00',
  white: 'FFFFFFFF',
  gray: 'FFF2F2F2',
  ok: 'FFDDF3E4',
  warn: 'FFFFF0D6',
  err: 'FFFAD9D9',
  textLight: 'FFF5F5F5',
  textDark: 'FF1A1A1A',
  border: 'FFB0B0B0',
};

function sanitizeSheetName(name) {
  return String(name).replace(/[\\/*?:[\]]/g, '-').slice(0, 31);
}

function coverSheet(header, val, tree) {
  const rows = [
    { cells: ['QUADRO DE CARGAS E CADASTRO DE CIRCUITOS ELETRICOS'], style: 'title', merge: 6 },
    { cells: [header.site || ''], style: 'subtitle', merge: 6 },
    { cells: [] },
    { cells: ['DOCUMENTO', header.reportNumber || '-', '', 'REVISAO', header.revision || '00'], style: 'kv' },
    { cells: ['CONTRATANTE', header.client || '-', '', 'CNPJ', header.clientCnpj || '-'], style: 'kv' },
    { cells: ['CONTRATADA', header.contractor || '-', '', 'DOC', header.contractorDoc || '-'], style: 'kv' },
    { cells: ['CONTRATO', header.contract || '-'], style: 'kv' },
    { cells: ['LOCALIDADE', header.location || '-', '', 'TAG', header.equipmentTag || '-'], style: 'kv' },
    { cells: ['SOLICITANTE', header.requester || '-'], style: 'kv' },
    { cells: ['INSPECAO', header.inspectionDate || '-', '', 'EMISSAO', header.issueDate || '-'], style: 'kv' },
    { cells: ['RESP. TECNICO', header.technician || '-', '', 'CREA', header.crea || '-'], style: 'kv' },
    { cells: ['ART', header.art || '-'], style: 'kv' },
    { cells: [] },
    { cells: ['PARECER', val.summary.verdict], spans: [1, 4], style: 'verdict' },
    { cells: [] },
    { cells: ['NORMAS DE REFERENCIA'], style: 'section', merge: 6 },
    ...(header.standards || []).map((s) => ({ cells: ['', s] })),
    { cells: [] },
    { cells: ['SINTESE DO CADASTRO'], style: 'section', merge: 6 },
    { cells: ['Itens cadastrados', countAll(tree)], style: 'kv' },
    { cells: ['Niveis hierarquicos', depth(tree)], style: 'kv' },
    ...Object.entries(countByType(tree)).map(([k, v]) => ({ cells: [typeInfo(k).label, v], style: 'kv' })),
  ];
  return { name: 'CAPA', widths: [26, 34, 4, 18, 26, 20], rows, freeze: null };
}

function summarySheet(val, tables) {
  const rows = [
    { cells: ['RESUMO EXECUTIVO DE CONFORMIDADE'], style: 'title', merge: 8 },
    { cells: [] },
    { cells: ['Circuitos verificados', val.summary.circuits], style: 'kv' },
    { cells: ['Quadros verificados', val.summary.panels], style: 'kv' },
    { cells: ['Itens conformes', val.summary.conform], style: 'kv' },
    { cells: ['Ressalvas', val.summary.warnings], style: 'kv' },
    { cells: ['Nao conformidades', val.summary.errors], style: 'kv' },
    { cells: ['Indice de conformidade (%)', val.summary.conformityIndex], style: 'kv' },
    { cells: ['Potencia aparente total (kVA)', val.summary.totalKva], style: 'kv' },
    { cells: [] },
    { cells: ['QUADRO', 'CIRCUITOS', 'P (kW)', 'S (kVA)', 'DEMANDA (kVA)', 'I DEMANDA (A)', 'RESSALVAS', 'NAO CONF.'], style: 'header' },
    ...tables.map((t) => ({
      cells: [t.tag, t.totals.circuits, Math.round(t.totals.powerW) / 1000, t.totals.powerKva,
        t.totals.demandKva, t.totals.demandCurrent, t.totals.attention, t.totals.nonConform],
      status: t.totals.nonConform ? 'error' : t.totals.attention ? 'warn' : 'ok',
    })),
  ];
  return { name: 'RESUMO', widths: [30, 12, 12, 12, 16, 16, 12, 12], rows, freeze: 'A12' };
}

function panelSheet(t) {
  const a = t.attributes || {};
  // spans: numero de colunas que cada celula ocupa (mesclagem).
  // Necessario porque as colunas do quadro de cargas sao estreitas e cortariam
  // os rotulos/valores do bloco de identificacao do quadro.
  const rows = [
    { cells: [`QUADRO DE CARGAS - ${t.tag}`], style: 'title', merge: COLUMNS.length },
    { cells: [t.path], style: 'subtitle', merge: COLUMNS.length },
    {
      cells: ['TENSAO', a.tension || '-', 'PROT. GERAL', a.mainBreaker || '-', 'BARRAMENTO',
        a.busbarCurrent ? `${a.busbarCurrent} A` : '-', 'GRAU DE PROTECAO', a.ipGrade || '-'],
      spans: [2, 2, 2, 2, 3, 2, 3, 2], style: 'kvline',
    },
    {
      cells: ['LOCALIZACAO', a.location || '-', 'FABRICANTE', a.manufacturer || '-'],
      spans: [2, 6, 3, 9], style: 'kvline',
    },
    {
      cells: ['ALIMENTADOR', a.feederSection || '-', 'COMPRIMENTO',
        a.feederLength ? `${a.feederLength} m` : '-', 'FATOR DE DEMANDA',
        a.demandFactor !== undefined ? a.demandFactor : '-'],
      spans: [2, 5, 3, 3, 4, 3], style: 'kvline',
    },
    { cells: [] },
    { cells: COLUMNS.map((c) => c.header), style: 'header' },
    ...t.rows.map((r) => ({
      cells: COLUMNS.map((c) => r[c.key]),
      status: r._status,
    })),
    {
      cells: ['TOTAL', `${t.totals.circuits} circuitos`, '', '', t.totals.powerW, t.totals.powerVa,
        '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      style: 'total',
    },
    { cells: [] },
    {
      cells: ['POTENCIA APARENTE (kVA)', t.totals.powerKva, 'DEMANDA (kVA)', t.totals.demandKva,
        'CORRENTE DE DEMANDA (A)', t.totals.demandCurrent],
      spans: [4, 2, 3, 2, 5, 4], style: 'kvline',
    },
    { cells: [] },
    { cells: ['Criterio NBR 5410: Ib <= In <= Iz (5.3.4) e queda de tensao <= 4% em circuito terminal (6.2.7).'], style: 'note', merge: COLUMNS.length },
  ];
  return { name: sanitizeSheetName(t.tag), widths: COLUMNS.map((c) => c.width), rows, freeze: 'A7' };
}

function assetsSheet(tree) {
  const inv = buildAssetInventory(tree);
  return {
    name: 'ATIVOS',
    widths: [14, 34, 16, 8, 12, 8, 10, 20, 16, 60],
    freeze: 'A3',
    rows: [
      { cells: ['INVENTARIO DE ATIVOS E CARGAS TERMINAIS'], style: 'title', merge: 10 },
      { cells: ['TAG', 'DESCRICAO', 'TIPO', 'QTD', 'P (W)', 'V', 'In (A)', 'FABRICANTE', 'CONDICAO', 'CAMINHO HIERARQUICO'], style: 'header' },
      ...inv.map((r) => ({
        cells: [r.tag, r.description, r.assetType, r.quantity, r.powerW, r.tension, r.currentA, r.manufacturer, r.condition, r.path],
        status: /danificado|fora de opera/i.test(r.condition) ? 'error' : 'ok',
      })),
    ],
  };
}

function findingsSheet(val) {
  return {
    name: 'APONTAMENTOS',
    widths: [10, 14, 30, 46, 60, 46, 34],
    freeze: 'A3',
    rows: [
      { cells: ['APONTAMENTOS TECNICOS - NAO CONFORMIDADES E RESSALVAS'], style: 'title', merge: 7 },
      { cells: ['CODIGO', 'SEVERIDADE', 'ITEM', 'CAMINHO', 'CONSTATACAO', 'ACAO RECOMENDADA', 'REFERENCIA NORMATIVA'], style: 'header' },
      ...val.findings
        .slice()
        .sort((a, b) => (a.level === b.level ? 0 : a.level === 'error' ? -1 : 1))
        .map((f) => ({
          cells: [f.code, f.level === 'error' ? 'NAO CONFORME' : 'RESSALVA', f.nodeLabel, f.path, f.message, f.action, f.ref],
          status: f.level,
        })),
    ],
  };
}

function hierarchySheet(tree) {
  const flat = flatten(tree);
  return {
    name: 'HIERARQUIA',
    widths: [8, 12, 46, 14, 70, 60],
    freeze: 'A3',
    rows: [
      { cells: ['ESTRUTURA HIERARQUICA COMPLETA (RECURSIVA)'], style: 'title', merge: 6 },
      { cells: ['NIVEL', 'TIPO', 'DESCRICAO', 'TAG', 'ATRIBUTOS', 'CAMINHO'], style: 'header' },
      ...flat.map((f) => {
        const a = f.node.attributes || {};
        return {
          cells: [
            f.level + 1,
            typeInfo(f.node.type).short,
            `${'    '.repeat(f.level)}${f.node.label}`,
            a.tag || a.circuitNumber || '',
            Object.entries(a).filter(([, v]) => v !== '' && v !== null && v !== undefined)
              .map(([k, v]) => `${k}=${v}`).join('; '),
            f.pathLabel,
          ],
        };
      }),
    ],
  };
}

/** Monta o spec completo do workbook */
function buildWorkbookSpec(tree, header = {}) {
  const val = validateTree(tree);
  const tables = buildAllTables(tree);
  return {
    meta: {
      title: `Quadro de Cargas - ${header.reportNumber || ''}`,
      creator: header.contractor || 'Circuit Mapper',
      company: header.client || 'Cliente Ltda.',
    },
    style: STYLE,
    sheets: [
      coverSheet(header, val, tree),
      summarySheet(val, tables),
      ...tables.map(panelSheet),
      assetsSheet(tree),
      findingsSheet(val),
      hierarchySheet(tree),
    ],
  };
}

module.exports = { buildWorkbookSpec, STYLE, sanitizeSheetName };
