/**
 * SIMULACAO DO FLUXO DO APLICATIVO
 * Reproduz, passo a passo, uma jornada real de campo usando o REDUCER REAL do app.
 * Cada "passo" corresponde a um toque do tecnico na interface.
 */
const H = require('./_harness');
const { reducer, initialState } = require('../src/store/projectReducer');
const T = require('../src/core/treeEngine');
const { validateTree } = require('../src/core/validation');
const { buildAllTables } = require('../src/core/loadTable');
const { autoSize } = require('../src/core/engineering');
const { defaultAttributes } = require('../src/core/schema');

let state = reducer(initialState, { type: 'HYDRATE', payload: { tree: [], header: {}, expanded: {} } });
const D = (a) => { state = reducer(state, a); return state; };
const steps = [];
const step = (n, detail) => { steps.push(`  ${String(steps.length + 1).padStart(2, '0')}. ${n}${detail ? ' — ' + detail : ''}`); };

/* ---------- PASSO 1: abrir o app ---------- */
H.section('FLUXO A — Cadastro em campo a partir do zero');
H.ok(state.ready, 'A1 app hidratado e pronto (offline-first)');
H.eq(state.tree.length, 0, 'A2 projeto inicia vazio');
step('Abre o app', 'estado local hidratado do AsyncStorage');

/* ---------- PASSO 2: criar o site ---------- */
D({ type: 'ADD_NODE', parentId: null, node: { type: 'site', label: 'Mina Brucutu - Usina 2', attributes: defaultAttributes('site') } });
const siteId = state.tree[0].id;
D({ type: 'SET_ATTRIBUTE', id: siteId, key: 'tag', value: 'VALE-BRU-UB2' });
D({ type: 'SET_ATTRIBUTE', id: siteId, key: 'client', value: 'Vale S.A.' });
D({ type: 'SET_ATTRIBUTE', id: siteId, key: 'location', value: 'Sao Goncalo do Rio Abaixo / MG' });
H.eq(state.tree[0].attributes.tag, 'VALE-BRU-UB2', 'A3 site cadastrado com TAG');
step('Cadastra o SITE', 'TAG VALE-BRU-UB2');

/* ---------- PASSO 3: subestacao > trafo > quadro geral ---------- */
D({ type: 'ADD_NODE', parentId: siteId, node: { type: 'substation', label: 'SE-02', attributes: { tag: 'SE-02', tension: '13,8kV / 380-220V', ik: 22 } } });
const seId = T.findNode(state.tree, siteId).children[0].id;
H.ok(state.expanded[siteId], 'A4 pai expande automaticamente ao receber filho');

D({ type: 'ADD_NODE', parentId: seId, node: { type: 'transformer', label: 'TRF-02', attributes: { tag: 'TRF-02', powerKva: 300, impedance: 4.5 } } });
const trfId = T.findNode(state.tree, seId).children[0].id;

D({ type: 'ADD_NODE', parentId: trfId, node: { type: 'panel', label: 'QGBT-02', attributes: { tag: 'QGBT-02', tension: '380/220V', mainBreaker: '500A', busbarCurrent: 500, ipGrade: 'IP54', demandFactor: 0.85 } } });
const qgId = T.findNode(state.tree, trfId).children[0].id;
H.eq(T.depth(state.tree), 4, 'A5 quatro niveis: Site > SE > TRF > Quadro');
step('Cadastra SE-02 > TRF-02 > QGBT-02', 'hierarquia de 4 niveis');

/* ---------- PASSO 4: grupo + circuito com dados de campo ---------- */
D({ type: 'ADD_NODE', parentId: qgId, node: { type: 'group', label: 'Grupo Moagem', attributes: { tag: 'GRP-MOA', purpose: 'Forca Motriz', groupingFactor: 0.8 } } });
const grpId = T.findNode(state.tree, qgId).children[0].id;

D({ type: 'ADD_NODE', parentId: grpId, node: { type: 'circuit', label: 'C-01 - Moinho de Bolas', attributes: {
  circuitNumber: 'C-01', description: 'Moinho de Bolas MB-701', phase: 'RST', tension: 380,
  powerW: 45000, powerFactor: 0.87, fca: 0.8, fct: 1,
  insulation: 'EPR', installMethod: 'E', breakerCurve: 'D', poles: '3P', length: 38,
} } });
const cId = T.findNode(state.tree, grpId).children[0].id;
H.eq(T.depth(state.tree), 6, 'A6 seis niveis apos grupo e circuito');
step('Cadastra grupo e circuito C-01', '45 kW trifasico, 38 m');

