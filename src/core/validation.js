/**
 * VALIDACAO TECNICA - checklist automatico NBR 5410
 * Gera os apontamentos que alimentam o LAUDO TECNICO.
 * Severidade: error (nao conformidade) | warn (verificar) | ok
 */

const eng = require('./engineering');
const { findPath, collectByType } = require('./treeEngine');

const { num, round } = eng;

/** Codigos de apontamento para rastreabilidade no laudo */
const CODES = {
  IB_IN_IZ: 'NC-01',
  MIN_SECTION: 'NC-02',
  VOLTAGE_DROP: 'NC-03',
  MISSING_RCD: 'NC-04',
  PE_SECTION: 'NC-05',
  INCOMPLETE: 'NC-06',
  PHASE_BALANCE: 'NC-07',
  BUSBAR_OVERLOAD: 'NC-08',
  IDENTIFICATION: 'NC-09',
  IP_GRADE: 'NC-10',
};

/**
 * Valida um circuito terminal.
 * @returns {{status:'ok'|'warn'|'error', findings:Array, computed:Object}}
 */
function validateCircuit(circuit, context = {}) {
  const a = circuit.attributes || {};
  const findings = [];
  const purpose = context.purpose || null;

  const Ib = num(a.ip) || eng.designCurrent(a);
  const In = num(a.breaker);
  const Iz = eng.correctedAmpacity(a);
  const dv = eng.voltageDrop({ ...a, ip: Ib });
  const peMin = eng.protectiveConductorSection(a.section);

  const computed = {
    ib: round(Ib, 2), in: In, iz: Iz, voltageDrop: dv,
    peMin, izBase: eng.baseAmpacity(a),
    powerVa: a.powerFactor ? round(num(a.powerW) / (num(a.powerFactor, 0.92) || 0.92), 0) : num(a.powerW),
  };

  // NC-06 dados incompletos
  const missing = [];
  if (!num(a.powerW) && !num(a.ip)) missing.push('potencia ou corrente');
  if (!num(a.section)) missing.push('secao do condutor');
  if (!In) missing.push('disjuntor');
  if (!a.phase) missing.push('fase');
  if (missing.length) {
    findings.push({
      code: CODES.INCOMPLETE, level: 'warn',
      ref: 'Cadastro',
      message: `Dados incompletos: ${missing.join(', ')}.`,
      action: 'Complementar levantamento em campo.',
    });
  }

  // Metodo de instalacao sem tabela de ampacidade implementada (sem fallback silencioso)
  if (a.installMethod && !eng.isMethodSupported(a.insulation, a.installMethod)) {
    findings.push({
      code: CODES.INCOMPLETE, level: 'error',
      ref: 'NBR 5410 - Tabelas 36/37',
      message: `Metodo de instalacao "${a.installMethod}" sem tabela de ampacidade implementada (suportados: ${eng.SUPPORTED_METHODS.join(', ')}). Impossivel atestar Iz.`,
      action: 'Selecionar metodo suportado ou dimensionar manualmente com responsavel tecnico.',
    });
  }

  // NC-01 coordenacao Ib <= In <= Iz
  if (Ib && In) {
    if (In < Ib) {
      findings.push({
        code: CODES.IB_IN_IZ, level: 'error', ref: 'NBR 5410 - 5.3.4 / 6.3.4.2',
        message: `Disjuntor subdimensionado: In=${In}A < Ib=${round(Ib, 2)}A. Atuacao indevida / restricao operacional.`,
        action: `Elevar protecao para ${eng.nextBreaker(Ib)}A apos verificar Iz do condutor.`,
      });
    }
  }
  if (In && Iz) {
    if (In > Iz) {
      findings.push({
        code: CODES.IB_IN_IZ, level: 'error', ref: 'NBR 5410 - 5.3.4 (In <= Iz)',
        message: `Condutor desprotegido: In=${In}A > Iz=${Iz}A (${a.section}mm2, metodo ${a.installMethod || 'B1'}, FCA=${num(a.fca, 1)}). Risco de sobreaquecimento e incendio.`,
        action: `Aumentar secao do condutor ou reduzir disjuntor para <= ${eng.nextBreaker(Iz) === Iz ? Iz : eng.BREAKER_SERIES.filter((b) => b <= Iz).pop() || 6}A.`,
      });
    }
  }
  if (Ib && Iz && Ib > Iz) {
    findings.push({
      code: CODES.IB_IN_IZ, level: 'error', ref: 'NBR 5410 - 6.2.5',
      message: `Sobrecarga permanente: Ib=${round(Ib, 2)}A excede Iz=${Iz}A do condutor.`,
      action: 'Redimensionar circuito ou segregar cargas.',
    });
  }

  // NC-02 secao minima
  const minS = eng.MIN_SECTION[purpose] || eng.MIN_SECTION.default;
  if (num(a.section) && num(a.section) < minS) {
    findings.push({
      code: CODES.MIN_SECTION, level: 'error', ref: 'NBR 5410 - Tabela 47',
      message: `Secao ${a.section}mm2 inferior ao minimo de ${minS}mm2 para "${purpose || 'circuito de potencia'}".`,
      action: `Substituir condutor por ${minS}mm2 no minimo.`,
    });
  }

  // NC-03 queda de tensao
  if (dv > eng.VOLTAGE_DROP_LIMIT.terminal) {
    findings.push({
      code: CODES.VOLTAGE_DROP, level: dv > 7 ? 'error' : 'warn', ref: 'NBR 5410 - 6.2.7',
      message: `Queda de tensao de ${dv}% acima do limite de ${eng.VOLTAGE_DROP_LIMIT.terminal}% para circuito terminal.`,
      action: 'Aumentar secao do condutor ou reduzir comprimento do percurso.',
    });
  }

  // NC-04 DR obrigatorio
  const needsRcd = ['Tomadas (TUG)', 'Tomadas Especificas (TUE)'].includes(purpose)
    || /banheiro|vestiario|lavagem|externa|area molhada|cozinha|refeitorio/i.test(
      `${a.observation || ''} ${a.description || ''} ${context.areaClassification || ''}`
    );
  if (needsRcd && (!a.rcd || a.rcd === 'Nao')) {
    findings.push({
      code: CODES.MISSING_RCD, level: 'error', ref: 'NBR 5410 - 5.1.3.2.2',
      message: 'Circuito em area molhada / de tomadas sem dispositivo diferencial-residual (DR).',
      action: 'Instalar DR de alta sensibilidade (30 mA).',
    });
  } else if (needsRcd && a.rcd && a.rcd !== 'Nao' && num(a.rcd) > 30) {
    findings.push({
      code: CODES.MISSING_RCD, level: 'warn', ref: 'NBR 5410 - 5.1.3.2.2',
      message: `DR de ${a.rcd} nao atende protecao contra choque (exigido 30 mA).`,
      action: 'Substituir por DR 30 mA.',
    });
  }

  // NC-05 condutor de protecao
  if (a.peSection && num(a.peSection) < peMin) {
    findings.push({
      code: CODES.PE_SECTION, level: 'error', ref: 'NBR 5410 - Tabela 58',
      message: `Condutor de protecao de ${a.peSection}mm2 inferior ao minimo de ${peMin}mm2.`,
      action: `Adequar PE para ${peMin}mm2.`,
    });
  } else if (!a.peSection && num(a.section)) {
    findings.push({
      code: CODES.PE_SECTION, level: 'warn', ref: 'NBR 5410 - 6.4.3',
      message: 'Condutor de protecao (PE) nao identificado em campo.',
      action: `Verificar existencia e secao (minimo ${peMin}mm2).`,
    });
  }

  // NC-09 identificacao
  if (!a.circuitNumber) {
    findings.push({
      code: CODES.IDENTIFICATION, level: 'warn', ref: 'NBR 5410 - 6.1.6',
      message: 'Circuito sem identificacao permanente no quadro.',
      action: 'Aplicar etiqueta/anilha de identificacao.',
    });
  }

  const status = findings.some((f) => f.level === 'error') ? 'error'
    : findings.some((f) => f.level === 'warn') ? 'warn' : 'ok';

  return { status, findings, computed };
}

