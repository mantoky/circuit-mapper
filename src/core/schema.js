/**
 * SCHEMA RECURSIVO - Circuit Mapper
 * ------------------------------------------------------------------
 * Um unico tipo de no ("HierarchyNode") descreve TODOS os niveis.
 * A recursividade e infinita: qualquer no pode ter children.
 *
 * {
 *   id: 'qgbt_01',
 *   label: 'Quadro Geral Terreo',
 *   type: 'panel',
 *   attributes: { tension: '380/220V', location: 'Area Sul' },
 *   meta: { createdAt, updatedAt, notes, photos: [] },
 *   children: [ ...HierarchyNode ]
 * }
 *
 * CommonJS de proposito: o mesmo modulo roda no Metro (RN) e no Node (testes).
 */

/** Tipos de no suportados, com regras de aninhamento e apresentacao. */
const NODE_TYPES = {
  site: {
    key: 'site',
    label: 'Site / Instalacao',
    short: 'SITE',
    icon: 'MAP',
    allowedChildren: ['substation', 'panel', 'area', 'group'],
    color: '#60A5FA',
  },
  substation: {
    key: 'substation',
    label: 'Subestacao',
    short: 'SE',
    icon: 'SE',
    allowedChildren: ['panel', 'transformer', 'area'],
    color: '#60A5FA',
  },
  transformer: {
    key: 'transformer',
    label: 'Transformador',
    short: 'TRF',
    icon: 'TRF',
    allowedChildren: ['panel'],
    color: '#FBBF24',
  },
  area: {
    key: 'area',
    label: 'Area / Predio',
    short: 'AREA',
    icon: 'AR',
    allowedChildren: ['panel', 'group', 'area'],
    color: '#9FB3C8',
  },
  panel: {
    key: 'panel',
    label: 'Quadro Eletrico',
    short: 'QD',
    icon: 'QD',
    allowedChildren: ['panel', 'group', 'circuit'],
    color: '#22D3EE',
  },
  group: {
    key: 'group',
    label: 'Grupo de Circuitos',
    short: 'GRP',
    icon: 'GR',
    allowedChildren: ['circuit', 'group'],
    color: '#22D3EE',
  },
  circuit: {
    key: 'circuit',
    label: 'Circuito Terminal',
    short: 'CIRC',
    icon: 'CI',
    allowedChildren: ['load'],
    color: '#34D399',
  },
  load: {
    key: 'load',
    label: 'Ativo / Carga',
    short: 'CARGA',
    icon: 'CG',
    allowedChildren: [],
    color: '#6B829E',
  },
};

/**
 * Definicao de campos por tipo. Alimenta automaticamente o AttributeEditor,
 * o Quadro de Cargas (Excel) e o Laudo (PDF/DOC).
 * kind: text | number | select | bool
 */