/* ---------- PASSO 5: dimensionamento automatico ---------- */
const circuit = T.findNode(state.tree, cId);
const sized = autoSize(circuit.attributes, 'Forca Motriz');
H.ok(sized && sized.section, 'A7 dimensionamento automatico retorna secao');
D({ type: 'UPDATE_NODE', id: cId, patch: { attributes: {
  section: String(sized.section), breaker: String(sized.breaker),
  ip: String(sized.ib), peSection: String(sized.peSection),
} } });
let v = validateTree(state.tree);
H.eq(v.statusById[cId], 'ok', 'A8 circuito dimensionado automaticamente fica CONFORME');
step('Aciona "Dimensionar automaticamente"', `secao ${sized.section} mm2 / disjuntor ${sized.breaker} A / dV ${sized.voltageDrop}%`);

/* ---------- PASSO 6: erro humano e deteccao ---------- */
D({ type: 'SET_ATTRIBUTE', id: cId, key: 'breaker', value: '160' });
v = validateTree(state.tree);
H.eq(v.statusById[cId], 'error', 'A9 disjuntor superdimensionado marca NAO CONFORME em tempo real');
H.ok(v.findings.some((f) => f.code === 'NC-01' && f.nodeId === cId), 'A10 apontamento NC-01 gerado');
step('Tecnico digita disjuntor 160 A por engano', 'app aponta NC-01 na hora');

/* ---------- PASSO 7: undo ---------- */
D({ type: 'UNDO' });
v = validateTree(state.tree);
H.eq(T.findNode(state.tree, cId).attributes.breaker, String(sized.breaker), 'A11 UNDO restaura o disjuntor correto');
H.eq(v.statusById[cId], 'ok', 'A12 status volta a CONFORME apos undo');
D({ type: 'REDO' });
H.eq(T.findNode(state.tree, cId).attributes.breaker, '160', 'A13 REDO reaplica a alteracao');
D({ type: 'UNDO' });
step('Desfaz e refaz a alteracao', 'historico de 40 snapshots funcionando');

/* ---------- PASSO 8: atributo diverso ---------- */
D({ type: 'SET_ATTRIBUTE', id: cId, key: 'Desenho Unifilar', value: 'DE-4521-EL-001 Rev.C' });
D({ type: 'SET_ATTRIBUTE', id: cId, key: 'Data Termografia', value: '2026-06-18' });
const custom = T.findNode(state.tree, cId).attributes;
H.ok(custom['Desenho Unifilar'] && custom['Data Termografia'], 'A14 atributos diversos gravados no circuito');
step('Lanca 2 atributos diversos', 'desenho unifilar e data de termografia');

/* ---------- PASSO 9: ativo terminal ---------- */
D({ type: 'ADD_NODE', parentId: cId, node: { type: 'load', label: 'MB-701', attributes: {
  tag: 'MB-701', description: 'Moinho de Bolas 45 kW', assetType: 'Motor',
  powerW: 45000, tension: 380, currentA: 82, quantity: 1, condition: 'Operando',
} } });
H.eq(T.depth(state.tree), 7, 'A15 sete niveis com o ativo terminal');
H.eq(T.countByType(state.tree).load, 1, 'A16 ativo registrado no inventario');
step('Anexa o ativo MB-701 ao circuito', '7 niveis de profundidade');

/* ---------- PASSO 10: cabecalho do laudo ---------- */
D({ type: 'SET_HEADER', patch: {
  reportNumber: 'LT-2026-0210', revision: '00', client: 'Vale S.A.',
  contractor: 'Robson do Carmo - Engenharia Eletrica',
  site: 'Mina Brucutu - Usina 2', location: 'Sao Goncalo do Rio Abaixo / MG',
  equipmentTag: 'SE-02 / QGBT-02', technician: 'Robson do Carmo',
  crea: 'CREA-MG 0000000000', inspectionDate: '2026-07-25', issueDate: '2026-07-25',
  contractorLogo: 'data:image/png;base64,iVBORw0KGgo=',
  clientLogo: 'data:image/png;base64,iVBORw0KGgo=',
} });
H.eq(state.header.reportNumber, 'LT-2026-0210', 'A17 cabecalho do laudo preenchido');
H.ok(state.header.contractorLogo && state.header.clientLogo, 'A18 logos da contratada e contratante carregados');
step('Preenche o cabecalho e sobe os 2 logos', 'LT-2026-0210');

/* ---------- PASSO 11: quadro de cargas ---------- */
const tables = buildAllTables(state.tree);
H.eq(tables.length, 1, 'A19 um quadro de cargas gerado');
H.eq(tables[0].rows.length, 1, 'A20 uma linha por circuito');
H.ok(tables[0].totals.powerKva > 50, 'A21 potencia aparente totalizada');
H.ok(tables[0].totals.demandCurrent > 0, 'A22 corrente de demanda calculada');
step('Abre o quadro de cargas', `${tables[0].totals.powerKva} kVA / ${tables[0].totals.demandCurrent} A`);

