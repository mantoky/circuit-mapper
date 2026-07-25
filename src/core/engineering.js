/**
 * MOTOR DE CALCULO ELETRICO - referencias ABNT NBR 5410:2004
 * ------------------------------------------------------------------
 * Valores tabelados reproduzidos como REFERENCIA DE PROJETO.
 * O laudo final deve ser assinado por profissional habilitado (ART/CREA).
 */

const RHO_CU = 1 / 56;   // 0,01786 ohm.mm2/m - cobre a 70 C
const SQRT3 = Math.sqrt(3);

/** Serie comercial de disjuntores (A) */
const BREAKER_SERIES = [6, 10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630, 800];

/** Secoes comerciais de condutores de cobre (mm2) */
const SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];

/**
 * Capacidade de conducao de corrente - Iz base (A), cobre.
 * NBR 5410 Tabelas 36 e 37 (metodos A1..F), 2 ou 3 condutores carregados.
 * Estrutura: AMPACITY[isolacao][metodo][nCondutoresCarregados][secao]
 */
const AMPACITY = {
  PVC: {
    B1: {
      2: { 1.5: 17.5, 2.5: 24, 4: 32, 6: 41, 10: 57, 16: 76, 25: 101, 35: 125, 50: 151, 70: 192, 95: 232, 120: 269, 150: 309, 185: 353, 240: 415 },
      3: { 1.5: 15.5, 2.5: 21, 4: 28, 6: 36, 10: 50, 16: 68, 25: 89, 35: 110, 50: 134, 70: 171, 95: 207, 120: 239, 150: 275, 185: 314, 240: 369 },
    },
    B2: {
      2: { 1.5: 16.5, 2.5: 23, 4: 30, 6: 38, 10: 52, 16: 69, 25: 90, 35: 111, 50: 133, 70: 168, 95: 201, 120: 232, 150: 258, 185: 294, 240: 344 },
      3: { 1.5: 15, 2.5: 20, 4: 27, 6: 34, 10: 46, 16: 62, 25: 80, 35: 99, 50: 118, 70: 149, 95: 179, 120: 206, 150: 225, 185: 255, 240: 297 },
    },
    A1: {
      2: { 1.5: 15.5, 2.5: 21, 4: 28, 6: 36, 10: 50, 16: 68, 25: 89, 35: 111, 50: 134, 70: 171, 95: 207, 120: 239, 150: 262, 185: 296, 240: 346 },
      3: { 1.5: 14, 2.5: 18, 4: 25, 6: 32, 10: 43, 16: 57, 25: 75, 35: 92, 50: 110, 70: 139, 95: 167, 120: 192, 150: 219, 185: 248, 240: 291 },
    },
    C: {
      2: { 1.5: 19.5, 2.5: 27, 4: 36, 6: 46, 10: 63, 16: 85, 25: 112, 35: 138, 50: 168, 70: 213, 95: 258, 120: 299, 150: 344, 185: 392, 240: 461 },
      3: { 1.5: 17.5, 2.5: 24, 4: 32, 6: 41, 10: 57, 16: 76, 25: 96, 35: 119, 50: 144, 70: 184, 95: 223, 120: 259, 150: 299, 185: 341, 240: 403 },
    },
    E: {
      2: { 1.5: 22, 2.5: 30, 4: 40, 6: 51, 10: 70, 16: 94, 25: 119, 35: 148, 50: 180, 70: 232, 95: 282, 120: 328, 150: 379, 185: 434, 240: 514 },
      3: { 1.5: 18.5, 2.5: 25, 4: 34, 6: 43, 10: 60, 16: 80, 25: 101, 35: 126, 50: 153, 70: 196, 95: 238, 120: 276, 150: 319, 185: 364, 240: 430 },
    },
  },
  EPR: {
    B1: {
      2: { 1.5: 23, 2.5: 31, 4: 42, 6: 54, 10: 75, 16: 100, 25: 133, 35: 164, 50: 198, 70: 253, 95: 306, 120: 354, 150: 393, 185: 449, 240: 528 },
      3: { 1.5: 20, 2.5: 28, 4: 37, 6: 48, 10: 66, 16: 88, 25: 117, 35: 144, 50: 175, 70: 222, 95: 269, 120: 312, 150: 342, 185: 384, 240: 450 },
    },
    B2: {
      2: { 1.5: 22, 2.5: 30, 4: 40, 6: 51, 10: 69, 16: 91, 25: 119, 35: 146, 50: 175, 70: 221, 95: 265, 120: 305, 150: 334, 185: 384, 240: 459 },
      3: { 1.5: 19.5, 2.5: 26, 4: 35, 6: 44, 10: 60, 16: 80, 25: 105, 35: 128, 50: 154, 70: 194, 95: 233, 120: 268, 150: 300, 185: 340, 240: 398 },
    },
    C: {
      2: { 1.5: 26, 2.5: 36, 4: 49, 6: 63, 10: 86, 16: 115, 25: 149, 35: 185, 50: 225, 70: 289, 95: 352, 120: 410, 150: 473, 185: 542, 240: 641 },
      3: { 1.5: 23, 2.5: 32, 4: 42, 6: 54, 10: 75, 16: 100, 25: 127, 35: 158, 50: 192, 70: 246, 95: 298, 120: 346, 150: 399, 185: 456, 240: 538 },
    },
    E: {
      2: { 1.5: 29, 2.5: 40, 4: 54, 6: 68, 10: 94, 16: 126, 25: 160, 35: 200, 50: 242, 70: 310, 95: 377, 120: 437, 150: 504, 185: 575, 240: 679 },
      3: { 1.5: 25, 2.5: 34, 4: 45, 6: 57, 10: 79, 16: 105, 25: 133, 35: 165, 50: 200, 70: 256, 95: 311, 120: 361, 150: 418, 185: 477, 240: 565 },
    },
  },
};
AMPACITY.XLPE = AMPACITY.EPR; // mesma classe termica 90 C

