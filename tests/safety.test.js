/**
 * TESTES DE SEGURANCA E REGRESSAO
 * Trava os comportamentos corrigidos na auditoria:
 *  - metodo de instalacao nao tabelado nao tem fallback silencioso
 *  - arvore sem circuitos/quadros => veredicto INCONCLUSIVO (nao CONFORME)
 *  - addChild/moveNode respeitam canNest (sem topologia invalida)
 *  - addChild com pai inexistente e no-op (sem no perdido)
 *  - import JSON rejeita malformed, IDs duplicados, profundidade/ciclo, logo remoto
 */
const H = require('./_harness');
const E = require('../src/core/engineering');
const V = require('../src/core/validation');
const T = require('../src/core/treeEngine');
const { validateImport, sanitizeLogo } = require('../src/core/importValidate');

function throws(fn, msg) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  return H.ok(threw, msg);
}

/* ==================== 1. METODO SEM FALLBACK ==================== */
H.section('1. Metodo de instalacao sem fallback silencioso');

H.eq(E.baseAmpacity({ section: '2.5', insulation: 'PVC', installMethod: 'A2', phase: 'R' }), 0,
  '1.1 metodo A2 nao tabelado => Iz 0 (nao cai em B1)');
H.eq(E.baseAmpacity({ section: '6', insulation: 'PVC', installMethod: 'D', phase: 'RST' }), 0,
  '1.2 metodo D nao tabelado => Iz 0');
H.eq(E.baseAmpacity({ section: '6', insulation: 'PVC', installMethod: 'F', phase: 'RST' }), 0,
  '1.3 metodo F nao tabelado => Iz 0');
H.ok(!E.isMethodSupported('PVC', 'A2'), '1.4 isMethodSupported false para A2');
H.ok(E.isMethodSupported('PVC', 'B1'), '1.5 isMethodSupported true para B1');

const unsupported = V.validateCircuit({
  id: 'u1', type: 'circuit', label: 'Cabo em canaletas', children: [],
  attributes: { circuitNumber: 'C-1', phase: 'R', tension: 220, powerW: 1000,
    section: '2.5', breaker: '10', insulation: 'PVC', installMethod: 'A2', length: 10, peSection: '2.5' },
}, { purpose: 'Iluminacao' });
H.eq(unsupported.status, 'error', '1.6 metodo nao tabelado => status error');
H.ok(unsupported.findings.some((f) => f.code === 'NC-06' && /A2/.test(f.message)),
  '1.7 apontamento cita o metodo nao suportado');

/* ==================== 2. VEREDICTO INCONCLUSIVO ==================== */
H.section('2. Veredicto inconclusivo sem circuitos/quadros');

const empty = V.validateTree([]);
H.eq(empty.summary.conformityIndex, 0, '2.1 arvore vazia => indice 0 (nao 100)');
H.ok(/INCONCLUSIVA/.test(empty.summary.verdict), '2.2 arvore vazia => veredicto INCONCLUSIVA');

const onlySite = V.validateTree([T.createNode({ type: 'site', label: 'Site' })]);
H.ok(/INCONCLUSIVA/.test(onlySite.summary.verdict), '2.3 so site (sem circuitos/quadros) => INCONCLUSIVA');

/* ==================== 3. ANINHAMENTO INVALIDO ==================== */
H.section('3. Aninhamento invalido rejeitado (canNest)');

let t = [];
t = T.addChild(t, null, { type: 'site', label: 'S' });
const siteId = t[0].id;
t = T.addChild(t, siteId, { type: 'panel', label: 'Q' });
const panelId = T.findNode(t, siteId).children[0].id;
t = T.addChild(t, panelId, { type: 'circuit', label: 'C' });
const circuitId = T.findNode(t, panelId).children[0].id;

// circuito so aceita 'load'; aninhar panel em circuit deve ser rejeitado
const before = t;
const rejected = T.addChild(t, circuitId, { type: 'panel', label: 'invalido' });
H.eq(T.countAll(rejected), T.countAll(before), '3.1 addChild com aninhamento invalido = no-op');
H.eq(T.findNode(rejected, 'invalido'), null, '3.2 nenhum no invalido inserido');

// moveNode: mover o site para dentro do circuito (invalido) e rejeitado, nada perdido
const movedBad = T.moveNode(t, siteId, circuitId);
H.eq(T.countAll(movedBad), T.countAll(t), '3.3 moveNode invalido = no-op, nada perdido');

/* ==================== 4. PAI INEXISTENTE ==================== */
H.section('4. addChild com pai inexistente e no-op');

