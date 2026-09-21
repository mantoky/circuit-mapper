/**
 * CONSTANTES COSMICAS E FISICAS FUNDAMENTAIS - referencia CODATA 2022
 * ------------------------------------------------------------------
 * Repositorio central de constantes universais e de materiais
 * eletrotecnicos usadas pelo motor de calculo (`engineering.js`).
 *
 * - Valores universais seguem o CODATA 2022 / SI 2019 (h, e, kB, NA
 *   e c sao exatos por definicao do SI; demais trazem a incerteza
 *   relativa de referencia quando relevante).
 * - Constantes cosmologicas/astrofisicas (H0, T_CMB, ...) sao valores
 *   de referencia observacional (Planck 2018 / IAU) e estao marcadas
 *   com `approx: true`: nao usar em laudo como valor exato.
 * - Constantes de engenharia (RHO_CU, RHO_AL, ...) sao valores de
 *   projeto a 70 C ja adotados pela NBR 5410 no `engineering.js`.
 *
 * CommonJS de proposito: o mesmo modulo roda no Metro (RN), no Node
 * (testes) e no bundle web de arquivo unico.
 */

const SOURCE_CODATA = 'CODATA 2022';
const SOURCE_SI = 'SI 2019 (exato por definicao)';
const SOURCE_IAU = 'IAU / Planck 2018 (referencia observacional)';

/**
 * Tabela mestra. Cada entrada: { symbol, name, value, unit, category,
 *   source, exact?, approx?, note? }.
 * Categorias: 'universal' | 'eletromagnetica' | 'atomica' |
 *   'termodinamica' | 'cosmica' | 'engenharia'.
 */
