/**
 * TREE ENGINE - nucleo recursivo do aplicativo
 * ------------------------------------------------------------------
 * Todas as funcoes sao PURAS e IMUTAVEIS: recebem a arvore e devolvem
 * uma nova arvore. Isso garante re-render previsivel no React e permite
 * undo/redo trivial (pilha de snapshots).
 *
 * Niveis ILIMITADOS: nenhuma funcao assume profundidade maxima.
 */

const { defaultAttributes, allowedChildren, typeInfo } = require('./schema');

let _seq = 0;
/** ID estavel e legivel: <tipo>_<timestamp36>_<seq> */
function makeId(type = 'node') {
  _seq += 1;
  return `${type}_${Date.now().toString(36)}${_seq.toString(36).padStart(2, '0')}`;
}

/** Cria um no vazio ja com defaults do tipo */
function createNode({ type = 'panel', label = '', attributes = {}, children = [] } = {}) {
  const now = new Date().toISOString();
  return {
    id: makeId(type),
    label: label || typeInfo(type).label,
    type,
    attributes: { ...defaultAttributes(type), ...attributes },
    meta: { createdAt: now, updatedAt: now, notes: '', photos: [] },
    children: children.map((c) => (c.id ? c : createNode(c))),
  };
}

/** ---------------- LEITURA ---------------- */

/** Busca profunda por id. Retorna o no ou null. */
function findNode(nodes, id) {
  for (const n of nodes || []) {
    if (n.id === id) return n;
    const hit = findNode(n.children, id);
    if (hit) return hit;
  }
  return null;
}

/** Caminho de ancestrais (breadcrumb) do root ate o no, inclusive. */
function findPath(nodes, id, trail = []) {
  for (const n of nodes || []) {
    const next = [...trail, n];
    if (n.id === id) return next;
    const hit = findPath(n.children, id, next);
    if (hit) return hit;
  }
  return null;
}

/** Pai de um no (null se for raiz) */
function findParent(nodes, id) {
  const path = findPath(nodes, id);
  if (!path || path.length < 2) return null;
  return path[path.length - 2];
}

/** Profundidade maxima da arvore */
function depth(nodes) {
  if (!nodes || !nodes.length) return 0;
  return 1 + Math.max(...nodes.map((n) => depth(n.children)));
}

/** Achata a arvore em lista com nivel e caminho - base da TreeView virtualizada */
function flatten(nodes, { level = 0, parentPath = [], expanded = null } = {}) {
  const out = [];
  (nodes || []).forEach((n, index) => {
    const path = [...parentPath, n.label];
    const isExpanded = expanded ? !!expanded[n.id] : true;
    out.push({
      node: n,
      id: n.id,
      level,
      index,
      path,
      pathLabel: path.join(' > '),
      hasChildren: (n.children || []).length > 0,
      isExpanded,
      childCount: (n.children || []).length,
    });
    if (isExpanded && n.children && n.children.length) {
      out.push(...flatten(n.children, { level: level + 1, parentPath: path, expanded }));
    }
  });
  return out;
}

/** Todos os nos de um tipo, em ordem de arvore */
function collectByType(nodes, type, acc = []) {
  (nodes || []).forEach((n) => {
    if (n.type === type) acc.push(n);
    collectByType(n.children, type, acc);
  });
  return acc;
}

/** Contagem por tipo - usada no dashboard e no resumo do laudo */
function countByType(nodes, acc = {}) {
  (nodes || []).forEach((n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    countByType(n.children, acc);
  });
  return acc;
}

/** Total de nos */
function countAll(nodes) {
  return (nodes || []).reduce((s, n) => s + 1 + countAll(n.children), 0);
}

/** Busca textual em label e atributos */
function search(nodes, term) {
  const q = String(term || '').toLowerCase().trim();
  if (!q) return [];
  const out = [];
  const walk = (list, trail) => {
    (list || []).forEach((n) => {
      const path = [...trail, n.label];
      const hay = [n.label, n.type, ...Object.values(n.attributes || {})]
        .join(' ').toLowerCase();
      if (hay.includes(q)) out.push({ node: n, pathLabel: path.join(' > ') });
      walk(n.children, path);
    });
  };
  walk(nodes, []);
  return out;
}

/** ---------------- ESCRITA (imutavel) ---------------- */

/** Aplica um transformador em um no especifico, preservando o resto */
function mapNode(nodes, id, fn) {
  return (nodes || []).map((n) => {
    if (n.id === id) return fn(n);
    if (n.children && n.children.length) {
      const kids = mapNode(n.children, id, fn);
      if (kids !== n.children) return { ...n, children: kids };
    }
    return n;
  });
}

function touch(node) {
  return { ...node, meta: { ...(node.meta || {}), updatedAt: new Date().toISOString() } };
}

/** Insere filho. parentId null => raiz. Rejeita aninhamento invalido (canNest). */
function addChild(nodes, parentId, child) {
  const newNode = child && child.id ? child : createNode(child);
  if (!parentId) return [...(nodes || []), newNode];
  const parent = findNode(nodes, parentId);
  if (!parent) return nodes; // pai inexistente: no-op (antes dropava silenciosamente)
  if (!canNest(parent.type, newNode.type)) return nodes; // aninhamento invalido
  return mapNode(nodes, parentId, (p) =>
    touch({ ...p, children: [...(p.children || []), newNode] })
  );
}

