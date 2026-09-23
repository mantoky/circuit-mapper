/**
 * Testes do nucleo Flash Report (TI / LTE).
 */
const { eq, ok, section, report } = require('./_harness');
const FR = require('../src/core/flashReport');
const { reducer, initialState } = require('../src/store/projectReducer');

section('modelo e catalogos');
ok(FR.KINDS.length >= 4, 'tipos de flash');
ok(FR.STATUSES.some((s) => s.id === 'em_atendimento'), 'status em atendimento');
ok(FR.ENVIRONMENTS.some((e) => e.id === 'TI+LTE'), 'ambiente TI+LTE');

section('demo do caso de impressao');
const demo = FR.demoFlashReport();
eq(demo.title, 'FALHA NO SERVIDOR DE IMPRESSAO', 'titulo demo');
eq(demo.locations.length, 3, '3 locais Serra');
ok(demo.locations.includes('Serra Leste'), 'Serra Leste');
eq(demo.client, 'Vale S.A.', 'contratante Vale');
eq(demo.contractor, 'Xerox', 'contratada Xerox');
eq(demo.status, 'em_atendimento', 'status demo');

section('formatacao WhatsApp');
const msg = FR.formatWhatsApp(demo);
ok(msg.includes('FLASH REPORT'), 'cabecalho flash');
ok(msg.includes('INFORMATIVO'), 'tipo informativo');
ok(msg.includes('GER TECN ATEND PA'), 'area');
ok(msg.includes('*FALHA NO SERVIDOR DE IMPRESSAO*'), 'titulo em negrito');
ok(msg.includes('Locais Afetados'), 'locais');
ok(msg.includes('Serra Norte'), 'serra norte no texto');
ok(msg.includes('Motivo:'), 'motivo');
ok(msg.includes('Situacao Atual'), 'situacao');
ok(msg.includes('Em atendimento') || msg.includes('em atendimento'), 'label status');
ok(msg.includes('INC-2026-0412'), 'ticket');
ok(msg.includes('Ambiente: TI'), 'ambiente TI');

section('listas e validacao');
eq(FR.parseList('A, B; C\nD'), ['A', 'B', 'C', 'D'], 'parseList');
eq(FR.joinList(['Serra Leste', 'Serra Norte', 'Serra Sul']),
  'Serra Leste, Serra Norte e Serra Sul', 'joinList 3');
const emptyIssues = FR.validateFlashReport(FR.emptyFlashReport());
ok(emptyIssues.some((i) => i.code === 'FR01'), 'titulo obrigatorio');
eq(FR.validateFlashReport(demo).filter((i) => i.level === 'error').length, 0, 'demo sem erros');

section('reducer SET_FLASH / RESET_FLASH');
let state = reducer(initialState, { type: 'HYDRATE', payload: { tree: [], header: {}, expanded: {} } });
ok(state.flashReport && state.flashReport.kind, 'flash hidratado');
state = reducer(state, { type: 'SET_FLASH', patch: { title: 'LINK LTE CAIDO', environment: 'LTE' } });
eq(state.flashReport.title, 'LINK LTE CAIDO', 'set flash title');
eq(state.flashReport.environment, 'LTE', 'set flash env');
state = reducer(state, { type: 'RESET_FLASH', demo: true });
eq(state.flashReport.contractor, 'Xerox', 'reset demo xerox');
state = reducer(state, { type: 'LOAD_DEMO' });
eq(state.flashReport.title, 'FALHA NO SERVIDOR DE IMPRESSAO', 'load demo inclui flash');

section('assunto');
ok(FR.formatSubject(demo).includes('INFORMATIVO'), 'subject tipo');
ok(FR.formatSubject(demo).includes('INC-2026-0412'), 'subject ticket');

report('flashReport.test.js');