const CONSTANTS = {
  // ---- Universais ----
  c: {
    symbol: 'c', name: 'Velocidade da luz no vacuo',
    value: 299792458, unit: 'm/s', category: 'universal',
    source: SOURCE_SI, exact: true,
  },
  G: {
    symbol: 'G', name: 'Constante gravitacional',
    value: 6.6743e-11, unit: 'm3/(kg.s2)', category: 'universal',
    source: SOURCE_CODATA,
    note: 'Incerteza relativa ~2,2e-5; nao usar alta precisao sem revisar.',
  },
  h: {
    symbol: 'h', name: 'Constante de Planck',
    value: 6.62607015e-34, unit: 'J.s', category: 'universal',
    source: SOURCE_SI, exact: true,
  },
  hbar: {
    symbol: 'hbar', name: 'Constante de Planck reduzida (h/2pi)',
    value: 1.054571817e-34, unit: 'J.s', category: 'universal',
    source: SOURCE_SI, exact: true,
  },
  e: {
    symbol: 'e', name: 'Carga elementar',
    value: 1.602176634e-19, unit: 'C', category: 'universal',
    source: SOURCE_SI, exact: true,
  },
  kB: {
    symbol: 'kB', name: 'Constante de Boltzmann',
    value: 1.380649e-23, unit: 'J/K', category: 'universal',
    source: SOURCE_SI, exact: true,
  },
  NA: {
    symbol: 'NA', name: 'Constante de Avogadro',
    value: 6.02214076e23, unit: 'mol-1', category: 'universal',
    source: SOURCE_SI, exact: true,
  },

  // ---- Eletromagneticas ----
  mu0: {
    symbol: 'mu0', name: 'Permeabilidade magnetica do vacuo',
    value: 1.25663706212e-6, unit: 'N/A2', category: 'eletromagnetica',
    source: SOURCE_CODATA,
  },
  epsilon0: {
    symbol: 'epsilon0', name: 'Permissividade eletrica do vacuo',
    value: 8.8541878128e-12, unit: 'F/m', category: 'eletromagnetica',
    source: SOURCE_CODATA,
  },
  alpha: {
    symbol: 'alpha', name: 'Constante de estrutura fina',
    value: 7.2973525693e-3, unit: 'adimensional', category: 'eletromagnetica',
    source: SOURCE_CODATA,
  },

  // ---- Atomicas / particulas ----
  me: {
    symbol: 'me', name: 'Massa do eletron',
    value: 9.1093837015e-31, unit: 'kg', category: 'atomica',
    source: SOURCE_CODATA,
  },
  mp: {
    symbol: 'mp', name: 'Massa do proton',
    value: 1.67262192369e-27, unit: 'kg', category: 'atomica',
    source: SOURCE_CODATA,
  },
  mn: {
    symbol: 'mn', name: 'Massa do neutron',
    value: 1.67492749804e-27, unit: 'kg', category: 'atomica',
    source: SOURCE_CODATA,
  },
  u: {
    symbol: 'u', name: 'Unidade de massa atomica',
    value: 1.66053906892e-27, unit: 'kg', category: 'atomica',
    source: SOURCE_CODATA,
  },
  a0: {
    symbol: 'a0', name: 'Raio de Bohr',
    value: 5.29177210903e-11, unit: 'm', category: 'atomica',
    source: SOURCE_CODATA,
  },
  Rinf: {
    symbol: 'Rinf', name: 'Constante de Rydberg',
    value: 10973731.56816, unit: 'm-1', category: 'atomica',
    source: SOURCE_CODATA,
  },
  muB: {
    symbol: 'muB', name: 'Magneton de Bohr',
    value: 9.2740100783e-24, unit: 'J/T', category: 'atomica',
    source: SOURCE_CODATA,
  },
  eV: {
    symbol: 'eV', name: 'Eletron-volt (energia)',
    value: 1.602176634e-19, unit: 'J', category: 'atomica',
    source: SOURCE_SI, exact: true,
  },

  // ---- Termodinamicas ----
  R: {
    symbol: 'R', name: 'Constante universal dos gases',
    value: 8.314462618, unit: 'J/(mol.K)', category: 'termodinamica',
    source: SOURCE_CODATA,
  },
  sigma: {
    symbol: 'sigma', name: 'Constante de Stefan-Boltzmann',
    value: 5.670374419e-8, unit: 'W/(m2.K4)', category: 'termodinamica',
    source: SOURCE_CODATA,
  },
  Tcmb: {
    symbol: 'T_CMB', name: 'Temperatura da radiacao cosmica de fundo',
    value: 2.7255, unit: 'K', category: 'cosmica',
    source: SOURCE_IAU, approx: true,
  },

  // ---- Cosmicas / astrofisicas (referencia observacional) ----
  H0: {
    symbol: 'H0', name: 'Constante de Hubble (Planck 2018)',
    value: 67.4, unit: 'km/(s.Mpc)', category: 'cosmica',
    source: SOURCE_IAU, approx: true,
    note: 'Valor observacional com incerteza de ~0,5; tensao com medidas locais (~73).',
  },
  AU: {
    symbol: 'AU', name: 'Unidade astronomica',
    value: 149597870700, unit: 'm', category: 'cosmica',
    source: SOURCE_IAU, exact: true,
  },
  pc: {
    symbol: 'pc', name: 'Parsec',
    value: 3.08567758149137e16, unit: 'm', category: 'cosmica',
    source: SOURCE_IAU, exact: true,
  },
  ly: {
    symbol: 'ly', name: 'Ano-luz',
    value: 9460730472580800, unit: 'm', category: 'cosmica',
    source: SOURCE_IAU, exact: true,
  },
  Msun: {
    symbol: 'M_sun', name: 'Massa do Sol',
    value: 1.98847e30, unit: 'kg', category: 'cosmica',
    source: SOURCE_IAU, approx: true,
  },
  Lsun: {
    symbol: 'L_sun', name: 'Luminosidade do Sol',
    value: 3.828e26, unit: 'W', category: 'cosmica',
    source: SOURCE_IAU, approx: true,
  },

  // ---- Engenharia eletrica (valores de projeto NBR 5410) ----
  RHO_CU: {
    symbol: 'rho_Cu', name: 'Resistividade do cobre a 70 C (projeto)',
    value: 1 / 56, unit: 'ohm.mm2/m', category: 'engenharia',
    source: 'NBR 5410 (valor de projeto)',
    note: 'Equivale a ~0,01786 ohm.mm2/m; usado em queda de tensao.',
  },
  RHO_AL: {
    symbol: 'rho_Al', name: 'Resistividade do aluminio a 70 C (projeto)',
    value: 1 / 34.8, unit: 'ohm.mm2/m', category: 'engenharia',
    source: 'NBR 5410 (valor de projeto)',
  },
  ALPHA_CU: {
    symbol: 'alpha_Cu', name: 'Coeficiente termico do cobre (20 C)',
    value: 0.00393, unit: '1/K', category: 'engenharia',
    source: 'IEC 60228 (referencia)',
  },
  SQRT3: {
    symbol: 'sqrt(3)', name: 'Raiz de 3 (sistemas trifasicos)',
    value: Math.sqrt(3), unit: 'adimensional', category: 'engenharia',
    source: 'Matematica (exato)', exact: true,
  },
  FREQ_BR: {
    symbol: 'f', name: 'Frequencia nominal da rede (Brasil)',
    value: 60, unit: 'Hz', category: 'engenharia',
    source: 'ANEEL / ONS',
  },
};

