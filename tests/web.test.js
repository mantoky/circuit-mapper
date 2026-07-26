/**
 * SMOKE TEST DO BUILD WEB (jsdom)
 * Carrega dist/VALE-CIRCUIT-MAPPER.html em um DOM real e exercita o fluxo
 * completo por meio de eventos de clique/input, como um usuario faria.
 */
const H = require('./_harness');
const fs = require('fs');
const path = require('path');
/** Resolve jsdom de forma portavel: devDependency do projeto, global, ou sandbox. */
function loadJsdom() {
  const candidates = ['jsdom', '/tmp/node_modules/jsdom',
    path.join(__dirname, '..', 'node_modules', 'jsdom')];
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* tenta o proximo */ }
  }
  console.error('jsdom nao encontrado. Instale com: npm i -D jsdom');
  process.exit(0);   // nao derruba a suite: este bloco e opcional
}
const { JSDOM } = loadJsdom();

const BUNDLE = path.join(__dirname, '..', 'dist', 'CIRCUIT-MAPPER.html');
if (!fs.existsSync(BUNDLE)) {
  console.error('Bundle ausente. Rode: node tools/bundleWeb.js');
  process.exit(1);
}

/* --------- ambiente --------- */
const store = {};
const dom = new JSDOM(fs.readFileSync(BUNDLE, 'utf8'), {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://local.test/',
  beforeParse(w) {
    w.localStorage.__proto__.getItem = (k) => (k in store ? store[k] : null);
    w.localStorage.__proto__.setItem = (k, v) => { store[k] = String(v); };
    w.localStorage.__proto__.removeItem = (k) => { delete store[k]; };
    w.confirm = () => true;
    w.alert = () => {};
    w.print = () => {};
    w.open = () => ({ document: { open() {}, write() {}, close() {} }, focus() {}, print() {} });
    w.URL.createObjectURL = (b) => { w.__lastBlob = b; return 'blob:mock'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLCanvasElement.prototype.getContext = function () {
      const noop = () => {};
      return {
        fillRect: noop, strokeRect: noop, fillText: noop, save: noop, restore: noop,
        measureText: (t) => ({ width: String(t).length * 12 }),
        set fillStyle(v) {}, set strokeStyle(v) {}, set font(v) {},
        set lineWidth(v) {}, set textAlign(v) {},
      };
    };
    w.HTMLCanvasElement.prototype.toBlob = function (cb, type) {
      cb(new w.Blob([new Uint8Array([137, 80, 78, 71])], { type: type || 'image/png' }));
    };
  },
});
/** JSDOM dispara DOMContentLoaded/load somente depois do construtor retornar,
 *  e o app esconde o splash em um setTimeout de 450ms. Aguardamos os dois. */
function ready(d) {
  return new Promise((resolve) => {
    const done = () => setTimeout(resolve, 500);
    if (d.window.document.readyState === 'complete') done();
    else d.window.addEventListener('load', done);
  });
}

const w = dom.window;
const doc = w.document;
const $ = (s) => doc.querySelector(s);
const $$ = (s) => Array.from(doc.querySelectorAll(s));
const click = (n) => n.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const typeIn = (n, v) => { n.value = v; n.dispatchEvent(new w.Event('input', { bubbles: true })); };
const byText = (sel, txt) => $$(sel).find((n) => (n.textContent || '').trim().toLowerCase().includes(txt.toLowerCase()));
const downloads = [];

async function main() {
await ready(dom);

/* --------- 1. inicializacao --------- */
H.section('1. Inicializacao do bundle');
const API = w.__VCM;
H.ok(!!API, '1.1 aplicacao inicializou e exportou API interna');
H.ok(!!API.modules.T && !!API.modules.VAL, '1.2 modulos do core resolvidos pelo shim CommonJS');
H.eq(typeof API.modules.T.flatten, 'function', '1.3 treeEngine funcional no navegador');
H.eq($('#splash').className, 'hidden', '1.4 splash removido apos boot');
H.eq($$('.tab').length, 4, '1.5 quatro abas de navegacao renderizadas');
H.ok($('#scrTitle').textContent.includes('CIRCUIT MAPPER'), '1.6 titulo inicial correto');
H.ok(byText('.btn', 'Iniciar cadastro'), '1.7 estado vazio oferece iniciar cadastro');

// paridade de motor com o app nativo
const nativeVal = require('../src/core/validation')
  .validateTree(require('../src/core/seed').attachSampleAssets(require('../src/core/seed').buildSeedTree()));

/* --------- 2. cadastro manual pela interface --------- */
H.section('2. Cadastro manual pela interface');
click(byText('.tab', 'Construcao'));
H.ok($('#scrTitle').textContent.includes('CONSTRUCAO'), '2.1 navegou para o modo construcao');
H.ok(byText('.empty b', 'NENHUM ITEM'), '2.2 arvore vazia exibe orientacao');

click(byText('.btn', 'Novo'));
H.eq($('#sheetHost').className, '', '2.3 bottom sheet abriu');
H.ok($('#shTitle').textContent.includes('Novo item'), '2.4 titulo do sheet correto');
H.eq($$('#shBody .pickr').length, 8, '2.5 oito tipos disponiveis no nivel raiz');

click(byText('.pickr .t1', 'Site / Instalacao').closest('.pickr'));
H.eq(API.state.tree.length, 1, '2.6 no raiz criado');
H.ok($('#shTitle').textContent.length > 0, '2.7 editor abriu automaticamente apos criar');

const labelInput = $('#shBody input');
typeIn(labelInput, 'Mina Brucutu - Usina 2');
H.eq(API.state.tree[0].label, 'Mina Brucutu - Usina 2', '2.8 descricao gravada na arvore');

// preenche um atributo tipado (TAG do Site)
const tagField = $$('#shBody .fld').find((f) => /TAG DO SITE/i.test(f.textContent));
typeIn(tagField.querySelector('input'), 'VALE-BRU-UB2');
H.eq(API.state.tree[0].attributes.tag, 'VALE-BRU-UB2', '2.9 atributo tipado gravado');

// atributo diverso
const novoAttr = $$('#shBody .fld').find((f) => /Novo atributo/i.test(f.textContent));
const valorAttr = $$('#shBody .fld').find((f) => /^\s*VALOR/i.test(f.textContent));
typeIn(novoAttr.querySelector('input'), 'Desenho Unifilar');
typeIn(valorAttr.querySelector('input'), 'DE-4521-EL-001 Rev.C');
click(byText('#shBody .btn', 'Adicionar atributo'));
H.eq(API.state.tree[0].attributes['Desenho Unifilar'], 'DE-4521-EL-001 Rev.C',
  '2.10 atributo diverso criado pela interface');

click($('#shClose'));
H.eq($('#sheetHost').className, 'hidden', '2.11 sheet fechou');
H.eq($$('#tree .tr').length, 1, '2.12 arvore renderiza o item criado');

/* --------- 3. hierarquia profunda via botao "+" --------- */
H.section('3. Aninhamento pelo botao "+" da linha');
click($('#tree .tr .add'));
const allowed = $$('#shBody .pickr').map((p) => p.querySelector('.t1').textContent);
H.eq(allowed, ['Subestacao', 'Quadro Eletrico', 'Area / Predio', 'Grupo de Circuitos'],
  '3.1 tipos filhos restritos pelas regras do schema');
click($$('#shBody .pickr')[0]);
click($('#shClose'));
H.eq(API.modules.T.depth(API.state.tree), 2, '3.2 profundidade 2 apos aninhar subestacao');
H.eq($$('#tree .tr').length, 2, '3.3 duas linhas visiveis (pai expandido automaticamente)');
H.eq($$('#tree .tr')[1].querySelectorAll('.gd').length, 1, '3.4 recuo visual de um nivel no filho');

/* --------- 4. cenario ficticio completo --------- */
H.section('4. Carga do cenario ficticio e verificacao NBR');
click(byText('.tab', 'Projeto'));
API.loadDemo();
H.eq(API.modules.T.countAll(API.state.tree), 41, '4.1 41 itens carregados');
H.eq(API.modules.T.depth(API.state.tree), 9, '4.2 nove niveis');
H.eq($$('#tree .tr').length, 41, '4.3 as 41 linhas renderizadas na arvore');
const maxIndent = Math.max(...$$('#tree .tr').map((r) => r.querySelectorAll('.gd').length));
H.eq(maxIndent, 8, '4.4 recuo maximo de 8 guias (nivel 9)');

const vw = API.validation();
H.eq(vw.summary.errors, nativeVal.summary.errors, '4.5 nao conformidades identicas ao app nativo');
H.eq(vw.summary.warnings, nativeVal.summary.warnings, '4.6 ressalvas identicas ao app nativo');
H.eq(vw.summary.conformityIndex, nativeVal.summary.conformityIndex,
  '4.7 indice de conformidade identico (mesmo motor)');
H.eq(vw.summary.totalKva, 267.06, '4.8 potencia total 267,06 kVA');

const accents = $$('#tree .tr .acc').map((a) => a.style.background);
H.ok(accents.some((c) => c.includes('248') || c.includes('F87171') || c.includes('rgb(248')),
  '4.9 linhas nao conformes com barra vermelha');
H.ok($$('#tree .tr .dot').length >= 9, '4.10 indicadores de status nas linhas com apontamento');
H.ok($$('#tree .tr .ph').length >= 18, '4.11 chips de fase renderizados nos circuitos');

/* --------- 5. colapso, expansao e busca --------- */
H.section('5. Navegacao no Explorer');
API.setAllExpanded(false);
H.eq($$('#tree .tr').length, 1, '5.1 recolher tudo deixa apenas a raiz');
API.setAllExpanded(true);
H.eq($$('#tree .tr').length, 41, '5.2 expandir tudo restaura as 41 linhas');
const search = $('.tools input');
typeIn(search, 'correia');
H.eq($$('#tree .tr').length, 3, '5.3 busca "correia" filtra para 3 itens');
typeIn(search, 'xyz-inexistente');
H.ok(byText('.empty b', 'NENHUM ITEM ENCONTRADO'), '5.4 busca sem resultado exibe mensagem');
typeIn(search, '');
H.eq($$('#tree .tr').length, 41, '5.5 limpar busca restaura a arvore');

/* --------- 6. edicao de circuito com calculo ao vivo --------- */
H.section('6. Calculo NBR 5410 ao vivo no editor');
const c03 = API.modules.T.collectByType(API.state.tree, 'circuit')
  .find((c) => c.attributes.circuitNumber === 'C-03');
API.openEdit(c03.id);
H.ok($('#shBody .calc'), '6.1 painel de verificacao presente para circuito');
const metrics = $$('#shBody .mt1').map((m) => m.querySelector('.k').textContent);
H.eq(metrics, ['Ib', 'In', 'Iz', 'dV', 'S(VA)', 'PE min'], '6.2 seis metricas calculadas');
const shownIz = $$('#shBody .mt1').find((m) => m.querySelector('.k').textContent === 'Iz')
  .querySelector('.v').textContent;
H.eq(shownIz, '36 A', '6.3 Iz corrigida exibida (6mm2 PVC B1 3cond)');
H.ok(byText('#shBody .pill', 'NAO CONF'), '6.4 status NAO CONFORME no cabecalho do painel');
H.ok(byText('#shBody .fnd .c', 'NC-01'), '6.5 apontamento NC-01 listado no editor');
H.ok(/Iz=36A/.test($('#shBody .fnd .m').textContent), '6.6 mensagem cita Iz calculada');

// Correcao pela interface. Com 6mm2 (Iz=36A) e Ib=32,68A nenhum disjuntor
// comercial coordena: 32A < Ib e 40A > Iz. O cabo tem que subir para 10mm2.
const pickChip = (labelRe, value) => {
  const fld = $$('#shBody .fld').find((f) => labelRe.test(f.textContent));
  click(Array.from(fld.querySelectorAll('.chip')).find((c) => c.textContent === value));
};
pickChip(/DISJUNTOR IN/i, '32');
let after = API.modules.VAL.validateCircuit(
  API.modules.T.findNode(API.state.tree, c03.id), { purpose: 'Forca Motriz' });
H.eq(after.computed.in, 32, '6.7 disjuntor alterado para 32 A pelo chip');
H.eq(after.status, 'error', '6.8 32 A ainda e NAO CONFORME: In < Ib (32 < 32,68)');
H.ok(after.findings.some((f) => /subdimensionado/i.test(f.message)),
  '6.9 apontamento agora acusa disjuntor subdimensionado');

pickChip(/SECAO DO CONDUTOR/i, '10');
pickChip(/DISJUNTOR IN/i, '40');
after = API.modules.VAL.validateCircuit(
  API.modules.T.findNode(API.state.tree, c03.id), { purpose: 'Forca Motriz' });
H.eq([after.computed.ib, after.computed.in, after.computed.iz], [32.68, 40, 50],
  '6.10 10mm2 + 40 A satisfaz Ib <= In <= Iz');
// Consequencia em cascata: com o cabo em 10mm2 o PE de 6mm2 viola a Tabela 58.
H.eq(after.status, 'error', '6.11 motor detecta a consequencia: PE ficou subdimensionado');
H.ok(after.findings.some((f) => f.code === 'NC-05'),
  '6.12 apontamento NC-05 (condutor de protecao) emitido em cascata');
H.eq(after.computed.peMin, 10, '6.13 PE minimo recalculado para 10mm2');

const peFld = $$('#shBody .fld').find((f) => /SECAO DO PE/i.test(f.textContent));
typeIn(peFld.querySelector('input'), '10');
after = API.modules.VAL.validateCircuit(
  API.modules.T.findNode(API.state.tree, c03.id), { purpose: 'Forca Motriz' });
H.eq(after.status, 'ok', '6.14 circuito CONFORME apos corrigir cabo, protecao e PE');
H.eq(after.findings.length, 0, '6.15 nenhum apontamento restante no circuito');

// desfaz as quatro alteracoes encadeadas
API.undo(); API.undo(); API.undo(); API.undo();
const c03r = API.modules.T.findNode(API.state.tree, c03.id);
H.eq([c03r.attributes.breaker, c03r.attributes.section, c03r.attributes.peSection],
  ['50', '6', '6'], '6.16 UNDO encadeado restaura os tres valores originais');

/* --------- 7. dimensionamento automatico --------- */
H.section('7. Dimensionamento automatico');
const c07 = API.modules.T.collectByType(API.state.tree, 'circuit')
  .find((c) => c.attributes.circuitNumber === 'C-07');
const beforeSec = c07.attributes.section;
API.openEdit(c07.id);
click(byText('#shBody .btn', 'Dimensionar automaticamente'));
const c07b = API.modules.T.findNode(API.state.tree, c07.id);
H.ok(Number(c07b.attributes.section) > Number(beforeSec),
  '7.1 secao aumentada pelo dimensionamento (era ' + beforeSec + ', ficou ' + c07b.attributes.section + ')');
const v07 = API.modules.VAL.validateCircuit(c07b, { purpose: 'Forca Motriz' });
H.ok(v07.computed.voltageDrop <= 4, '7.2 queda de tensao dentro do limite de 4%');
H.eq(v07.status, 'ok', '7.3 circuito conforme apos dimensionar');
API.undo();
API.closeSheet();

/* --------- 8. tela de conformidade --------- */
H.section('8. Dossie de conformidade');
click(byText('.tab', 'Conformidade'));
H.eq($$('#screen .card').length, nativeVal.summary.errors + nativeVal.summary.warnings,
  '8.1 um card por apontamento');
click(byText('.filters .btn', 'Nao conformidades'));
H.eq($$('#screen .card').length, nativeVal.summary.errors, '8.2 filtro exibe apenas nao conformidades');
click(byText('.filters .btn', 'Ressalvas'));
H.eq($$('#screen .card').length, nativeVal.summary.warnings, '8.3 filtro exibe apenas ressalvas');
click(byText('.filters .btn', 'Todos'));
H.ok($('#screen .card .ref').textContent.includes('NBR 5410'), '8.4 referencia normativa no card');
click(byText('#screen .card .btn', 'Abrir item'));
H.eq($('#sheetHost').className, '', '8.5 "Abrir item" navega e abre o editor do no apontado');
API.closeSheet();

/* --------- 9. cabecalho do laudo e logos --------- */
H.section('9. Cabecalho do laudo');
click(byText('.tab', 'Laudo'));
H.ok($('#scrSub').textContent.includes('Cabecalho'), '9.1 abre na etapa de cabecalho');
const numField = $$('#screen .fld').find((f) => /NUMERO DO DOCUMENTO/i.test(f.textContent));
typeIn(numField.querySelector('input'), 'LT-2026-0210');
H.eq(API.state.header.reportNumber, 'LT-2026-0210', '9.2 numero do documento gravado');
H.eq($$('#screen .logo').length, 2, '9.3 dois seletores de logo (contratada e contratante)');
H.ok($$('#screen .logo img').length === 2, '9.4 logos do cenario ficticio exibidos');
const stdField = $$('#screen .fld').find((f) => /NORMAS DE REFERENCIA/i.test(f.textContent));
typeIn(stdField.querySelector('textarea'), 'NBR 5410\nNBR 14039\nNR-10');
H.eq(API.state.header.standards.length, 3, '9.5 normas parseadas por linha');
H.ok($$('#screen .inv').length >= 4, '9.6 instrumentos do cenario listados');

/* --------- 10. geracao de documentos --------- */
H.section('10. Geracao de documentos');
click(byText('#screen .btn', 'Ir para geracao'));
H.eq($$('#screen .ckrow').length, 7, '10.1 sete secoes selecionaveis');
H.eq($$('#screen .ck.on').length, 7, '10.2 todas marcadas por padrao');
H.eq($$('#screen .fmt').length, 5, '10.3 cinco formatos de saida oferecidos');

// intercepta downloads
const origCreate = w.URL.createObjectURL;
w.URL.createObjectURL = function (b) { downloads.push(b); return origCreate.call(w.URL, b); };

const doByLabel = (fmtLabel) => {
  const row = $$('#screen .fmt').find((r) => r.querySelector('b').textContent === fmtLabel);
  click(row.querySelector('.btn'));
};

doByLabel('WORD');
H.eq(downloads.length, 1, '10.4 DOC gerado como blob para download');
H.eq(downloads[0].type, 'application/msword', '10.5 MIME type do Word correto');

doByLabel('EXCEL');
H.eq(downloads.length, 2, '10.6 XLSX gerado');
H.ok(downloads[1].type.includes('spreadsheetml'), '10.7 MIME type do Excel correto');
H.ok(downloads[1].size > 20000, '10.8 XLSX com conteudo substancial (' + downloads[1].size + ' bytes)');

doByLabel('BACKUP');
H.eq(downloads.length, 3, '10.9 JSON de backup gerado');
H.eq(downloads[2].type, 'application/json', '10.10 MIME type do JSON correto');

doByLabel('IMAGEM');
H.eq(downloads.length, 4, '10.11 PNG do resumo gerado via canvas');
H.eq(downloads[3].type, 'image/png', '10.12 MIME type da imagem correto');

doByLabel('PDF');
H.ok(byText('#screen .logrow', 'LT-2026-0210'), '10.13 PDF registrado no log da sessao');
H.ok($$('#screen .logrow').length >= 4, '10.14 arquivos listados no log de geracao');

// desmarca uma secao e confere que o HTML encolhe
click($$('#screen .ckrow')[3]);       // "Quadros de cargas"
H.eq(API.state.sections.indexOf('tables'), -1, '10.15 secao desmarcada sai da selecao');
const reduced = API.modules.LAUDO.buildLaudoHtml(API.state.tree, API.state.header,
  { sections: API.state.sections });
H.ok(!reduced.includes('QUADRO DE CARGAS &mdash;'), '10.16 documento gerado omite a secao desmarcada');
click($$('#screen .ckrow')[3]);

/* --------- 11. persistencia --------- */
H.section('11. Persistencia local');
H.ok(store['@vcm/web'], '11.1 estado gravado no localStorage');
const persisted = JSON.parse(store['@vcm/web']);
H.eq(API.modules.T.countAll(persisted.tree), 41, '11.2 arvore completa persistida');
H.eq(persisted.header.reportNumber, 'LT-2026-0210', '11.3 cabecalho persistido');
H.ok(Object.keys(persisted.expanded).length > 0, '11.4 estado de expansao persistido');

// simula reabrir o app no celular
const dom2 = new JSDOM(fs.readFileSync(BUNDLE, 'utf8'), {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://local.test/',
  beforeParse(w2) {
    w2.localStorage.__proto__.getItem = (k) => (k in store ? store[k] : null);
    w2.localStorage.__proto__.setItem = (k, v) => { store[k] = String(v); };
    w2.confirm = () => true; w2.alert = () => {};
  },
});
await ready(dom2);
const A2 = dom2.window.__VCM;
H.eq(A2.modules.T.countAll(A2.state.tree), 41, '11.5 projeto restaurado ao reabrir o app');
H.eq(A2.state.header.reportNumber, 'LT-2026-0210', '11.6 cabecalho restaurado');
H.ok(dom2.window.document.querySelector('#screen .kpi'), '11.7 painel de KPIs renderizado na reabertura');



} // fim main

main().then(() => {
  H.report('SMOKE TEST DO BUILD WEB (jsdom)');
  process.exit(process.exitCode || 0);
}).catch((e) => {
  console.error('\x1b[31mFALHA NA EXECUCAO DO SMOKE TEST:\x1b[0m', e.message);
  console.error(e.stack.split('\n').slice(1, 6).join('\n'));
  process.exit(1);
});