const noParent = T.addChild(t, 'id_inexistente', { type: 'panel', label: 'fantasma' });
H.eq(T.countAll(noParent), T.countAll(t), '4.1 pai inexistente => no-op (antes dropava silenciosamente)');
H.ok(noParent === t, '4.2 arvore devolvida identica (mesma referencia)');

/* ==================== 5. IMPORT JSON ==================== */
H.section('5. Import JSON: validacao e sanitizacao');

throws(() => validateImport({ tree: 'x' }), '5.1 tree nao-array rejeitada');
throws(() => validateImport({ tree: [{ id: 'a', type: 'site' }, { id: 'a', type: 'panel' }] }), '5.2 IDs duplicados rejeitados');
throws(() => validateImport({ tree: [{ id: 'a' }] }), '5.3 no sem tipo rejeitado');
throws(() => validateImport({ tree: [{ id: 'a', type: 'site', children: 'x' }] }), '5.4 children nao-array rejeitado');

const cyclic = { id: 'a', type: 'site', children: [] };
cyclic.children.push(cyclic);
throws(() => validateImport({ tree: [cyclic] }), '5.5 ciclo em children rejeitado (limite de profundidade)');

const sanitized = validateImport({
  tree: [{ id: 'a', type: 'site', children: [] }],
  header: { contractorLogo: 'https://evil.example/track.png', clientLogo: 'data:image/png;base64,AAA' },
});
H.eq(sanitized.header.contractorLogo, null, '5.6 logo remoto (http) removido');
H.eq(sanitized.header.clientLogo, 'data:image/png;base64,AAA', '5.7 logo data: preservado');
H.eq(sanitizeLogo('http://x/a.png'), null, '5.8 sanitizeLogo rejeita http');
H.eq(sanitizeLogo('data:image/png;base64,AAA'), 'data:image/png;base64,AAA', '5.9 sanitizeLogo mantem data:');

const okTree = [{ id: 's1', type: 'site', children: [{ id: 'p1', type: 'panel', children: [] }] }];
let accepted = true;
try { validateImport({ tree: okTree }); } catch { accepted = false; }
H.ok(accepted, '5.10 arvore bem formada aceita');

/* ==================== 6. FOTOS POR ITEM (meta.photos) ==================== */
H.section('6. Fotos por item (meta.photos)');

let pt = [];
pt = T.addChild(pt, null, { type: 'panel', label: 'QGBT-01' });
const pid = pt[0].id;
const photo = { id: 'ph_1', uri: 'data:image/jpeg;base64,AAA', caption: 'Quadro aberto', takenAt: '2026-07-25T00:00:00Z' };
pt = T.addPhoto(pt, pid, photo);
H.eq(T.findNode(pt, pid).meta.photos.length, 1, '6.1 addPhoto anexa em meta.photos');
H.eq(T.findNode(pt, pid).meta.photos[0].caption, 'Quadro aberto', '6.2 foto preserva legenda');

pt = T.setPhotoCaption(pt, pid, 'ph_1', 'Quadro geral');
H.eq(T.findNode(pt, pid).meta.photos[0].caption, 'Quadro geral', '6.3 setPhotoCaption atualiza legenda');

pt = T.addPhoto(pt, pid, { id: 'ph_2', uri: 'data:image/png;base64,BBB', caption: '', takenAt: '2026-07-25T00:01:00Z' });
H.eq(T.findNode(pt, pid).meta.photos.length, 2, '6.4 segunda foto anexada');

pt = T.removePhoto(pt, pid, 'ph_1');
H.eq(T.findNode(pt, pid).meta.photos.length, 1, '6.5 removePhoto remove pelo id');
H.eq(T.findNode(pt, pid).meta.photos[0].id, 'ph_2', '6.6 foto correta permanece');

// import sanitiza fotos remotas
const withRemote = validateImport({
  tree: [{ id: 'n1', type: 'panel', meta: { photos: [
    { id: 'p1', uri: 'https://evil.example/x.jpg', caption: 'remota' },
    { id: 'p2', uri: 'data:image/jpeg;base64,CCC', caption: 'local' },
  ] }, children: [] }],
});
H.eq(withRemote.tree[0].meta.photos.length, 1, '6.7 foto remota (http) descartada no import');
H.eq(withRemote.tree[0].meta.photos[0].uri, 'data:image/jpeg;base64,CCC', '6.8 foto local preservada');

module.exports = H.report('TESTES DE SEGURANCA E REGRESSAO');
