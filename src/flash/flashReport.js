/**
 * FLASH REPORT — núcleo puro (CommonJS, sem dependências)
 * ------------------------------------------------------------------
 * Gera informativos de falha em ambiente de TI / LTE com identidade
 * visual da contratada + contratante. O mesmo módulo alimenta o app
 * web (bundle single-file) e pode ser reusado no app Expo.
 *
 * Formato de saída espelha o padrão operacional:
 *   📢 FLASH REPORT | INFORMATIVO - GER TECN ATEND PA
 */
'use strict';

/** Setor padrão do informativo (cabeçalho operacional). */
var DEFAULT_SECTOR = 'GER TECN ATEND PA';

/** Categorias de falha cobertas pelo app. */
var CATEGORIES = [
  'TI',
  'LTE',
  'Impressão',
  'Rede / Links',
  'Energia',
  'Servidor',
  'Segurança',
  'Telefonia',
  'Outros',
];

/** Locais recorrentes (chips de seleção rápida). */
var PRESET_PLACES = [
  'Serra Leste',
  'Serra Norte',
  'Serra Sul',
  'Serra Verde',
  'S11D',
  'Carajás',
];

/**
 * Status possíveis do atendimento. `dot` é o indicador colorido usado
 * no texto do WhatsApp e no cartão de impressão.
 */
var STATUSES = [
  { id: 'em_atendimento', label: 'Em atendimento', dot: '🟡' },
  { id: 'critico', label: 'Crítico / Indisponível', dot: '🔴' },
  { id: 'monitorando', label: 'Monitorando', dot: '⚪' },
  { id: 'normalizado', label: 'Normalizado', dot: '🟢' },
];

function statusMeta(statusId) {
  switch (statusId) {
    case 'em_atendimento':
      return STATUSES[0];
    case 'critico':
      return STATUSES[1];
    case 'monitorando':
      return STATUSES[2];
    case 'normalizado':
      return STATUSES[3];
    default: {
      // Checagem exaustiva: novo status precisa ganhar um case acima.
      var unexpected = statusId;
      throw new Error('Status de flash report desconhecido: ' + unexpected);
    }
  }
}

