/** TESTES DO NUCLEO: hierarquia recursiva, calculos NBR 5410, validacao. */
const H = require('./_harness');
const T = require('../src/core/treeEngine');
const E = require('../src/core/engineering');
const V = require('../src/core/validation');
const S = require('../src/core/schema');
const LT = require('../src/core/loadTable');
const seed = require('../src/core/seed');

/* ==================== 1. HIERARQUIA RECURSIVA ==================== */
H.section('1. Hierarquia recursiva (niveis ilimitados)');

let tree = [];
tree = T.addChild(tree, null, { type: 'site', label: 'Site A' });
const siteId = tree[0].id;
H.eq(tree.length, 1, '1.1 no raiz criado');
H.ok(!!tree[0].meta.createdAt, '1.2 metadados de criacao presentes');

// cria 12 niveis encadeados -> comprova recursividade sem limite
let parent = siteId;
for (let i = 0; i < 12; i++) {
  tree = T.addChild(tree, parent, { type: 'panel', label: `Nivel ${i + 2}` });
  parent = T.findNode(tree, parent).children[0].id;
}
H.eq(T.depth(tree), 13, '1.3 profundidade de 13 niveis suportada');
H.eq(T.countAll(tree), 13, '1.4 contagem total de nos');

// imutabilidade
const before = tree;
const after = T.updateNode(tree, siteId, { label: 'Site A - Renomeado' });
H.ok(before !== after, '1.5 update devolve nova arvore (imutabilidade)');
H.eq(before[0].label, 'Site A', '1.6 arvore original intacta');
H.eq(after[0].label, 'Site A - Renomeado', '1.7 nova arvore atualizada');
tree = after;

// caminho / pai
const deepest = T.flatten(tree).slice(-1)[0].node;
const path = T.findPath(tree, deepest.id);
H.eq(path.length, 13, '1.8 breadcrumb com 13 niveis');
H.eq(T.findParent(tree, deepest.id).label, 'Nivel 12', '1.9 pai localizado corretamente');

// atributos customizaveis
tree = T.setAttribute(tree, siteId, 'Nivel de Curto', '25 kA');
H.eq(T.findNode(tree, siteId).attributes['Nivel de Curto'], '25 kA', '1.10 atributo diverso gravado');
tree = T.renameAttribute(tree, siteId, 'Nivel de Curto', 'Icc Presumida');
H.ok(T.findNode(tree, siteId).attributes['Icc Presumida'] === '25 kA'
  && !('Nivel de Curto' in T.findNode(tree, siteId).attributes), '1.11 atributo renomeado');
tree = T.setAttribute(tree, siteId, 'Icc Presumida', '');
H.ok(!('Icc Presumida' in T.findNode(tree, siteId).attributes), '1.12 atributo removido com valor vazio');

// mover / ciclo
const lvl3 = T.flatten(tree)[2].node;
const lvl9 = T.flatten(tree)[8].node;
const noCycle = T.moveNode(tree, lvl3.id, lvl9.id);
H.eq(T.depth(noCycle), 13, '1.13 move para descendente bloqueado (sem ciclo)');
const moved = T.moveNode(tree, lvl9.id, siteId);
H.ok(T.findParent(moved, lvl9.id).id === siteId, '1.14 move valido reposiciona o no');
H.eq(T.countAll(moved), 13, '1.15 nenhum no perdido no move');

// duplicar
const dup = T.duplicateNode(tree, lvl9.id);
H.ok(T.countAll(dup) > T.countAll(tree), '1.16 duplicacao replica subarvore');
const dupIds = [];
(function collect(l) { l.forEach((n) => { dupIds.push(n.id); collect(n.children); }); })(dup);
H.eq(dupIds.length, new Set(dupIds).size, '1.17 ids unicos apos duplicacao');

// remover
const removed = T.removeNode(tree, lvl9.id);
H.ok(T.countAll(removed) < T.countAll(tree), '1.18 remocao elimina subarvore');
H.eq(T.findNode(removed, lvl9.id), null, '1.19 no removido nao encontravel');

// busca
tree = T.setAttribute(tree, siteId, 'tag', 'VALE-TESTE-01');
H.eq(T.search(tree, 'vale-teste').length, 1, '1.20 busca textual por atributo');

