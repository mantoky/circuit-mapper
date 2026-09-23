/**
 * ESTADO GLOBAL DO PROJETO
 * - arvore recursiva + cabecalho do laudo
 * - historico (undo/redo) por snapshots imutaveis
 * - persistencia automatica com debounce (offline-first, essencial em campo)
 * - gravacao atomica (multiSet) e propagacao de erros (nao mente "salvo")
 */
import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import * as engine from '../core/treeEngine';
import { validateTree } from '../core/validation';
import { loadState, saveAll, clearAll } from './persistence';
import { reducer, initialState, emptyHeader } from './projectReducer';

const Ctx = createContext(null);

export function ProjectProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timer = useRef(null);
  const saveSeq = useRef(0);
  const mounted = useRef(true);

  // Hidratacao inicial
  useEffect(() => {
    mounted.current = true;
    (async () => {
      const s = await loadState();
      if (!mounted.current) return;
      dispatch({
        type: 'HYDRATE',
        payload: {
          tree: s.tree || [],
          header: s.header || emptyHeader,
          expanded: s.expanded || {},
          error: s.error || null,
        },
      });
    })();
    return () => { mounted.current = false; };
  }, []);

  // Persistencia com debounce de 600ms — atomica e com guarda contra saves antigos
  useEffect(() => {
    if (!state.ready) return;
    if (timer.current) clearTimeout(timer.current);
    const seq = ++saveSeq.current;
    timer.current = setTimeout(async () => {
      try {
        await saveAll({ tree: state.tree, header: state.header, expanded: state.expanded });
        // so confirma SAVED se nenhum save mais novo entrou em voo
        if (seq === saveSeq.current && mounted.current) dispatch({ type: 'SAVED' });
      } catch (err) {
        console.warn('[persistence] falha ao salvar:', err.message);
        if (seq === saveSeq.current && mounted.current) {
          dispatch({ type: 'SAVE_ERROR', error: err.message });
        }
      }
    }, 600);
    return () => timer.current && clearTimeout(timer.current);
  }, [state.tree, state.header, state.expanded, state.ready]);

  const validation = useMemo(() => validateTree(state.tree), [state.tree]);

  const api = useMemo(() => ({
    addNode: (parentId, node) => dispatch({ type: 'ADD_NODE', parentId, node }),
    updateNode: (id, patch) => dispatch({ type: 'UPDATE_NODE', id, patch }),
    setAttribute: (id, key, value) => dispatch({ type: 'SET_ATTRIBUTE', id, key, value }),
    addPhoto: (id, photo) => dispatch({ type: 'ADD_PHOTO', id, photo }),
    removePhoto: (id, photoId) => dispatch({ type: 'REMOVE_PHOTO', id, photoId }),
    setPhotoCaption: (id, photoId, caption) => dispatch({ type: 'SET_PHOTO_CAPTION', id, photoId, caption }),
    renameAttribute: (id, oldKey, newKey) => dispatch({ type: 'RENAME_ATTRIBUTE', id, oldKey, newKey }),
    removeNode: (id) => dispatch({ type: 'REMOVE_NODE', id }),
    moveNode: (id, newParentId) => dispatch({ type: 'MOVE_NODE', id, newParentId }),
    reorder: (id, delta) => dispatch({ type: 'REORDER', id, delta }),
    duplicateNode: (id) => dispatch({ type: 'DUPLICATE_NODE', id }),
    replaceTree: (tree) => dispatch({ type: 'REPLACE_TREE', tree }),
    toggleExpand: (id) => dispatch({ type: 'TOGGLE_EXPAND', id }),
    expandAll: () => dispatch({ type: 'SET_EXPANDED_ALL', value: true }),
    collapseAll: () => dispatch({ type: 'SET_EXPANDED_ALL', value: false }),
    setHeader: (patch) => dispatch({ type: 'SET_HEADER', patch }),
    undo: () => dispatch({ type: 'UNDO' }),
    redo: () => dispatch({ type: 'REDO' }),
    reset: async () => { await clearAll(); dispatch({ type: 'RESET' }); },
    loadDemo: () => dispatch({ type: 'LOAD_DEMO' }),
    importProject: ({ tree, header }) => {
      dispatch({ type: 'REPLACE_TREE', tree });
      if (header) dispatch({ type: 'SET_HEADER', patch: header });
    },
  }), []);

  const value = useMemo(() => ({ ...state, validation, ...api, engine }), [state, validation, api]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProject() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useProject deve ser usado dentro de <ProjectProvider>');
  return ctx;
}

export { emptyHeader };
