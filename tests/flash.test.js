/** TESTES DO FLASH REPORT — núcleo puro (mensagem, validação, datas). */
const H = require('./_harness');
const F = require('../src/flash/flashReport');

/* ==================== 1. OPÇÕES E METADADOS ==================== */
H.section('1. Opcoes e metadados');

H.eq(F.STATUSES.length, 4, '1.1 quatro status disponíveis');
H.eq(F.statusMeta('em_atendimento').dot, '🟡', '1.2 status em atendimento = 🟡');
H.eq(F.statusMeta('critico').dot, '🔴', '1.3 status crítico = 🔴');
H.eq(F.statusMeta('normalizado').dot, '🟢', '1.4 status normalizado = 🟢');
H.eq(F.statusMeta('monitorando').label, 'Monitorando', '1.5 label de monitoramento');
let threw = false;
try { F.statusMeta('inexistente'); } catch (e) { threw = true; }
H.ok(threw, '1.6 status desconhecido lança erro (switch exaustivo)');
H.ok(F.CATEGORIES.indexOf('TI') >= 0 && F.CATEGORIES.indexOf('LTE') >= 0, '1.7 categorias TI e LTE presentes');
H.ok(F.PRESET_PLACES.indexOf('Serra Leste') >= 0, '1.8 locais da Vale presentes');

/* ==================== 2. DATAS E DURAÇÃO ==================== */
H.section('2. Datas e duracao');

H.eq(F.formatDateTime('2026-09-23T10:30'), '23/09/2026 10:30', '2.1 formata datetime-local em pt-BR');
H.eq(F.formatDateTime(''), '', '2.2 vazio devolve vazio');
H.eq(F.durationBetween('2026-09-23T10:00', '2026-09-23T10:45'), '45 min', '2.3 duração em minutos');
H.eq(F.durationBetween('2026-09-23T10:00', '2026-09-23T12:30'), '2h 30min', '2.4 duração em horas');
H.eq(F.durationBetween('2026-09-23T10:00', '2026-09-24T12:00'), '1d 2h', '2.5 duração em dias');
H.eq(F.durationBetween('', '2026-09-24T12:00'), '', '2.6 sem início = sem duração');
H.eq(F.joinPlaces(['Serra Leste']), 'Serra Leste', '2.7 um local');
H.eq(F.joinPlaces(['Serra Leste', 'Serra Norte', 'Serra Sul']), 'Serra Leste, Serra Norte e Serra Sul', '2.8 três locais com "e"');

/* ==================== 3. VALIDAÇÃO ==================== */
H.section('3. Validacao');

const blank = F.defaultReport();
H.ok(F.validate(blank).length >= 4, '3.1 relatório em branco lista pendências');
H.ok(F.validate(null).length === 1, '3.2 relatório nulo = 1 pendência');
const sample = F.sampleReport();
H.eq(F.validate(sample), [], '3.3 caso de exemplo valida sem pendências');
const badStatus = Object.assign({}, sample, { status: 'zzz' });
H.ok(F.validate(badStatus).indexOf('Selecione um status válido.') >= 0, '3.4 status inválido barrado');

/* ==================== 4. MENSAGEM WHATSAPP ==================== */
H.section('4. Mensagem WhatsApp');

const msg = F.buildMessage(sample);
H.ok(msg.indexOf('📢 FLASH REPORT | INFORMATIVO - GER TECN ATEND PA') === 0, '4.1 cabeçalho operacional');
H.ok(msg.indexOf('*FALHA NO SERVIDOR DE IMPRESSÃO*') >= 0, '4.2 título em negrito caixa alta');
H.ok(msg.indexOf('Indisponibilidade do serviço de impressão') >= 0, '4.3 subtítulo presente');
H.ok(msg.indexOf('📍 Locais Afetados: Serra Leste, Serra Norte e Serra Sul') >= 0, '4.4 locais formatados');
H.ok(msg.indexOf('Motivo: Falha no servidor de impressão da Vale.') >= 0, '4.5 motivo presente');
H.ok(msg.indexOf('*Situação Atual:* Em andamento. Time da Xerox') >= 0, '4.6 situação em destaque');
H.ok(msg.indexOf('*Status:* 🟡 Em atendimento') >= 0, '4.7 status com dot amarelo');
H.ok(msg.indexOf('🔖 Chamado: INC-2026-0917') >= 0, '4.8 chamado presente');
H.ok(msg.indexOf('💥 Impacto:') >= 0, '4.9 impacto presente');
H.ok(msg.indexOf('➡️ Próximos passos:') >= 0, '4.10 próximos passos presentes');
H.ok(msg.indexOf('🧾 Atualizações:') >= 0, '4.11 timeline de atualizações');
H.ok(msg.indexOf('Xerox — Suporte de campo') >= 0, '4.12 equipe da contratada citada');

const crit = Object.assign({}, sample, { status: 'critico' });
H.ok(F.buildMessage(crit).indexOf('*Status:* 🔴 Crítico / Indisponível') >= 0, '4.13 mensagem crítica com dot vermelho');
const done = Object.assign({}, sample, { status: 'normalizado' });
H.ok(F.buildMessage(done).indexOf('*Status:* 🟢 Normalizado') >= 0, '4.14 mensagem normalizada com dot verde');

/* ==================== 5. ARQUIVO ==================== */
H.section('5. Nome de arquivo');

const fn = F.fileName(sample, 'txt');
H.ok(/^FLASH-REPORT_falha-no-servidor-de-impressao_\d{4}-\d{2}-\d{2}\.txt$/.test(fn), '5.1 slug pt-BR sem acento: ' + fn);

H.report('FLASH REPORT');