// regras de aninhamento
H.ok(S.allowedChildren('circuit').includes('load'), '1.21 circuito aceita carga');
H.ok(!T.canNest('load', 'panel'), '1.22 carga nao aceita quadro (folha)');
H.eq(T.auditTree(tree).filter((i) => i.level === 'error').length, 0, '1.23 auditoria sem erros de integridade');

/* ==================== 2. CALCULOS NBR 5410 ==================== */
H.section('2. Motor de calculo eletrico (NBR 5410)');

H.near(E.designCurrent({ powerW: 15000, tension: 380, powerFactor: 0.87, phase: 'RST' }), 26.2, 0.1,
  '2.1 Ib trifasico 15kW/380V/0,87 = 26,2 A');
H.near(E.designCurrent({ powerW: 2200, tension: 220, powerFactor: 1, phase: 'R' }), 10, 0.05,
  '2.2 Ib monofasico 2200W/220V = 10 A');
H.eq(E.baseAmpacity({ section: '2.5', insulation: 'PVC', installMethod: 'B1', phase: 'R' }), 24,
  '2.3 Iz base 2,5mm2 PVC B1 2cond = 24 A (Tab. 36)');
H.eq(E.baseAmpacity({ section: '6', insulation: 'PVC', installMethod: 'B1', phase: 'RST' }), 36,
  '2.4 Iz base 6mm2 PVC B1 3cond = 36 A');
H.eq(E.correctedAmpacity({ section: '6', insulation: 'PVC', installMethod: 'B1', phase: 'RST', fca: 0.8, fct: 1 }),
  28.8, '2.5 Iz corrigida por FCA 0,8');
H.eq(E.nextBreaker(26.2), 32, '2.6 disjuntor comercial acima de 26,2 A = 32 A');
H.eq(E.protectiveConductorSection(10), 10, '2.7 PE para S<=16 = S (Tab. 58)');
H.eq(E.protectiveConductorSection(25), 16, '2.8 PE para 16<S<=35 = 16');
H.eq(E.protectiveConductorSection(95), 48, '2.9 PE para S>35 = S/2');

// queda de tensao: 1F, 2,5mm2, 100m, 10A, 220V, fp=1
const dv = E.voltageDrop({ section: '2.5', length: 100, tension: 220, powerFactor: 1, ip: 10, phase: 'R' });
H.near(dv, 6.49, 0.1, '2.10 queda de tensao monofasica 2x0,0179x100x10/2,5/220');

const sized = E.autoSize({
  powerW: 15000, tension: 380, powerFactor: 0.87, phase: 'RST',
  insulation: 'PVC', installMethod: 'B1', length: 45, fca: 0.8, fct: 1,
}, 'Forca Motriz');
H.eq(sized.breaker, 32, '2.11 autoSize escolhe disjuntor 32 A');
H.ok(sized.section >= 10, '2.12 autoSize escolhe secao que atende In<=Iz');
H.ok(sized.voltageDrop <= 4, '2.13 autoSize respeita limite de 4% de queda');

/* ==================== 3. VALIDACAO / LAUDO ==================== */
H.section('3. Validacao de conformidade');

const badCircuit = {
  id: 'x1', type: 'circuit', label: 'Teste', children: [],
  attributes: {
    circuitNumber: 'C-99', description: 'Motor', phase: 'RST', tension: 380,
    powerW: 18500, powerFactor: 0.86, section: '6', breaker: '50',
    insulation: 'PVC', installMethod: 'B1', fca: 1, fct: 1, length: 52, peSection: '6',
  },
};
const bad = V.validateCircuit(badCircuit, { purpose: 'Forca Motriz' });
H.eq(bad.status, 'error', '3.1 In=50A > Iz=36A detectado como NAO CONFORME');
H.ok(bad.findings.some((f) => f.code === 'NC-01'), '3.2 codigo NC-01 emitido');
H.ok(/Iz/.test(bad.findings[0].message), '3.3 mensagem cita Iz');
H.ok(!!bad.findings[0].action, '3.4 acao corretiva sugerida');