/**
 * Metodos de instalacao com tabela de ampacidade implementada.
 * O schema so oferece estas opcoes; metodos fora desta lista (A2/D/F)
 * fazem baseAmpacity devolver 0 e sao sinalizados pela validacao.
 */
const SUPPORTED_METHODS = ['A1', 'B1', 'B2', 'C', 'E'];

function isMethodSupported(insulation, installMethod) {
  const ins = AMPACITY[insulation] ? insulation : 'PVC';
  return !!(AMPACITY[ins] && AMPACITY[ins][installMethod]);
}

/** Secao minima por finalidade - NBR 5410 Tabela 47 */
const MIN_SECTION = {
  'Iluminacao': 1.5,
  'Tomadas (TUG)': 2.5,
  'Tomadas Especificas (TUE)': 2.5,
  'Forca Motriz': 2.5,
  'Comando e Controle': 0.5,
  'Instrumentacao': 0.5,
  'Telecom': 0.5,
  'Emergencia / No-break': 2.5,
  default: 1.5,
};

/** Limites de queda de tensao (%) - NBR 5410 6.2.7 */
const VOLTAGE_DROP_LIMIT = { terminal: 4, feeder: 2, total: 5 };

function num(v, fallback = 0) {
  if (v === null || v === undefined || v === '') return fallback;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

/** Numero de condutores carregados a partir da fase declarada */
function loadedConductors(phase) {
  const p = String(phase || '').toUpperCase();
  if (p === 'RST') return 3;
  if (p.length === 2) return 2;
  return 2; // monofasico F+N = 2 condutores carregados
}

/** Fator de multiplicacao de tensao: 1F=1, 2F=1, 3F=sqrt(3) */
function isThreePhase(phase) {
  return String(phase || '').toUpperCase() === 'RST';
}

/**
 * Corrente de projeto Ib (A).
 * 1F: Ib = P / (V . cos phi)      3F: Ib = P / (sqrt3 . V . cos phi)
 */
function designCurrent({ powerW, tension, powerFactor, phase }) {
  const p = num(powerW);
  const v = num(tension, 220);
  const fp = num(powerFactor, 0.92) || 0.92;
  if (!p || !v) return 0;
  const denom = isThreePhase(phase) ? SQRT3 * v * fp : v * fp;
  return round(p / denom, 2);
}

/** Iz base tabelado. Metodo/isolacao nao suportados => 0 (sem fallback silencioso). */
function baseAmpacity({ section, insulation, installMethod, phase }) {
  const ins = AMPACITY[insulation] ? insulation : 'PVC';
  if (!AMPACITY[ins] || !AMPACITY[ins][installMethod]) return 0;
  const table = AMPACITY[ins][installMethod];
  const n = loadedConductors(phase);
  const s = num(section);
  return num(table[n] && table[n][s], 0);
}

/** Iz corrigida = Iz_base . FCA . FCT */
function correctedAmpacity(circuit) {
  const base = baseAmpacity(circuit);
  const fca = num(circuit.fca, 1) || 1;
  const fct = num(circuit.fct, 1) || 1;
  return round(base * fca * fct, 2);
}

/** Menor disjuntor comercial >= corrente informada */
function nextBreaker(current) {
  const i = num(current);
  return BREAKER_SERIES.find((b) => b >= i) || BREAKER_SERIES[BREAKER_SERIES.length - 1];
}

/** Queda de tensao percentual */
function voltageDrop(circuit) {
  const L = num(circuit.length);
  const S = num(circuit.section);
  const V = num(circuit.tension, 220);
  const fp = num(circuit.powerFactor, 0.92) || 0.92;
  const Ib = num(circuit.ip) || designCurrent(circuit);
  if (!L || !S || !V || !Ib) return 0;
  const k = isThreePhase(circuit.phase) ? SQRT3 : 2;
  const dv = (k * RHO_CU * L * Ib * fp) / S;
  return round((dv / V) * 100, 2);
}

/** Secao minima do condutor de protecao - NBR 5410 Tabela 58 */
function protectiveConductorSection(section) {
  const s = num(section);
  if (!s) return 0;
  if (s <= 16) return s;
  if (s <= 35) return 16;
  return Math.ceil(s / 2);
}

/**
 * Dimensionamento automatico: sugere secao e disjuntor a partir da carga.
 * Retorna a menor secao que atende Ib <= In <= Iz e queda de tensao <= limite.
 */
function autoSize(circuit, purpose) {
  const Ib = num(circuit.ip) || designCurrent(circuit);
  if (!Ib) return null;
  const minS = MIN_SECTION[purpose] || MIN_SECTION.default;
  const breaker = nextBreaker(Ib);
  for (const s of SECTIONS) {
    if (s < minS) continue;
    const trial = { ...circuit, section: s, ip: Ib };
    const Iz = correctedAmpacity(trial);
    if (Iz < breaker) continue;
    const dv = voltageDrop(trial);
    if (dv > VOLTAGE_DROP_LIMIT.terminal) continue;
    return {
      section: s,
      breaker,
      iz: Iz,
      ib: round(Ib, 2),
      voltageDrop: dv,
      peSection: protectiveConductorSection(s),
    };
  }
  return { section: null, breaker, ib: round(Ib, 2), iz: 0, voltageDrop: null, peSection: 0 };
}

function round(n, d = 2) {
  const f = Math.pow(10, d);
  return Math.round((n + Number.EPSILON) * f) / f;
}

module.exports = {
  RHO_CU, SQRT3, BREAKER_SERIES, SECTIONS, AMPACITY, MIN_SECTION, VOLTAGE_DROP_LIMIT,
  SUPPORTED_METHODS, isMethodSupported,
  num, round, isThreePhase, loadedConductors,
  designCurrent, baseAmpacity, correctedAmpacity, nextBreaker,
  voltageDrop, protectiveConductorSection, autoSize,
};
