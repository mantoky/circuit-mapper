/** TESTES DAS CONSTANTES COSMICAS E FISICAS (CODATA 2022). */
const H = require('./_harness');
const C = require('../src/core/constants');
const E = require('../src/core/engineering');

/* ==================== 1. TABELA MESTRA ==================== */
H.section('1. Tabela mestra de constantes');

H.ok(Object.keys(C.CONSTANTS).length >= 25, '1.1 ao menos 25 constantes catalogadas');
H.ok(C.CATEGORIES.includes('cosmica') && C.CATEGORIES.includes('engenharia'),
  '1.2 categorias cosmica e engenharia presentes');
H.ok(Object.values(C.CONSTANTS).every((c) => c.symbol && c.name && c.unit && c.category && c.source
  && typeof c.value === 'number' && Number.isFinite(c.value) && c.value !== 0),
  '1.3 toda entrada tem simbolo, nome, valor finito, unidade, categoria e fonte');
H.ok(Object.values(C.CONSTANTS).every((c) => C.CATEGORIES.includes(c.category)),
  '1.4 toda constante pertence a uma categoria valida');

/* ==================== 2. VALORES EXATOS DO SI ==================== */
H.section('2. Valores exatos do SI 2019');

H.eq(C.getConstant('c'), 299792458, '2.1 c exato por definicao');
H.eq(C.getConstant('h'), 6.62607015e-34, '2.2 h exato por definicao');
H.eq(C.getConstant('e'), 1.602176634e-19, '2.3 e exato por definicao');
H.eq(C.getConstant('kB'), 1.380649e-23, '2.4 kB exato por definicao');
H.eq(C.getConstant('NA'), 6.02214076e23, '2.5 NA exato por definicao');
H.eq(C.getConstant('eV'), 1.602176634e-19, '2.6 eV = carga elementar em joules');
H.eq(C.getConstant('AU'), 149597870700, '2.7 AU exata IAU');

/* ==================== 3. CONSISTENCIA FISICA ==================== */
H.section('3. Consistencia fisica');

H.ok(C.checkLightSpeedConsistency(1e-6), '3.1 c = 1/sqrt(mu0.epsilon0) dentro de 1e-6');
H.near(C.vacuumImpedance(), 376.73, 0.01, '3.2 impedancia do vacuo Z0 ~ 376,73 ohm');
H.eq(C.getConstant('SQRT3'), Math.sqrt(3), '3.3 SQRT3 confere com Math.sqrt(3)');
H.near(C.getConstant('RHO_CU'), 1 / 56, 1e-12, '3.4 RHO_CU = 1/56 ohm.mm2/m');
H.ok(C.CONSTANTS.H0.approx === true && C.CONSTANTS.Tcmb.approx === true,
  '3.5 H0 e T_CMB marcadas como aproximadas (observacionais)');

// engenharia consome a mesma fonte (sem duplicar numero "na mao")
H.eq(E.RHO_CU, C.getConstant('RHO_CU'), '3.6 engineering.RHO_CU vem das constantes');
H.eq(E.SQRT3, C.getConstant('SQRT3'), '3.7 engineering.SQRT3 vem das constantes');

/* ==================== 4. HELPERS ==================== */
H.section('4. Helpers de acesso e conversao');

H.eq(C.listConstants('cosmica').sort().join(','),
  ['AU', 'H0', 'Lsun', 'Msun', 'Tcmb', 'ly', 'pc'].sort().join(','),
  '4.1 listConstants(cosmica) retorna o subconjunto cosmico');
H.eq(C.listConstants().length, Object.keys(C.CONSTANTS).length,
  '4.2 listConstants() sem filtro retorna todas');
H.eq(C.astronomicalToMeters(1, 'AU'), 149597870700, '4.3 1 AU em metros');
H.eq(C.astronomicalToMeters(2, 'm'), 2, '4.4 passagem direta em metros');
H.ok(C.formatConstant('c').includes('299792458') && C.formatConstant('c').includes('m/s'),
  '4.5 formatConstant exibe valor e unidade');
H.ok(C.formatConstant('H0').includes('~'),
  '4.6 formatConstant marca valor aproximado com ~');

let threwUnknown = false;
try { C.getConstant('nao_existe'); } catch { threwUnknown = true; }
H.ok(threwUnknown, '4.7 getConstant rejeita chave desconhecida');

let threwUnit = false;
try { C.astronomicalToMeters(1, 'parsec'); } catch { threwUnit = true; }
H.ok(threwUnit, '4.8 astronomicalToMeters rejeita unidade desconhecida');

let threwCat = false;
try { C.listConstants('galactica'); } catch { threwCat = true; }
H.ok(threwCat, '4.9 listConstants rejeita categoria desconhecida');

module.exports = H.report('TESTES DAS CONSTANTES');