/** Atualiza label / attributes / meta de um no */
function updateNode(nodes, id, patch) {
  return mapNode(nodes, id, (n) =>
    touch({
      ...n,
      ...('label' in patch ? { label: patch.label } : {}),
      attributes: { ...(n.attributes || {}), ...(patch.attributes || {}) },
      meta: { ...(n.meta || {}), ...(patch.meta || {}) },
    })
  );
}

/** Define/remove um atributo customizado ("Atributos Diversos") */
function setAttribute(nodes, id, key, value) {
  return mapNode(nodes, id, (n) => {
    const attrs = { ...(n.attributes || {}) };
    if (value === undefined || value === null || value === '') delete attrs[key];
    else attrs[key] = value;
    return touch({ ...n, attributes: attrs });
  });
}

function renameAttribute(nodes, id, oldKey, newKey) {
  return mapNode(nodes, id, (n) => {
    const attrs = { ...(n.attributes || {}) };
    if (!(oldKey in attrs) || !newKey || oldKey === newKey) return n;
    attrs[newKey] = attrs[oldKey];
    delete attrs[oldKey];
    return touch({ ...n, attributes: attrs });
  });
}

/** Remove no em qualquer profundidade */
function removeNode(nodes, id) {
  return (nodes || [])
    .filter((n) => n.id !== id)
    .map((n) => (n.children && n.children.length ? { ...n, children: removeNode(n.children, id) } : n));
}

/** Extrai (remove e devolve) um no - base do mover/arrastar */
function extractNode(nodes, id) {
  const node = findNode(nodes, id);
  if (!node) return { tree: nodes, node: null };
  return { tree: removeNode(nodes, id), node };
}

/** Impede mover um no para dentro de si mesmo ou de um descendente */
function isDescendant(node, candidateId) {
  return (node.children || []).some(
    (c) => c.id === candidateId || isDescendant(c, candidateId)
  );
}

/** Move no para novo pai (newParentId null => raiz) */
function moveNode(nodes, id, newParentId) {
  if (id === newParentId) return nodes;
  const node = findNode(nodes, id);
  if (!node) return nodes;
  if (newParentId && isDescendant(node, newParentId)) return nodes; // ciclo
  if (newParentId) {
    const parent = findNode(nodes, newParentId);
    if (!parent || !canNest(parent.type, node.type)) return nodes; // aninhamento invalido
  }
  const { tree } = extractNode(nodes, id);
  return addChild(tree, newParentId, node);
}

/** Reordena irmaos (drag vertical) */
function reorderSibling(nodes, id, delta) {
  const parent = findParent(nodes, id);
  const list = parent ? parent.children : nodes;
  const i = list.findIndex((n) => n.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return nodes;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  if (!parent) return next;
  return mapNode(nodes, parent.id, (p) => ({ ...p, children: next }));
}

/** Duplica no (e toda a subarvore) com novos ids */
function cloneSubtree(node, suffix = ' (copia)') {
  return {
    ...node,
    id: makeId(node.type),
    label: node.label + suffix,
    attributes: { ...node.attributes },
    meta: { ...(node.meta || {}), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    children: (node.children || []).map((c) => cloneSubtree(c, '')),
  };
}

function duplicateNode(nodes, id) {
  const node = findNode(nodes, id);
  if (!node) return nodes;
  const parent = findParent(nodes, id);
  return addChild(nodes, parent ? parent.id : null, cloneSubtree(node));
}

/** ---------------- VALIDACAO ESTRUTURAL ---------------- */

/** Verifica se o tipo pode ser filho do pai; usado antes de inserir */
function canNest(parentType, childType) {
  if (!parentType) return true; // raiz aceita qualquer coisa
  return allowedChildren(parentType).includes(childType);
}

/** Integridade: ids duplicados, aninhamentos invalidos, orfaos */
function auditTree(nodes) {
  const issues = [];
  const seen = new Set();
  const walk = (list, parent) => {
    (list || []).forEach((n) => {
      if (seen.has(n.id)) issues.push({ level: 'error', id: n.id, message: `ID duplicado: ${n.id}` });
      seen.add(n.id);
      if (!n.label || !String(n.label).trim()) {
        issues.push({ level: 'warn', id: n.id, message: 'Item sem descricao/label' });
      }
      if (parent && !canNest(parent.type, n.type)) {
        issues.push({
          level: 'warn', id: n.id,
          message: `"${typeInfo(n.type).label}" aninhado sob "${typeInfo(parent.type).label}" (fora do padrao)`,
        });
      }
      walk(n.children, n);
    });
  };
  walk(nodes, null);
  return issues;
}

module.exports = {
  makeId, createNode,
  findNode, findPath, findParent, depth, flatten, collectByType, countByType, countAll, search,
  mapNode, addChild, updateNode, setAttribute, renameAttribute,
  removeNode, extractNode, moveNode, reorderSibling, duplicateNode, cloneSubtree,
  isDescendant, canNest, auditTree,
};