const noRcd = V.validateCircuit({
  id: 'x2', type: 'circuit', label: 'TUG', children: [],
  attributes: { circuitNumber: 'C-98', phase: 'R', tension: 220, powerW: 2000, powerFactor: 0.95,
    section: '2.5', breaker: '20', insulation: 'PVC', installMethod: 'B1', length: 20, peSection: '2.5', rcd: 'Nao' },
}, { purpose: 'Tomadas (TUG)' });
H.ok(noRcd.findings.some((f) => f.code === 'NC-04'), '3.5 ausencia de DR em TUG detectada');

const good = V.validateCircuit({
  id: 'x3', type: 'circuit', label: 'Ilum', children: [],
  attributes: { circuitNumber: 'C-97', phase: 'R', tension: 220, powerW: 1200, powerFactor: 0.95,
    section: '2.5', breaker: '16', insulation: 'PVC', installMethod: 'B1', fca: 1, fct: 1,
    length: 30, peSection: '2.5' },
}, { purpose: 'Iluminacao' });
H.eq(good.status, 'ok', '3.6 circuito bem dimensionado = CONFORME');
H.eq(good.findings.length, 0, '3.7 nenhum apontamento em circuito conforme');

/* ==================== 4. DADOS FICTICIOS COMPLETOS ==================== */
H.section('4. Cenario ficticio Vale (seed)');

const demo = seed.attachSampleAssets(seed.buildSeedTree());
const val = V.validateTree(demo);
H.eq(T.depth(demo), 9, '4.1 arvore ficticia com 9 niveis');
H.eq(T.countAll(demo), 41, '4.2 41 itens cadastrados');
H.eq(val.summary.circuits, 18, '4.3 18 circuitos terminais');
H.eq(val.summary.panels, 4, '4.4 4 quadros eletricos');
H.ok(val.summary.errors >= 4, '4.5 nao conformidades intencionais detectadas');
H.ok(val.summary.warnings >= 5, '4.6 ressalvas detectadas');
H.eq(val.summary.verdict, 'INSTALACAO NAO CONFORME - intervencao necessaria', '4.7 parecer conclusivo coerente');
H.ok(val.findings.every((f) => f.code && f.ref && f.action && f.path),
  '4.8 todo apontamento possui codigo, referencia normativa, acao e caminho');

const tables = LT.buildAllTables(demo);
H.eq(tables.length, 4, '4.9 um quadro de cargas por painel');
H.eq(tables[0].columns.length, 20, '4.10 20 colunas no quadro de cargas');
H.ok(tables[0].rows.length === 18, '4.11 QGBT-01 agrega os 18 circuitos da subarvore');
H.ok(tables.every((t) => t.totals.powerKva > 0), '4.12 totais de potencia calculados');
const ccm = tables.find((t) => t.tag === 'CCM-01');
H.near(ccm.totals.powerKva, 240.6, 0.5, '4.13 CCM-01 totaliza ~240,6 kVA');
H.ok(ccm.totals.demandCurrent > 0, '4.14 corrente de demanda do CCM calculada');

const inv = LT.buildAssetInventory(demo);
H.eq(inv.length, 8, '4.15 8 ativos no inventario');
H.ok(inv.every((a) => a.path.includes('>')), '4.16 caminho hierarquico presente em cada ativo');

/* ==================== 5. NORMALIZACAO DE ENTRADA ==================== */
H.section('5. Robustez de entrada de campo');

H.eq(E.num('2,5'), 2.5, '5.1 aceita virgula decimal (teclado BR)');
H.eq(E.num(''), 0, '5.2 vazio = 0');
H.eq(E.num('abc', 7), 7, '5.3 texto invalido usa fallback');
H.eq(E.designCurrent({ powerW: '', tension: 220, powerFactor: 0.9, phase: 'R' }), 0, '5.4 sem potencia nao quebra');
const partial = V.validateCircuit({ id: 'p', type: 'circuit', label: 'Parcial', children: [], attributes: {} }, {});
H.ok(partial.findings.some((f) => f.code === 'NC-06'), '5.5 cadastro incompleto sinalizado');
H.ok(partial.status !== 'error', '5.6 cadastro incompleto e ressalva, nao NC');

module.exports = H.report('TESTES DO NUCLEO');