/* ---------- PASSO 12: persistencia ---------- */
const snapshot = JSON.stringify({ tree: state.tree, header: state.header });
const restored = JSON.parse(snapshot);
H.eq(T.countAll(restored.tree), T.countAll(state.tree), 'A23 serializacao/desserializacao sem perda');
H.ok(restored.tree[0].meta.updatedAt, 'A24 metadados preservados no backup JSON');
step('Salva/restaura o projeto em JSON', `${T.countAll(state.tree)} itens`);

/* ---------- FLUXO B: cenario completo ficticio ---------- */
H.section('FLUXO B — Carga do cenario ficticio completo e geracao do laudo');
state = reducer(initialState, { type: 'HYDRATE', payload: { tree: [], header: {}, expanded: {} } });
D({ type: 'LOAD_DEMO' });
H.eq(T.countAll(state.tree), 41, 'B1 41 itens carregados do cenario ficticio');
H.eq(Object.keys(state.expanded).length, 41, 'B2 arvore integralmente expandida');
H.eq(state.header.reportNumber, 'LT-2026-0147', 'B3 cabecalho ficticio aplicado');

const vb = validateTree(state.tree);
H.eq(vb.summary.circuits, 18, 'B4 18 circuitos verificados');
H.eq(vb.summary.errors, 5, 'B5 5 nao conformidades');
H.eq(vb.summary.warnings, 7, 'B6 7 ressalvas');
H.near(vb.summary.conformityIndex, 59.1, 0.2, 'B7 indice de conformidade 59,1%');

const codes = [...new Set(vb.findings.map((f) => f.code))].sort();
H.eq(codes, ['NC-01', 'NC-03', 'NC-04', 'NC-05', 'NC-07', 'NC-09', 'NC-10'],
  'B8 sete tipos distintos de apontamento acionados');

const tb = buildAllTables(state.tree);
H.eq(tb.map((t) => t.tag), ['QGBT-01', 'CCM-01', 'QDL-01', 'QD-TEL-01'], 'B9 quatro quadros na ordem da arvore');
H.ok(tb.every((t) => t.rows.every((r) => r.status)), 'B10 toda linha do quadro tem status de conformidade');

/* ---------- FLUXO C: colapso/expansao e filtro ---------- */
H.section('FLUXO C — Navegacao no Explorer');
D({ type: 'SET_EXPANDED_ALL', value: false });
let flat = T.flatten(state.tree, { expanded: state.expanded });
H.eq(flat.length, 1, 'C1 tudo recolhido mostra apenas a raiz');
D({ type: 'SET_EXPANDED_ALL', value: true });
flat = T.flatten(state.tree, { expanded: state.expanded });
H.eq(flat.length, 41, 'C2 tudo expandido mostra os 41 itens');
const root = state.tree[0].id;
D({ type: 'TOGGLE_EXPAND', id: root });
flat = T.flatten(state.tree, { expanded: state.expanded });
H.eq(flat.length, 1, 'C3 toggle da raiz recolhe a arvore inteira');
D({ type: 'TOGGLE_EXPAND', id: root });

const hits = T.search(state.tree, 'correia');
H.eq(hits.length, 3, 'C4 busca por "correia" encontra 2 circuitos + 1 ativo (varredura em label e atributos)');
H.ok(hits[0].pathLabel.includes('>'), 'C5 resultado da busca traz o caminho completo');

const bread = T.findPath(state.tree, T.collectByType(state.tree, 'load')[0].id);
H.ok(bread.length >= 7, 'C6 breadcrumb do ativo atravessa 7+ niveis');

/* ---------- FLUXO D: exclusao em cascata ---------- */
H.section('FLUXO D — Exclusao em cascata');
const ccmNode = T.collectByType(state.tree, 'panel').find((p) => p.attributes.tag === 'CCM-01');
const beforeCount = T.countAll(state.tree);
const ccmSize = T.countAll([ccmNode]);
D({ type: 'REMOVE_NODE', id: ccmNode.id });
H.eq(T.countAll(state.tree), beforeCount - ccmSize, `D1 remocao do CCM-01 elimina ${ccmSize} itens em cascata`);
H.eq(validateTree(state.tree).summary.circuits, 11, 'D2 circuitos restantes recalculados');
D({ type: 'UNDO' });
H.eq(T.countAll(state.tree), beforeCount, 'D3 UNDO restaura a subarvore completa');
H.eq(validateTree(state.tree).summary.circuits, 18, 'D4 verificacao volta aos 18 circuitos');

console.log('\n\x1b[33m── Roteiro executado ──\x1b[0m');
console.log(steps.join('\n'));

module.exports = H.report('SIMULACAO DE FLUXO DO APLICATIVO');
