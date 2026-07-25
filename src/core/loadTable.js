/**
 * QUADRO DE CARGAS - agregacao tabular para Excel e para o corpo do laudo.
 * Reproduz o layout dos diagramas unifilares industriais:
 * N. | Descricao | Fase | P(W) | S(VA) | FP | FCA | Ib | Secao | PE | Disj. | Curva | DR | L(m) | dV% | Status
 */

const eng = require('./engineering');
const { collectByType, findPath } = require('./treeEngine');
const { validateCircuit, inheritedPurpose, inheritedAreaClassification } = require('./validation');

const { num, round } = eng;

const COLUMNS = [
  { key: 'circuitNumber', header: 'N.', width: 8 },
  { key: 'description', header: 'DESCRICAO DA CARGA', width: 30 },
  { key: 'phase', header: 'FASE', width: 7 },
  { key: 'tension', header: 'V', width: 7 },
  { key: 'powerW', header: 'P (W)', width: 10 },
  { key: 'powerVa', header: 'S (VA)', width: 10 },
  { key: 'powerFactor', header: 'FP', width: 7 },
  { key: 'fca', header: 'FCA', width: 7 },
  { key: 'ib', header: 'Ib (A)', width: 9 },
  { key: 'section', header: 'SECAO (mm2)', width: 12 },
  { key: 'peSection', header: 'PE (mm2)', width: 10 },
  { key: 'breaker', header: 'DISJ. (A)', width: 10 },
  { key: 'breakerCurve', header: 'CURVA', width: 8 },
  { key: 'poles', header: 'POLOS', width: 8 },
  { key: 'rcd', header: 'DR', width: 8 },
  { key: 'length', header: 'L (m)', width: 8 },
  { key: 'iz', header: 'Iz (A)', width: 9 },
  { key: 'voltageDrop', header: 'dV (%)', width: 9 },
  { key: 'conduit', header: 'ELETRODUTO', width: 14 },
  { key: 'status', header: 'STATUS', width: 16 },
];

const STATUS_LABEL = { ok: 'CONFORME', warn: 'RESSALVA', error: 'NAO CONFORME' };

/** Uma linha do quadro de cargas por circuito */
function buildRow(circuit, tree) {
  const a = circuit.attributes || {};
  const v = validateCircuit(circuit, {
    purpose: inheritedPurpose(tree, circuit.id),
    areaClassification: inheritedAreaClassification(tree, circuit.id),
  });
  return {
    id: circuit.id,
    circuitNumber: a.circuitNumber || '-',
    description: a.description || circuit.label,
    phase: a.phase || '-',
    tension: num(a.tension) || '-',
    powerW: num(a.powerW) || '-',
    powerVa: v.computed.powerVa || '-',
    powerFactor: num(a.powerFactor, 0.92),
    fca: num(a.fca, 1),
    ib: v.computed.ib || '-',
    section: a.section || '-',
    peSection: a.peSection || v.computed.peMin || '-',
    breaker: num(a.breaker) || '-',
    breakerCurve: a.breakerCurve || '-',
    poles: a.poles || '-',
    rcd: a.rcd || 'Nao',
    length: num(a.length) || '-',
    iz: v.computed.iz || '-',
    voltageDrop: v.computed.voltageDrop || 0,
    conduit: a.conduit || '-',
    status: STATUS_LABEL[v.status],
    _status: v.status,
    _findings: v.findings,
  };
}

/** Um quadro de cargas por painel (uma aba do Excel) */
function buildPanelTable(panel, tree) {
  const circuits = collectByType([panel], 'circuit');
  const rows = circuits.map((c) => buildRow(c, tree));
  const totals = rows.reduce((acc, r) => {
    acc.powerW += num(r.powerW);
    acc.powerVa += num(r.powerVa);
    return acc;
  }, { powerW: 0, powerVa: 0 });

  const a = panel.attributes || {};
  const tension = parseFloat(String(a.tension || '380').split('/')[0]) || 380;
  const demand = num(a.demandFactor, 1) || 1;

  return {
    panel,
    tag: a.tag || panel.label,
    path: (findPath(tree, panel.id) || []).map((n) => n.label).join(' > '),
    attributes: a,
    columns: COLUMNS,
    rows,
    totals: {
      circuits: rows.length,
      powerW: round(totals.powerW, 0),
      powerVa: round(totals.powerVa, 0),
      powerKva: round(totals.powerVa / 1000, 2),
      demandKva: round((totals.powerVa * demand) / 1000, 2),
      demandCurrent: round((totals.powerVa * demand) / (eng.SQRT3 * tension), 2),
      nonConform: rows.filter((r) => r._status === 'error').length,
      attention: rows.filter((r) => r._status === 'warn').length,
    },
  };
}

/** Todos os quadros do projeto */
function buildAllTables(tree) {
  return collectByType(tree, 'panel').map((p) => buildPanelTable(p, tree));
}

/** Inventario plano de ativos/cargas (aba "Ativos") */
function buildAssetInventory(tree) {
  return collectByType(tree, 'load').map((l) => {
    const a = l.attributes || {};
    return {
      tag: a.tag || '-',
      description: a.description || l.label,
      assetType: a.assetType || '-',
      quantity: num(a.quantity, 1),
      powerW: num(a.powerW) || '-',
      tension: num(a.tension) || '-',
      currentA: num(a.currentA) || '-',
      manufacturer: a.manufacturer || '-',
      condition: a.condition || '-',
      path: (findPath(tree, l.id) || []).map((n) => n.label).join(' > '),
    };
  });
}

module.exports = { COLUMNS, STATUS_LABEL, buildRow, buildPanelTable, buildAllTables, buildAssetInventory };
