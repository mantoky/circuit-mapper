/**
 * Sala de Controle - Paleta cromatica tecnica/energia
 * Base: Navy profundo (control room) + Ciano Eletrico (energia/fluxo)
 * Status (conforme/ressalva/NC) e fases (R/S/T/N/PE) seguem padroes industriais.
 * Contraste minimo AA garantido para leitura em HMI/SCADA e campo.
 */
export const colors = {
  // --- Superficies (Navy ramp) ---
  bg: '#0E1A2B',          // Fundo principal - Navy profundo (sala de controle)
  bgDeep: '#0A1422',      // Fundo de headers / barras
  surface: '#16263D',     // Cards e linhas da arvore
  surfaceAlt: '#1C2E47',  // Linha alternada / hover
  surfaceHigh: '#243B5C', // Inputs e campos editaveis
  overlay: 'rgba(6,12,22,0.78)', // Backdrop dos modais

  // --- Marca / Acao (Ciano Eletrico) ---
  primary: '#22D3EE',      // Ciano eletrico - energia/fluxo
  primaryDark: '#06B6D4',  // Pressed state
  primarySoft: 'rgba(34,211,238,0.14)', // Fundo de badges
  onPrimary: '#06141F',    // Texto sobre ciano

  // --- Texto ---
  text: '#E6EDF3',
  textMuted: '#9FB3C8',
  textDim: '#6B829E',

  // --- Semantica de engenharia (status NBR 5410) ---
  ok: '#34D399',           // Conforme
  warn: '#FBBF24',         // Atencao / verificar
  danger: '#F87171',       // Nao conforme
  info: '#60A5FA',         // Informativo
  okSoft: 'rgba(52,211,153,0.14)',
  warnSoft: 'rgba(251,191,36,0.14)',
  dangerSoft: 'rgba(248,113,113,0.14)',
  infoSoft: 'rgba(96,165,250,0.14)',

  // --- Fases eletricas (padrao industrial BR, ajustadas p/ navy) ---
  phaseR: '#F87171',       // Fase R - Vermelho
  phaseS: '#E6EDF3',       // Fase S - Branco
  phaseT: '#60A5FA',       // Fase T - Azul
  neutral: '#38BDF8',      // Neutro - Azul claro
  ground: '#34D399',       // PE - Verde

  border: '#2A3F5F',
  borderStrong: '#3A5275',
  transparent: 'transparent',
};

/** Cor associada a fase para os chips da arvore */
export function phaseColor(phase) {
  const p = String(phase || '').toUpperCase().trim();
  if (p === 'R' || p === 'L1') return colors.phaseR;
  if (p === 'S' || p === 'L2') return colors.phaseS;
  if (p === 'T' || p === 'L3') return colors.phaseT;
  if (p === 'N') return colors.neutral;
  if (p === 'PE' || p === 'TERRA') return colors.ground;
  return colors.primary; // trifasico RST / nao definido
}

/** Cor de status a partir do resultado de validacao */
export function statusColor(status) {
  switch (status) {
    case 'ok': return colors.ok;
    case 'warn': return colors.warn;
    case 'error': return colors.danger;
    default: return colors.textDim;
  }
}
