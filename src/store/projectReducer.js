/**
 * REDUCER PURO DO PROJETO (CommonJS)
 * Extraido do contexto para ser testavel em Node sem React.
 * Toda mutacao de estado do app passa por aqui.
 */
const engine = require('../core/treeEngine');
const { buildSeedTree, attachSampleAssets, seedReportHeader } = require('../core/seed');

const MAX_HISTORY = 40;

const emptyHeader = {
  reportTitle: 'LAUDO TECNICO DE MAPEAMENTO E CADASTRO DE CIRCUITOS ELETRICOS',
  reportNumber: '', revision: '00',
  client: '', clientCnpj: '', contractor: '', contractorDoc: '', contract: '',
  site: '', location: '', equipmentTag: '', requester: '',
  scope: '', methodology: '',
  standards: [
    'ABNT NBR 5410:2004 - Instalacoes eletricas de baixa tensao',
    'NR-10 - Seguranca em instalacoes e servicos em eletricidade',
  ],
  technician: '', technicianTitle: 'Engenheiro Eletricista', crea: '', art: '',
  inspectionDate: new Date().toISOString().slice(0, 10),
  issueDate: new Date().toISOString().slice(0, 10),
  instruments: [], contractorLogo: null, clientLogo: null,
};

const initialState = {
  ready: false, tree: [], header: emptyHeader, expanded: {},
  past: [], future: [], dirty: false,
  saveError: null, hydrateError: null,
};

function withHistory(state, tree) {
  return {
    ...state,
    past: [...state.past, state.tree].slice(-MAX_HISTORY),
    future: [],
    tree, dirty: true,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return {
        ...state,
        ...action.payload,
        ready: true,
        hydrateError: action.payload?.error || null,
      };

    case 'ADD_NODE': {
      const tree = engine.addChild(state.tree, action.parentId, action.node);
      const expanded = action.parentId
        ? { ...state.expanded, [action.parentId]: true } : state.expanded;
      return { ...withHistory(state, tree), expanded };
    }
    case 'UPDATE_NODE':
      return withHistory(state, engine.updateNode(state.tree, action.id, action.patch));
    case 'SET_ATTRIBUTE':
      return withHistory(state, engine.setAttribute(state.tree, action.id, action.key, action.value));
    case 'RENAME_ATTRIBUTE':
      return withHistory(state, engine.renameAttribute(state.tree, action.id, action.oldKey, action.newKey));
    case 'REMOVE_NODE':
      return withHistory(state, engine.removeNode(state.tree, action.id));
    case 'MOVE_NODE':
      return withHistory(state, engine.moveNode(state.tree, action.id, action.newParentId));
    case 'REORDER':
      return withHistory(state, engine.reorderSibling(state.tree, action.id, action.delta));
    case 'DUPLICATE_NODE':
      return withHistory(state, engine.duplicateNode(state.tree, action.id));
    case 'REPLACE_TREE':
      return withHistory(state, action.tree);

    case 'TOGGLE_EXPAND':
      return { ...state, expanded: { ...state.expanded, [action.id]: !state.expanded[action.id] } };
    case 'SET_EXPANDED_ALL': {
      const expanded = {};
      const walk = (l) => (l || []).forEach((n) => { expanded[n.id] = action.value; walk(n.children); });
      walk(state.tree);
      return { ...state, expanded };
    }

    case 'SET_HEADER':
      return { ...state, header: { ...state.header, ...action.patch }, dirty: true };

    case 'LOAD_DEMO': {
      const tree = attachSampleAssets(buildSeedTree());
      const expanded = {};
      const walk = (l) => (l || []).forEach((n) => { expanded[n.id] = true; walk(n.children); });
      walk(tree);
      return { ...withHistory(state, tree), header: { ...state.header, ...seedReportHeader }, expanded };
    }

    case 'UNDO': {
      if (!state.past.length) return state;
      const prev = state.past[state.past.length - 1];
      return {
        ...state, tree: prev,
        past: state.past.slice(0, -1),
        future: [state.tree, ...state.future].slice(0, MAX_HISTORY),
        dirty: true,
      };
    }
    case 'REDO': {
      if (!state.future.length) return state;
      const next = state.future[0];
      return {
        ...state, tree: next,
        past: [...state.past, state.tree].slice(-MAX_HISTORY),
        future: state.future.slice(1),
        dirty: true,
      };
    }
    case 'SAVED':
      return { ...state, dirty: false, saveError: null };
    case 'SAVE_ERROR':
      return { ...state, saveError: action.error || 'Falha desconhecida ao salvar.' };
    case 'RESET':
      return { ...initialState, ready: true };
    default:
      return state;
  }
}

module.exports = { reducer, initialState, emptyHeader, MAX_HISTORY };
