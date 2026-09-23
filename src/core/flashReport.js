/**
 * FLASH REPORT — falhas em ambiente de TI / LTE
 * ------------------------------------------------------------------
 * Modulo puro (CommonJS): modelo, catalogos, demo e formatacao
 * para WhatsApp / Teams / e-mail operacional.
 * Sem dependencia de React — testavel em Node.
 */

const KINDS = [
  { id: 'INFORMATIVO', label: 'Informativo', emoji: '📢' },
  { id: 'ALERTA', label: 'Alerta', emoji: '🚨' },
  { id: 'ATUALIZACAO', label: 'Atualizacao', emoji: '🔄' },
  { id: 'NORMALIZACAO', label: 'Normalizacao', emoji: '✅' },
];

const ENVIRONMENTS = [
  { id: 'TI', label: 'TI' },
  { id: 'LTE', label: 'LTE' },
  { id: 'TI+LTE', label: 'TI + LTE' },
];

const SEVERITIES = [
  { id: 'critica', label: 'Critica', emoji: '🔴' },
  { id: 'alta', label: 'Alta', emoji: '🟠' },
  { id: 'media', label: 'Media', emoji: '🟡' },
  { id: 'baixa', label: 'Baixa', emoji: '🟢' },
];

const STATUSES = [
  { id: 'identificado', label: 'Identificado', emoji: '🔵' },
  { id: 'em_analise', label: 'Em analise', emoji: '🟣' },
  { id: 'em_atendimento', label: 'Em atendimento', emoji: '🟡' },
  { id: 'monitorando', label: 'Monitorando', emoji: '🟠' },
  { id: 'normalizado', label: 'Normalizado', emoji: '🟢' },
  { id: 'encerrado', label: 'Encerrado', emoji: '⚪' },
];

function findById(list, id) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) return list[i];
  }
  return null;
}

function kindInfo(id) {
  return findById(KINDS, id) || KINDS[0];
}

function statusInfo(id) {
  return findById(STATUSES, id) || STATUSES[2];
}

function severityInfo(id) {
  return findById(SEVERITIES, id) || SEVERITIES[2];
}

function environmentInfo(id) {
  return findById(ENVIRONMENTS, id) || ENVIRONMENTS[0];
}

function nowLocalStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyFlashReport(overrides) {
  const base = {
    id: `fr_${Date.now().toString(36)}`,
    kind: 'INFORMATIVO',
    area: 'GER TECN ATEND PA',
    environment: 'TI',
    title: '',
    description: '',
    locations: [],
    reason: '',
    situation: '',
    status: 'em_atendimento',
    severity: 'alta',
    services: [],
    impact: '',
    workaround: '',
    ticket: '',
    startedAt: nowLocalStamp(),
    updatedAt: nowLocalStamp(),
    eta: '',
    updateNumber: 1,
    teams: [],
    responsible: '',
    contact: '',
    client: '',
    contractor: '',
    clientLogo: null,
    contractorLogo: null,
    notes: '',
  };
  return overrides ? Object.assign({}, base, overrides) : base;
}

/** Caso real de referencia: falha no servidor de impressao (Vale / Xerox). */
function demoFlashReport() {
  return emptyFlashReport({
    id: 'fr_demo_print',
    kind: 'INFORMATIVO',
    area: 'GER TECN ATEND PA',
    environment: 'TI',
    title: 'FALHA NO SERVIDOR DE IMPRESSAO',
    description: 'Indisponibilidade do servico de impressao e digitalizacao em rede.',
    locations: ['Serra Leste', 'Serra Norte', 'Serra Sul'],
    reason: 'Falha no servidor de impressao da Vale.',
    situation: 'Em andamento. Time da Xerox ja esta atuando para normalizacao.',
    status: 'em_atendimento',
    severity: 'alta',
    services: ['Impressao em rede', 'Digitalizacao', 'Filas de impressao'],
    impact: 'Usuarios das tres unidades Serra sem saida de impressao e sem digitalizacao.',
    workaround: 'Usar impressoras locais USB onde disponivel; digitalizacao via e-mail scan nas multifuncionais offline.',
    ticket: 'INC-2026-0412',
    startedAt: '2026-03-18 08:42',
    updatedAt: '2026-03-18 09:15',
    eta: '2026-03-18 12:00',
    updateNumber: 1,
    teams: ['Xerox', 'TI Vale - Atendimento PA'],
    responsible: 'Time Xerox',
    contact: 'Plantao TI PA — ramal 3400',
    client: 'Vale S.A.',
    contractor: 'Xerox',
    notes: 'Proximo flash report sera emitido apos diagnostico do servidor ou normalizacao.',
  });
}

function joinList(items, conj) {
  const list = (items || []).map((s) => String(s).trim()).filter(Boolean);
  if (!list.length) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} e ${list[1]}`;
  const last = list[list.length - 1];
  return `${list.slice(0, -1).join(', ')}${conj || ' e '}${last}`;
}

function parseList(text) {
  if (Array.isArray(text)) {
    return text.map((s) => String(s).trim()).filter(Boolean);
  }
  return String(text || '')
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatHeaderLine(report) {
  const k = kindInfo(report.kind);
  const area = (report.area || '').trim() || 'OPERACAO';
  const upd = Number(report.updateNumber) > 1 ? ` · #${report.updateNumber}` : '';
  return `${k.emoji} FLASH REPORT | ${k.id}${upd} - ${area}`;
}