/** Descobre a finalidade herdada do grupo pai mais proximo */
function inheritedPurpose(tree, circuitId) {
  const path = findPath(tree, circuitId) || [];
  for (let i = path.length - 2; i >= 0; i--) {
    const p = path[i].attributes || {};
    if (p.purpose) return p.purpose;
  }
  return null;
}

function inheritedAreaClassification(tree, circuitId) {
  const path = findPath(tree, circuitId) || [];
  for (let i = path.length - 2; i >= 0; i--) {
    const p = path[i].attributes || {};
    if (p.classification) return p.classification;
  }
  return null;
}

/** Valida um quadro: equilibrio de fases, carga do barramento, IP */
function validatePanel(panel, tree) {
  const a = panel.attributes || {};
  const findings = [];
  const circuits = collectByType([panel], 'circuit');

  const perPhase = { R: 0, S: 0, T: 0 };
  let totalVa = 0;
  circuits.forEach((c) => {
    const ca = c.attributes || {};
    const fp = num(ca.powerFactor, 0.92) || 0.92;
    const va = num(ca.powerW) / fp;
    totalVa += va;
    const ph = String(ca.phase || '').toUpperCase();
    if (ph === 'RST') { perPhase.R += va / 3; perPhase.S += va / 3; perPhase.T += va / 3; }
    else if (ph.length) ph.split('').forEach((p) => { if (perPhase[p] !== undefined) perPhase[p] += va / ph.length; });
  });

  const vals = [perPhase.R, perPhase.S, perPhase.T];
  const maxV = Math.max(...vals), minV = Math.min(...vals);
  const imbalance = maxV > 0 ? round(((maxV - minV) / maxV) * 100, 1) : 0;
  if (imbalance > 15 && totalVa > 0) {
    findings.push({
      code: CODES.PHASE_BALANCE, level: imbalance > 30 ? 'error' : 'warn',
      ref: 'NBR 5410 - 4.2.5.4 / Boas praticas',
      message: `Desequilibrio de fases de ${imbalance}% (R=${round(perPhase.R / 1000, 2)} / S=${round(perPhase.S / 1000, 2)} / T=${round(perPhase.T / 1000, 2)} kVA).`,
      action: 'Remanejar circuitos monofasicos para equalizar as fases.',
    });
  }

  const tension = parseFloat(String(a.tension || '380').split('/')[0]) || 380;
  const demand = num(a.demandFactor, 1) || 1;
  const ibPanel = totalVa > 0 ? round((totalVa * demand) / (eng.SQRT3 * tension), 2) : 0;
  const busbar = num(a.busbarCurrent);
  if (busbar && ibPanel > busbar) {
    findings.push({
      code: CODES.BUSBAR_OVERLOAD, level: 'error', ref: 'NBR 5410 - 6.5.4',
      message: `Demanda calculada de ${ibPanel}A supera o barramento de ${busbar}A.`,
      action: 'Ampliar barramento/quadro ou redistribuir cargas.',
    });
  }
  const mainBreaker = num(String(a.mainBreaker || '').replace(/[^\d.]/g, ''));
  if (mainBreaker && busbar && mainBreaker > busbar) {
    findings.push({
      code: CODES.BUSBAR_OVERLOAD, level: 'error', ref: 'NBR 5410 - 6.5.4',
      message: `Protecao geral de ${mainBreaker}A superior a capacidade do barramento (${busbar}A).`,
      action: 'Reduzir protecao geral ou substituir barramento.',
    });
  }

  const areaClass = a.classification || null;
  if (/externa|molhada|corrosiva/i.test(String(areaClass)) && a.ipGrade && num(a.ipGrade.replace('IP', '')) < 54) {
    findings.push({
      code: CODES.IP_GRADE, level: 'warn', ref: 'NBR 5410 - 6.5.3',
      message: `Grau de protecao ${a.ipGrade} insuficiente para "${areaClass}".`,
      action: 'Substituir invólucro por IP54 ou superior.',
    });
  }

  const status = findings.some((f) => f.level === 'error') ? 'error'
    : findings.some((f) => f.level === 'warn') ? 'warn' : 'ok';

  return {
    status, findings,
    computed: {
      circuits: circuits.length,
      totalVa: round(totalVa, 0),
      totalKva: round(totalVa / 1000, 2),
      demandKva: round((totalVa * demand) / 1000, 2),
      ibPanel, imbalance, perPhase: {
        R: round(perPhase.R, 0), S: round(perPhase.S, 0), T: round(perPhase.T, 0),
      },
    },
  };
}