const CATEGORIES = ['universal', 'eletromagnetica', 'atomica', 'termodinamica', 'cosmica', 'engenharia'];

/** Valor numerico de uma constante pela chave. Lanca erro em chave desconhecida. */
function getConstant(key) {
  const entry = CONSTANTS[key];
  if (!entry) throw new Error(`Constante desconhecida: ${key}`);
  return entry.value;
}

/** Lista as chaves de uma categoria (ou todas, se omitida). */
function listConstants(category) {
  const keys = Object.keys(CONSTANTS);
  if (!category) return keys;
  if (!CATEGORIES.includes(category)) throw new Error(`Categoria desconhecida: ${category}`);
  return keys.filter((k) => CONSTANTS[k].category === category);
}

/** Impedancia do vacuo Z0 = mu0 . c (~376,73 ohm). */
function vacuumImpedance() {
  return getConstant('mu0') * getConstant('c');
}

/** Confere c = 1/sqrt(mu0 . epsilon0) dentro da tolerancia informada. */
function checkLightSpeedConsistency(tolerance = 1e-6) {
  const c = getConstant('c');
  const derived = 1 / Math.sqrt(getConstant('mu0') * getConstant('epsilon0'));
  return Math.abs(derived - c) / c <= tolerance;
}

/** Converte ano-luz/parsec/AU para metros sem expor o fator "na mao". */
function astronomicalToMeters(value, fromUnit) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error('Valor astronomico invalido.');
  switch (fromUnit) {
    case 'm':
      return n;
    case 'AU':
      return n * getConstant('AU');
    case 'ly':
      return n * getConstant('ly');
    case 'pc':
      return n * getConstant('pc');
    default:
      throw new Error(`Unidade astronomica desconhecida: ${fromUnit}`);
  }
}

/**
 * Formata "simbolo = valor unidade (fonte)" para exibir em telas de
 * referencia e no laudo. Ex.: 'c = 299792458 m/s'.
 */
function formatConstant(key) {
  const entry = CONSTANTS[key];
  if (!entry) throw new Error(`Constante desconhecida: ${key}`);
  const approx = entry.approx ? '~' : '';
  return `${entry.symbol} = ${approx}${entry.value} ${entry.unit}`.trim();
}

module.exports = {
  CONSTANTS,
  CATEGORIES,
  SOURCE_CODATA,
  SOURCE_SI,
  SOURCE_IAU,
  getConstant,
  listConstants,
  vacuumImpedance,
  checkLightSpeedConsistency,
  astronomicalToMeters,
  formatConstant,
};