/** Gera um id estável sem depender de libs externas. */
function buildId() {
  return (
    'fr_' +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

function pad2(n) {
  return (n < 10 ? '0' : '') + n;
}

/** dd/mm/aaaa hh:mm a partir de Date, string ISO ou datetime-local. */
function formatDateTime(value) {
  if (!value) return '';
  var d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return (
    pad2(d.getDate()) +
    '/' +
    pad2(d.getMonth() + 1) +
    '/' +
    d.getFullYear() +
    ' ' +
    pad2(d.getHours()) +
    ':' +
    pad2(d.getMinutes())
  );
}

/** "2026-09-23T10:30" — valor padrão para <input type="datetime-local">. */
function toLocalInput(value) {
  var d = value instanceof Date ? value : new Date(value || Date.now());
  if (isNaN(d.getTime())) d = new Date();
  return (
    d.getFullYear() +
    '-' +
    pad2(d.getMonth() + 1) +
    '-' +
    pad2(d.getDate()) +
    'T' +
    pad2(d.getHours()) +
    ':' +
    pad2(d.getMinutes())
  );
}

/** Duração legível entre início e referência (previsão ou agora). */
function durationBetween(startValue, endValue) {
  if (!startValue) return '';
  var start = new Date(startValue);
  var end = endValue ? new Date(endValue) : new Date();
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
  var ms = end.getTime() - start.getTime();
  if (ms < 0) return '';
  var min = Math.floor(ms / 60000);
  if (min < 1) return 'menos de 1 min';
  if (min < 60) return min + ' min';
  var h = Math.floor(min / 60);
  var m = min % 60;
  if (h < 24) return m ? h + 'h ' + m + 'min' : h + 'h';
  var d = Math.floor(h / 24);
  var hh = h % 24;
  return hh ? d + 'd ' + hh + 'h' : d + 'd';
}

/** Relatório em branco, pronto para o formulário. */
function defaultReport() {
  var now = toLocalInput(new Date());
  return {
    id: buildId(),
    sector: DEFAULT_SECTOR,
    title: '',
    subtitle: '',
    category: 'TI',
    status: 'em_atendimento',
    places: [],
    startAt: now,
    forecastAt: '',
    reason: '',
    situation: '',
    nextSteps: '',
    impact: '',
    ticket: '',
    ownerTeam: '',
    vendorTeam: '',
    contact: '',
    author: '',
    contractorName: '',
    contractorLogo: null,
    clientName: '',
    clientLogo: null,
    updates: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Caso de exemplo: falha no servidor de impressão (Xerox). */
function sampleReport() {
  var r = defaultReport();
  r.sector = 'GER TECN ATEND PA';
  r.title = 'FALHA NO SERVIDOR DE IMPRESSÃO';
  r.subtitle = 'Indisponibilidade do serviço de impressão e digitalização em rede.';
  r.category = 'Impressão';
  r.status = 'em_atendimento';
  r.places = ['Serra Leste', 'Serra Norte', 'Serra Sul'];
  r.startAt = toLocalInput(new Date(Date.now() - 2 * 3600000));
  r.forecastAt = toLocalInput(new Date(Date.now() + 4 * 3600000));
  r.reason = 'Falha no servidor de impressão da Vale.';
  r.situation = 'Em andamento. Time da Xerox já está atuando para normalização.';
  r.nextSteps = 'Reinicialização do serviço de spooler e validação das filas por site.';
  r.impact = 'Impressão e digitalização em rede indisponíveis nos três sites.';
  r.ticket = 'INC-2026-0917';
  r.ownerTeam = 'GER TECN ATEND PA — Vale';
  r.vendorTeam = 'Xerox — Suporte de campo';
  r.contact = 'Ramal 0800 / Teams da planta';
  r.author = 'Técnico de plantão';
  r.contractorName = 'Xerox';
  r.clientName = 'Vale';
  r.updates = [
    {
      at: new Date(Date.now() - 3600000).toISOString(),
      text: 'Time Xerox acionado e com acesso remoto ao servidor.',
    },
  ];
  return r;
}

/**
 * Validação do formulário. Devolve a lista de pendências
 * (vazia = pronto para publicar).
 */
function validate(report) {
  var pending = [];
  if (!report) return ['Relatório vazio.'];
  if (!String(report.title || '').trim()) pending.push('Informe o título da falha.');
  if (!String(report.subtitle || '').trim()) pending.push('Descreva o serviço afetado (subtítulo).');
  if (!Array.isArray(report.places) || !report.places.length)
    pending.push('Selecione ao menos um local afetado.');
  if (!String(report.reason || '').trim()) pending.push('Informe o motivo / causa.');
  if (!String(report.situation || '').trim())
    pending.push('Descreva a situação atual do atendimento.');
  if (!String(report.startAt || '').trim()) pending.push('Informe o início da ocorrência.');
  try {
    statusMeta(report.status);
  } catch (e) {
    pending.push('Selecione um status válido.');
  }
  if (CATEGORIES.indexOf(report.category) < 0) pending.push('Selecione uma categoria válida.');
  return pending;
}

/** "a, b e c" — formata a lista de locais. */
function joinPlaces(places) {
  var list = (places || []).map(function (p) {
    return String(p).trim();
  }).filter(Boolean);
  if (!list.length) return '—';
  if (list.length === 1) return list[0];
  return list.slice(0, -1).join(', ') + ' e ' + list[list.length - 1];
}

function line(label, value) {
  if (!value) return '';
  return label + ' ' + value;
}

/**
 * Monta o texto pronto para WhatsApp/Teams, no padrão operacional.
 * Usa *negrito* e _itálico_ (sintaxe do WhatsApp).
 */
function buildMessage(report) {
  var r = Object.assign({}, defaultReport(), report || {});
  var meta = statusMeta(r.status);
  var places = joinPlaces(r.places);
  var duration = durationBetween(r.startAt, r.forecastAt || undefined);
  var L = [];

  L.push('📢 FLASH REPORT | INFORMATIVO - ' + (r.sector || DEFAULT_SECTOR).toUpperCase());
  L.push('');
  L.push('*' + String(r.title || 'FALHA EM AMBIENTE DE TI/LTE').toUpperCase() + '*');
  if (r.subtitle) L.push(String(r.subtitle).trim());
  L.push('');
  L.push('📍 Locais Afetados: ' + places);
  L.push('📂 Categoria: ' + r.category);
  var timeBits = [];
  if (r.startAt) timeBits.push('Início: ' + formatDateTime(r.startAt));
  if (r.forecastAt) timeBits.push('Previsão: ' + formatDateTime(r.forecastAt));
  if (duration) timeBits.push('Duração: ' + duration);
  if (timeBits.length) L.push('🕐 ' + timeBits.join('  |  '));
  if (r.ticket) L.push('🔖 Chamado: ' + r.ticket);
  if (r.impact) L.push('💥 Impacto: ' + r.impact);
  L.push('');
  if (r.reason) {
    L.push('Motivo: ' + r.reason);
    L.push('');
  }
  if (r.situation) {
    L.push('*Situação Atual:* ' + r.situation);
    L.push('');
  }
  if (r.nextSteps) {
    L.push('➡️ Próximos passos: ' + r.nextSteps);
    L.push('');
  }
  var team = [r.vendorTeam, r.ownerTeam].filter(Boolean).join('  ·  ');
  if (team) L.push('👥 ' + team);
  if (r.contact) L.push('☎️ Contato: ' + r.contact);
  if (team || r.contact) L.push('');
  if (Array.isArray(r.updates) && r.updates.length) {
    L.push('🧾 Atualizações:');
    r.updates.forEach(function (u) {
      var when = u && u.at ? formatDateTime(u.at) : '';
      L.push('• ' + (when ? '(' + when + ') ' : '') + (u ? u.text : ''));
    });
    L.push('');
  }
  L.push('*Status:* ' + meta.dot + ' ' + meta.label);
  var foot = [];
  if (r.author) foot.push(r.author);
  foot.push('Atualizado em ' + formatDateTime(new Date()));
  L.push('_' + foot.join(' — ') + '_');

  return L.join('\n');
}

/**
 * Nome de arquivo seguro para impressão/PDF.
 * Ex.: FLASH-REPORT_falha-no-servidor-de-impressao_2026-09-23.txt
 */
function fileName(report, ext) {
  var base = String((report && report.title) || 'flash-report')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'flash-report';
  var d = new Date().toISOString().slice(0, 10);
  return 'FLASH-REPORT_' + base + '_' + d + '.' + (ext || 'txt');
}

module.exports = {
  DEFAULT_SECTOR: DEFAULT_SECTOR,
  CATEGORIES: CATEGORIES,
  PRESET_PLACES: PRESET_PLACES,
  STATUSES: STATUSES,
  statusMeta: statusMeta,
  buildId: buildId,
  formatDateTime: formatDateTime,
  toLocalInput: toLocalInput,
  durationBetween: durationBetween,
  defaultReport: defaultReport,
  sampleReport: sampleReport,
  validate: validate,
  joinPlaces: joinPlaces,
  buildMessage: buildMessage,
  fileName: fileName,
};