/**
 * Varre a arvore completa e devolve o dossie de conformidade.
 */
function validateTree(tree) {
  const circuits = collectByType(tree, 'circuit');
  const panels = collectByType(tree, 'panel');

  const circuitResults = circuits.map((c) => ({
    node: c,
    path: (findPath(tree, c.id) || []).map((n) => n.label).join(' > '),
    ...validateCircuit(c, {
      purpose: inheritedPurpose(tree, c.id),
      areaClassification: inheritedAreaClassification(tree, c.id),
    }),
  }));

  const panelResults = panels.map((p) => ({
    node: p,
    path: (findPath(tree, p.id) || []).map((n) => n.label).join(' > '),
    ...validatePanel(p, tree),
  }));

  const all = [...circuitResults, ...panelResults];
  const findings = all.flatMap((r) =>
    r.findings.map((f) => ({ ...f, nodeId: r.node.id, nodeLabel: r.node.label, path: r.path }))
  );

  const summary = {
    circuits: circuits.length,
    panels: panels.length,
    conform: all.filter((r) => r.status === 'ok').length,
    attention: all.filter((r) => r.status === 'warn').length,
    nonConform: all.filter((r) => r.status === 'error').length,
    errors: findings.filter((f) => f.level === 'error').length,
    warnings: findings.filter((f) => f.level === 'warn').length,
    // soma sobre circuitos unicos (evita duplicidade de quadros aninhados)
    totalKva: round(circuitResults.reduce((s, r) => s + (r.computed.powerVa || 0), 0) / 1000, 2),
  };
  summary.conformityIndex = all.length
    ? round((summary.conform / all.length) * 100, 1) : 0;
  summary.verdict = !all.length
    ? 'INSTALACAO INCONCLUSIVA - sem circuitos/quadros cadastrados'
    : summary.errors > 0
      ? 'INSTALACAO NAO CONFORME - intervencao necessaria'
      : summary.warnings > 0
        ? 'INSTALACAO CONFORME COM RESSALVAS'
        : 'INSTALACAO CONFORME';

  return { summary, circuitResults, panelResults, findings, statusById: buildStatusMap(all) };
}

function buildStatusMap(results) {
  const map = {};
  results.forEach((r) => { map[r.node.id] = r.status; });
  return map;
}

module.exports = { CODES, validateCircuit, validatePanel, validateTree, inheritedPurpose, inheritedAreaClassification };