const FIELD_DEFS = {
  site: [
    { key: 'tag', label: 'TAG do Site', kind: 'text', placeholder: 'SITE-001' },
    { key: 'client', label: 'Cliente', kind: 'text', placeholder: 'Cliente Ltda.' },
    { key: 'location', label: 'Localidade', kind: 'text', placeholder: 'Itabira / MG' },
    { key: 'concessionaire', label: 'Concessionaria', kind: 'text' },
    { key: 'supplyTension', label: 'Tensao de Suprimento', kind: 'text', placeholder: '13,8 kV' },
  ],
  substation: [
    { key: 'tag', label: 'TAG', kind: 'text', placeholder: 'SE-01' },
    { key: 'tension', label: 'Tensao', kind: 'text', placeholder: '13,8kV / 380V' },
    { key: 'location', label: 'Localizacao', kind: 'text' },
    { key: 'ik', label: 'Icc Presumida (kA)', kind: 'number', unit: 'kA' },
    { key: 'groundingSystem', label: 'Esquema de Aterramento', kind: 'select',
      options: ['TN-S', 'TN-C-S', 'TT', 'IT'] },
  ],
  transformer: [
    { key: 'tag', label: 'TAG', kind: 'text', placeholder: 'TRF-01' },
    { key: 'powerKva', label: 'Potencia', kind: 'number', unit: 'kVA' },
    { key: 'ratio', label: 'Relacao de Transformacao', kind: 'text', placeholder: '13800/380-220V' },
    { key: 'impedance', label: 'Impedancia Z%', kind: 'number', unit: '%' },
    { key: 'coolingType', label: 'Resfriamento', kind: 'select', options: ['ONAN', 'ONAF', 'Seco'] },
  ],
  area: [
    { key: 'tag', label: 'TAG da Area', kind: 'text' },
    { key: 'classification', label: 'Classificacao', kind: 'select',
      options: ['Area Comum', 'Area Molhada', 'Area Externa', 'Atm. Explosiva Zona 1', 'Atm. Explosiva Zona 2', 'Area Corrosiva'] },
    { key: 'floor', label: 'Pavimento', kind: 'text' },
  ],
  panel: [
    { key: 'tag', label: 'TAG do Quadro', kind: 'text', placeholder: 'QGBT-01' },
    { key: 'tension', label: 'Tensao (V)', kind: 'select',
      options: ['380/220V', '440/254V', '220/127V', '220V', '480/277V'] },
    { key: 'location', label: 'Localizacao', kind: 'text', placeholder: 'Area Sul - Piso Terreo' },
    { key: 'mainBreaker', label: 'Protecao Geral', kind: 'text', placeholder: '250A' },
    { key: 'busbarCurrent', label: 'Corrente do Barramento', kind: 'number', unit: 'A' },
    { key: 'ipGrade', label: 'Grau de Protecao', kind: 'select',
      options: ['IP20', 'IP31', 'IP40', 'IP54', 'IP55', 'IP65', 'IP66'] },
    { key: 'demandFactor', label: 'Fator de Demanda', kind: 'number', default: 1 },
    { key: 'feederSection', label: 'Secao do Alimentador', kind: 'text', placeholder: '3x95+50mm2' },
    { key: 'feederLength', label: 'Comprimento do Alimentador', kind: 'number', unit: 'm' },
    { key: 'manufacturer', label: 'Fabricante', kind: 'text' },
  ],
  group: [
    { key: 'tag', label: 'TAG do Grupo', kind: 'text' },
    { key: 'purpose', label: 'Finalidade', kind: 'select',
      options: ['Iluminacao', 'Tomadas (TUG)', 'Tomadas Especificas (TUE)', 'Forca Motriz', 'Comando e Controle', 'Instrumentacao', 'Telecom', 'Emergencia / No-break'] },
    { key: 'groupingFactor', label: 'FCA do Grupo', kind: 'number', default: 1 },
  ],
  circuit: [
    { key: 'circuitNumber', label: 'N. do Circuito', kind: 'text', placeholder: 'C-01' },
    { key: 'description', label: 'Descricao da Carga', kind: 'text', placeholder: 'Iluminacao Hall' },
    { key: 'phase', label: 'Fase', kind: 'select', options: ['R', 'S', 'T', 'RS', 'RT', 'ST', 'RST'] },
    { key: 'tension', label: 'Tensao (V)', kind: 'number', unit: 'V', default: 220 },
    { key: 'powerW', label: 'Potencia Instalada', kind: 'number', unit: 'W' },
    { key: 'powerFactor', label: 'Fator de Potencia', kind: 'number', default: 0.92 },
    { key: 'fca', label: 'FCA (Agrupamento)', kind: 'number', default: 1 },
    { key: 'fct', label: 'FCT (Temperatura)', kind: 'number', default: 1 },
    { key: 'ip', label: 'Corrente de Projeto Ib', kind: 'number', unit: 'A', hint: 'Calculado automaticamente se vazio' },
    { key: 'section', label: 'Secao do Condutor', kind: 'select',
      options: ['1.5', '2.5', '4', '6', '10', '16', '25', '35', '50', '70', '95', '120', '150', '185', '240'], unit: 'mm2' },
    { key: 'insulation', label: 'Isolacao', kind: 'select', options: ['PVC', 'EPR', 'XLPE'] },
    { key: 'installMethod', label: 'Metodo de Instalacao', kind: 'select',
      options: ['A1', 'B1', 'B2', 'C', 'E'] },
    { key: 'breaker', label: 'Disjuntor In', kind: 'select',
      options: ['6', '10', '16', '20', '25', '32', '40', '50', '63', '70', '80', '100', '125', '160', '200', '250'], unit: 'A' },
    { key: 'breakerCurve', label: 'Curva', kind: 'select', options: ['B', 'C', 'D'] },
    { key: 'poles', label: 'Polos', kind: 'select', options: ['1P', '1P+N', '2P', '3P', '3P+N'] },
    { key: 'rcd', label: 'DR / IDR', kind: 'select', options: ['Nao', '30mA', '100mA', '300mA'] },
    { key: 'length', label: 'Comprimento', kind: 'number', unit: 'm' },
    { key: 'peSection', label: 'Secao do PE', kind: 'text', unit: 'mm2' },
    { key: 'conduit', label: 'Eletroduto / Bandeja', kind: 'text', placeholder: 'EL 3/4"' },
    { key: 'observation', label: 'Observacao', kind: 'text' },
  ],
  load: [
    { key: 'tag', label: 'TAG do Ativo', kind: 'text', placeholder: 'MT-101' },
    { key: 'description', label: 'Descricao', kind: 'text' },
    { key: 'assetType', label: 'Tipo', kind: 'select',
      options: ['Motor', 'Luminaria', 'Tomada', 'Painel', 'Bomba', 'Compressor', 'Ponte Rolante', 'Rack Telecom', 'Retificador', 'Outro'] },
    { key: 'powerW', label: 'Potencia', kind: 'number', unit: 'W' },
    { key: 'quantity', label: 'Quantidade', kind: 'number', default: 1 },
    { key: 'tension', label: 'Tensao', kind: 'number', unit: 'V' },
    { key: 'currentA', label: 'Corrente Nominal', kind: 'number', unit: 'A' },
    { key: 'manufacturer', label: 'Fabricante', kind: 'text' },
    { key: 'condition', label: 'Condicao Encontrada', kind: 'select',
      options: ['Operando', 'Fora de Operacao', 'Reserva', 'Danificado', 'Desativado'] },
  ],
};

/** Ordem padrao de exibicao dos tipos no seletor "Novo item" */
const CREATION_ORDER = ['site', 'substation', 'transformer', 'area', 'panel', 'group', 'circuit', 'load'];

function typeInfo(type) {
  return NODE_TYPES[type] || NODE_TYPES.panel;
}

function fieldsFor(type) {
  return FIELD_DEFS[type] || [];
}

/** Tipos permitidos como filho de um tipo pai (usado pelo botao "+") */
function allowedChildren(type) {
  return typeInfo(type).allowedChildren;
}

/** Valores default de atributos ao criar um no */
function defaultAttributes(type) {
  const out = {};
  fieldsFor(type).forEach((f) => {
    if (f.default !== undefined) out[f.key] = f.default;
  });
  return out;
}

module.exports = {
  NODE_TYPES,
  FIELD_DEFS,
  CREATION_ORDER,
  typeInfo,
  fieldsFor,
  allowedChildren,
  defaultAttributes,
};