/**
 * Mensagem pronta para colar em WhatsApp / Teams.
 * Campos vazios sao omitidos para manter o flash enxuto.
 */
function formatWhatsApp(report) {
  const r = report || emptyFlashReport();
  const st = statusInfo(r.status);
  const sev = severityInfo(r.severity);
  const env = environmentInfo(r.environment);
  const lines = [];

  lines.push(formatHeaderLine(r));
  lines.push('');

  if (r.title) {
    lines.push(`*${String(r.title).trim().toUpperCase()}*`);
  }
  if (r.description) {
    lines.push(String(r.description).trim());
  }

  const meta = [];
  if (r.environment) meta.push(`🖥️ Ambiente: ${env.label}`);
  if (r.severity) meta.push(`${sev.emoji} Severidade: ${sev.label}`);
  if (r.ticket) meta.push(`🎫 Chamado: ${r.ticket}`);
  if (meta.length) {
    lines.push('');
    meta.forEach((m) => lines.push(m));
  }

  const locs = joinList(r.locations);
  if (locs) {
    lines.push('');
    lines.push(`📍 Locais Afetados: ${locs}`);
  }

  const svcs = joinList(r.services);
  if (svcs) {
    lines.push(`🛠️ Servicos Impactados: ${svcs}`);
  }

  if (r.impact) {
    lines.push(`👥 Impacto: ${String(r.impact).trim()}`);
  }

  if (r.reason) {
    lines.push('');
    lines.push(`Motivo: ${String(r.reason).trim()}`);
  }

  if (r.situation) {
    lines.push('');
    lines.push(`*Situacao Atual:* ${String(r.situation).trim()}`);
  }

  if (r.workaround) {
    lines.push(`*Contorno:* ${String(r.workaround).trim()}`);
  }

  lines.push('');
  lines.push(`*Status:* ${st.emoji} ${st.label}`);

  const timeline = [];
  if (r.startedAt) timeline.push(`Inicio: ${r.startedAt}`);
  if (r.updatedAt) timeline.push(`Atualizado: ${r.updatedAt}`);
  if (r.eta) timeline.push(`Previsao: ${r.eta}`);
  if (timeline.length) {
    lines.push('');
    lines.push(`⏱️ ${timeline.join('  ·  ')}`);
  }

  const parties = [];
  if (r.client) parties.push(`Contratante: ${r.client}`);
  if (r.contractor) parties.push(`Contratada: ${r.contractor}`);
  const teams = joinList(r.teams);
  if (teams) parties.push(`Times: ${teams}`);
  if (r.responsible) parties.push(`Responsavel: ${r.responsible}`);
  if (r.contact) parties.push(`Contato: ${r.contact}`);
  if (parties.length) {
    lines.push('');
    parties.forEach((p) => lines.push(p));
  }

  if (r.notes) {
    lines.push('');
    lines.push(`_Obs.: ${String(r.notes).trim()}_`);
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/** Texto curto para assunto de e-mail / titulo de card. */
function formatSubject(report) {
  const r = report || emptyFlashReport();
  const k = kindInfo(r.kind);
  const title = (r.title || 'Flash Report').trim();
  const ticket = r.ticket ? ` [${r.ticket}]` : '';
  return `${k.emoji} ${k.id}${ticket} — ${title}`;
}

function validateFlashReport(report) {
  const issues = [];
  if (!report || typeof report !== 'object') {
    return [{ code: 'FR00', level: 'error', message: 'Relatorio invalido.' }];
  }
  if (!String(report.title || '').trim()) {
    issues.push({ code: 'FR01', level: 'error', message: 'Titulo da falha e obrigatorio.' });
  }
  if (!String(report.description || '').trim()) {
    issues.push({ code: 'FR02', level: 'warn', message: 'Descricao vazia — o flash fica incompleto.' });
  }
  if (!(report.locations || []).length) {
    issues.push({ code: 'FR03', level: 'warn', message: 'Nenhum local afetado informado.' });
  }
  if (!String(report.status || '').trim()) {
    issues.push({ code: 'FR04', level: 'error', message: 'Status e obrigatorio.' });
  }
  if (!findById(STATUSES, report.status)) {
    issues.push({ code: 'FR05', level: 'error', message: `Status desconhecido: ${report.status}` });
  }
  if (!findById(KINDS, report.kind)) {
    issues.push({ code: 'FR06', level: 'error', message: `Tipo desconhecido: ${report.kind}` });
  }
  return issues;
}

module.exports = {
  KINDS,
  ENVIRONMENTS,
  SEVERITIES,
  STATUSES,
  kindInfo,
  statusInfo,
  severityInfo,
  environmentInfo,
  emptyFlashReport,
  demoFlashReport,
  joinList,
  parseList,
  formatHeaderLine,
  formatWhatsApp,
  formatSubject,
  validateFlashReport,
  nowLocalStamp,
};
