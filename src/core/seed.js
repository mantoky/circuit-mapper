/**
 * DADOS FICTICIOS DE DEMONSTRACAO / TESTE
 * Cenario: Complexo Minerario Itabira - Usina de Beneficiamento 3 (fictício).
 * Contem NAO CONFORMIDADES INTENCIONAIS para exercitar o motor de laudo.
 */

const { createNode } = require('./treeEngine');

const C = (circuitNumber, description, attrs) => ({
  type: 'circuit',
  label: circuitNumber ? `${circuitNumber} - ${description}` : description,
  attributes: {
    circuitNumber, description,
    tension: 220, powerFactor: 0.92, fca: 1, fct: 1,
    insulation: 'PVC', installMethod: 'B1', breakerCurve: 'C', poles: '1P+N',
    ...attrs,
  },
});

const L = (tag, description, attrs) => ({
  type: 'load',
  label: `${tag} - ${description}`,
  attributes: { tag, description, quantity: 1, condition: 'Operando', ...attrs },
});

function buildSeedTree() {
  return [
    createNode({
      type: 'site',
      label: 'Complexo Itabira - Usina de Beneficiamento 3',
      attributes: {
        tag: 'VALE-ITB-UB3',
        client: 'Vale S.A.',
        location: 'Itabira / MG - Complexo Minerario Itabira',
        concessionaire: 'CEMIG D',
        supplyTension: '13,8 kV',
      },
      children: [
        {
          type: 'substation',
          label: 'SE-01 - Subestacao Principal UB3',
          attributes: {
            tag: 'SE-01', tension: '13,8kV / 380-220V',
            location: 'Predio da SE - Cota 812',
            ik: 25, groundingSystem: 'TN-S',
          },
          children: [
            {
              type: 'transformer',
              label: 'TRF-01 - Transformador Principal',
              attributes: {
                tag: 'TRF-01', powerKva: 500,
                ratio: '13800/380-220V', impedance: 4.5, coolingType: 'ONAN',
              },
              children: [
                {
                  type: 'panel',
                  label: 'QGBT-01 - Quadro Geral de Baixa Tensao',
                  attributes: {
                    tag: 'QGBT-01', tension: '380/220V',
                    location: 'Sala Eletrica - Cota 812',
                    mainBreaker: '800A', busbarCurrent: 800,
                    ipGrade: 'IP54', demandFactor: 0.85,
                    feederSection: '3x(2x240)+240mm2', feederLength: 22,
                    manufacturer: 'Schneider Electric',
                  },
                  children: [
                    /* ---------- CCM (forca motriz) ---------- */
                    {
                      type: 'panel',
                      label: 'CCM-01 - Centro de Controle de Motores',
                      attributes: {
                        tag: 'CCM-01', tension: '380/220V',
                        location: 'Sala Eletrica - Cota 812',
                        mainBreaker: '400A', busbarCurrent: 400,
                        ipGrade: 'IP54', demandFactor: 0.9,
                        feederSection: '3x185+95mm2', feederLength: 18,
                        manufacturer: 'WEG',
                      },
                      children: [
                        {
                          type: 'group',
                          label: 'Grupo Britagem',
                          attributes: { tag: 'GRP-BRIT', purpose: 'Forca Motriz', groupingFactor: 0.8 },
                          children: [
                            C('C-01', 'Britador Mandibulas BM-101', {
                              phase: 'RST', tension: 380, powerW: 75000, powerFactor: 0.87,
                              fca: 0.8, section: '95', breaker: '160', poles: '3P',
                              length: 35, peSection: '50', conduit: 'Bandeja BD-01',
                              insulation: 'EPR', installMethod: 'E', breakerCurve: 'D',
                            }),
                            C('C-02', 'Correia Transportadora TC-201', {
                              phase: 'RST', tension: 380, powerW: 22000, powerFactor: 0.88,
                              fca: 0.8, section: '16', breaker: '63', poles: '3P',
                              length: 48, peSection: '16', conduit: 'Bandeja BD-01',
                              insulation: 'EPR', installMethod: 'E', breakerCurve: 'D',
                            }),
                            /* NC intencional: In=50A > Iz do cabo 6mm2 PVC/B1 3cond (36A) */
                            C('C-03', 'Correia Transportadora TC-202', {
                              phase: 'RST', tension: 380, powerW: 18500, powerFactor: 0.86,
                              fca: 1, section: '6', breaker: '50', poles: '3P',
                              length: 52, peSection: '6', conduit: 'EL 1.1/4"',
                              breakerCurve: 'D',
                              observation: 'Cabo aparentemente substituido em manutencao corretiva.',
                            }),
                            C('C-04', 'Peneira Vibratoria PV-301', {
                              phase: 'RST', tension: 380, powerW: 15000, powerFactor: 0.87,
                              fca: 0.8, section: '10', breaker: '40', poles: '3P',
                              length: 41, peSection: '10', conduit: 'Bandeja BD-02',
                              insulation: 'EPR', installMethod: 'E', breakerCurve: 'D',
                            }),
                          ],
                        },
                        {
                          type: 'group',
                          label: 'Grupo Bombeamento',
                          attributes: { tag: 'GRP-BOMB', purpose: 'Forca Motriz', groupingFactor: 0.8 },
                          children: [
                            C('C-05', 'Bomba de Polpa BP-401', {
                              phase: 'RST', tension: 380, powerW: 37000, powerFactor: 0.88,
                              fca: 0.8, section: '35', breaker: '100', poles: '3P',
                              length: 62, peSection: '16', conduit: 'Bandeja BD-03',
                              insulation: 'EPR', installMethod: 'E', breakerCurve: 'D',
                            }),
                            C('C-06', 'Bomba de Polpa BP-402 (reserva)', {
                              phase: 'RST', tension: 380, powerW: 37000, powerFactor: 0.88,
                              fca: 0.8, section: '35', breaker: '100', poles: '3P',
                              length: 64, peSection: '16', conduit: 'Bandeja BD-03',
                              insulation: 'EPR', installMethod: 'E', breakerCurve: 'D',
                            }),
                            /* NC intencional: queda de tensao excessiva (percurso longo) */
                            C('C-07', 'Bomba Dosadora Floculante BD-501', {
                              phase: 'RST', tension: 380, powerW: 5500, powerFactor: 0.84,
                              fca: 1, section: '2.5', breaker: '16', poles: '3P',
                              length: 185, peSection: '2.5', conduit: 'EL 3/4"',
                              breakerCurve: 'C',
                              observation: 'Alimentacao proveniente da area de reagentes (percurso extenso).',
                            }),
                          ],
                        },
                      ],
                    },

                    /* ---------- Quadro de iluminacao ---------- */
                    {
                      type: 'area',
                      label: 'Predio de Producao - Nave Principal',
                      attributes: {
                        tag: 'AR-NAVE', classification: 'Area Comum', floor: 'Cota 812',
                      },
                      children: [
                        {
                          type: 'panel',
                          label: 'QDL-01 - Quadro de Distribuicao de Luz',
                          attributes: {
                            tag: 'QDL-01', tension: '380/220V',
                            location: 'Nave Principal - Pilar C4',
                            mainBreaker: '100A', busbarCurrent: 100,
                            ipGrade: 'IP54', demandFactor: 1,
                            feederSection: '3x25+16mm2', feederLength: 55,
                            manufacturer: 'Cemar',
                          },
                          children: [
                            {
                              type: 'group',
                              label: 'Iluminacao Interna',
                              attributes: { tag: 'GRP-ILU-INT', purpose: 'Iluminacao', groupingFactor: 1 },
                              children: [
                                C('C-11', 'Iluminacao Nave - Trecho A', {
                                  phase: 'R', powerW: 2400, powerFactor: 0.95,
                                  section: '2.5', breaker: '16', length: 62,
                                  peSection: '2.5', conduit: 'EL 3/4"',
                                  children: [],
                                }),
                                C('C-12', 'Iluminacao Nave - Trecho B', {
                                  phase: 'S', powerW: 2400, powerFactor: 0.95,
                                  section: '2.5', breaker: '16', length: 68,
                                  peSection: '2.5', conduit: 'EL 3/4"',
                                }),
                                C('C-13', 'Iluminacao Nave - Trecho C', {
                                  phase: 'T', powerW: 1800, powerFactor: 0.95,
                                  section: '2.5', breaker: '16', length: 55,
                                  peSection: '2.5', conduit: 'EL 3/4"',
                                }),
                                /* NC intencional: sem identificacao e sem PE declarado */
                                C('', 'Iluminacao Escada Metalica', {
                                  phase: 'R', powerW: 600, powerFactor: 0.95,
                                  section: '1.5', breaker: '10', length: 34,
                                  conduit: 'EL 1/2"',
                                  observation: 'Circuito nao identificado no barramento.',
                                }),
                              ],
                            },
                            {
                              type: 'group',
                              label: 'Iluminacao de Emergencia',
                              attributes: { tag: 'GRP-EMERG', purpose: 'Emergencia / No-break', groupingFactor: 1 },
                              children: [
                                C('C-15', 'Iluminacao de Emergencia - Rotas de Fuga', {
                                  phase: 'S', powerW: 900, powerFactor: 0.9,
                                  section: '2.5', breaker: '10', length: 78,
                                  peSection: '2.5', conduit: 'EL 3/4"',
                                }),
                              ],
                            },
                            {
                              type: 'group',
                              label: 'Tomadas de Uso Geral',
                              attributes: { tag: 'GRP-TUG', purpose: 'Tomadas (TUG)', groupingFactor: 1 },
                              children: [
                                C('C-16', 'TUG - Sala de Operacao', {
                                  phase: 'T', powerW: 2000, powerFactor: 0.95,
                                  section: '2.5', breaker: '20', length: 28,
                                  peSection: '2.5', rcd: '30mA', conduit: 'EL 3/4"',
                                }),
                                /* NC intencional: TUG sem DR */
                                C('C-17', 'TUG - Oficina Mecanica', {
                                  phase: 'R', powerW: 3000, powerFactor: 0.95,
                                  section: '4', breaker: '25', length: 44,
                                  peSection: '4', rcd: 'Nao', conduit: 'EL 1"',
                                  observation: 'Tomadas em area de lavagem de pecas.',
                                }),
                              ],
                            },
                          ],
                        },
                      ],
                    },

                    /* ---------- Telecom / area externa ---------- */
                    {
                      type: 'area',
                      label: 'Patio Externo e Casa de Telecom',
                      attributes: {
                        tag: 'AR-EXT', classification: 'Area Externa', floor: 'Cota 808',
                      },
                      children: [
                        {
                          type: 'panel',
                          label: 'QD-TEL-01 - Quadro Telecom',
                          attributes: {
                            tag: 'QD-TEL-01', tension: '220V',
                            location: 'Casa de Telecom - Patio Externo',
                            mainBreaker: '63A', busbarCurrent: 63,
                            ipGrade: 'IP31', demandFactor: 1,
                            classification: 'Area Externa',
                            feederSection: '3x10+10mm2', feederLength: 96,
                            manufacturer: 'Steck',
                          },
                          children: [
                            {
                              type: 'group',
                              label: 'Infra Telecom',
                              attributes: { tag: 'GRP-TEL', purpose: 'Telecom', groupingFactor: 1 },
                              children: [
                                C('C-21', 'Rack Telecom RK-01 (No-break)', {
                                  phase: 'R', powerW: 3500, powerFactor: 0.98,
                                  section: '4', breaker: '25', length: 12,
                                  peSection: '4', rcd: '30mA', conduit: 'EL 1"',
                                  children: [],
                                }),
                                C('C-22', 'Radio Enlace e Antena Setorial', {
                                  phase: 'S', powerW: 800, powerFactor: 0.95,
                                  section: '2.5', breaker: '16', length: 40,
                                  peSection: '2.5', rcd: '30mA', conduit: 'EL 3/4"',
                                }),
                                C('C-23', 'Ar Condicionado Casa Telecom', {
                                  phase: 'RS', tension: 220, powerW: 4400, powerFactor: 0.93,
                                  section: '4', breaker: '25', poles: '2P', length: 15,
                                  peSection: '4', rcd: '30mA', conduit: 'EL 1"',
                                }),
                                C('C-24', 'Iluminacao Patio Externo', {
                                  phase: 'T', powerW: 3200, powerFactor: 0.92,
                                  section: '6', breaker: '25', length: 140,
                                  peSection: '6', rcd: 'Nao', conduit: 'Cabo direto solo',
                                  observation: 'Postes de iluminacao do patio de estocagem.',
                                }),
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
  ];
}

/** Anexa ativos de exemplo aos circuitos indicados (demonstra nivel 6+) */
function attachSampleAssets(tree) {
  const { collectByType, addChild } = require('./treeEngine');
  let out = tree;
  const circuits = collectByType(out, 'circuit');
  const byNumber = (n) => circuits.find((c) => (c.attributes || {}).circuitNumber === n);

  const map = [
    ['C-01', L('BM-101', 'Britador de Mandibulas 100t/h', { assetType: 'Motor', powerW: 75000, tension: 380, currentA: 133 })],
    ['C-02', L('TC-201', 'Motor da Correia TC-201', { assetType: 'Motor', powerW: 22000, tension: 380, currentA: 41 })],
    ['C-05', L('BP-401', 'Bomba Centrifuga de Polpa', { assetType: 'Bomba', powerW: 37000, tension: 380, currentA: 66 })],
    ['C-11', L('LUM-A', 'Luminaria LED High Bay 150W', { assetType: 'Luminaria', powerW: 150, quantity: 16, tension: 220 })],
    ['C-12', L('LUM-B', 'Luminaria LED High Bay 150W', { assetType: 'Luminaria', powerW: 150, quantity: 16, tension: 220 })],
    ['C-17', L('TOM-OF', 'Tomadas 2P+T 20A Oficina', { assetType: 'Tomada', powerW: 600, quantity: 5, tension: 220, condition: 'Danificado' })],
    ['C-21', L('RK-01', 'Rack 44U - Switches e DIO', { assetType: 'Rack Telecom', powerW: 3500, tension: 220, currentA: 16 })],
    ['C-24', L('POSTE-PT', 'Poste de Iluminacao Patio 400W', { assetType: 'Luminaria', powerW: 400, quantity: 8, tension: 220, condition: 'Operando' })],
  ];
  map.forEach(([num, asset]) => {
    const c = byNumber(num);
    if (c) out = addChild(out, c.id, asset);
  });
  return out;
}

/**
 * Logotipo de demonstracao como data URI (SVG embutido).
 * Existe para que a capa do laudo apareca completa ja no cenario ficticio,
 * sem exigir que o usuario suba imagens antes do primeiro teste.
 */
function demoLogo(text) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="420" height="140" viewBox="0 0 420 140">'
    + '<rect width="420" height="140" rx="10" fill="#0A1422"/>'
    + '<rect x="0" y="0" width="420" height="10" fill="#22D3EE"/>'
    + '<text x="210" y="80" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="bold"'
    + ' fill="#22D3EE" text-anchor="middle">' + text + '</text>'
    + '<text x="210" y="112" font-family="Arial, Helvetica, sans-serif" font-size="15"'
    + ' fill="#9FB3C8" text-anchor="middle">LOGOTIPO DE DEMONSTRACAO</text></svg>';
  // URI-encoded em vez de base64: encodeURIComponent existe em todo runtime
  // (Hermes, navegador e Node), enquanto btoa/Buffer nao.
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/** Cabecalho ficticio do laudo */
const seedReportHeader = {
  reportTitle: 'LAUDO TECNICO DE MAPEAMENTO E CADASTRO DE CIRCUITOS ELETRICOS',
  reportNumber: 'LT-2026-0147',
  revision: '00',
  client: 'Vale S.A.',
  clientCnpj: '33.592.510/0001-54',
  contractor: 'Robson do Carmo - Engenharia Eletrica',
  contractorDoc: 'CNPJ 00.000.000/0001-00',
  contract: 'Contrato 4600123456 - Servicos de Engenharia Eletrica',
  site: 'Complexo Minerario Itabira - Usina de Beneficiamento 3',
  location: 'Itabira / MG',
  equipmentTag: 'SE-01 / QGBT-01',
  scope: 'Mapeamento, cadastro hierarquico e verificacao de conformidade dos circuitos eletricos de baixa tensao da Usina de Beneficiamento 3, abrangendo o Quadro Geral de Baixa Tensao, Centro de Controle de Motores, quadros de distribuicao de luz e quadro de telecomunicacoes.',
  standards: [
    'ABNT NBR 5410:2004 - Instalacoes eletricas de baixa tensao',
    'ABNT NBR 14039:2021 - Instalacoes eletricas de media tensao',
    'ABNT NBR 5419:2015 - Protecao contra descargas atmosfericas',
    'NR-10 - Seguranca em instalacoes e servicos em eletricidade',
    'PRO-GER-XXXX - Padrao Vale de Instalacoes Eletricas Industriais',
  ],
  methodology: 'Inspecao visual sensitiva, leitura de correntes com alicate amperimetro True RMS, conferencia de placas de identificacao, medicao de percursos e conferencia documental de diagramas unifilares. Ensaios realizados com instalacao energizada, sob procedimento de APR e liberacao de NR-10.',
  technician: 'Robson do Carmo',
  technicianTitle: 'Engenheiro Eletricista',
  crea: 'CREA-MG 0000000000',
  art: 'ART 28027230000000000',
  inspectionDate: '2026-07-24',
  issueDate: '2026-07-25',
  requester: 'Gerencia de Manutencao Eletrica - Vale S.A.',
  instruments: [
    { name: 'Alicate Amperimetro True RMS', model: 'Fluke 376 FC', serial: 'FL-45219', calibration: '2026-02-11' },
    { name: 'Multimetro Digital', model: 'Fluke 87V', serial: 'FL-98120', calibration: '2026-01-30' },
    { name: 'Terrometro Digital', model: 'Megabras TM-25m', serial: 'MB-11204', calibration: '2025-11-18' },
    { name: 'Termovisor', model: 'Flir E8-XT', serial: 'FLIR-77301', calibration: '2026-03-04' },
  ],
  // Substituidos pelo upload real do usuario na tela de cabecalho.
  contractorLogo: demoLogo('ROBSON DO CARMO'),
  clientLogo: demoLogo('CONTRATANTE'),
};

module.exports = { buildSeedTree, attachSampleAssets, seedReportHeader, demoLogo };
