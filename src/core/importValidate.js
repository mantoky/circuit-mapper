/**
 * VALIDACAO DE IMPORT (CommonJS puro, testavel em Node sem React).
 * Extrai a logica de integridade do backup JSON para que jsonExport (ESM,
 * roda no Metro/Hermes) e a suite de testes (Node) compartilhem a mesma
 * implementacao.
 */
const { auditTree } = require('./treeEngine');

const MAX_NODES = 50000;
const MAX_DEPTH = 64;

/** Rejeita URLs remotas em logos; mantem data: e file: locais. */
function sanitizeLogo(v) {
  if (typeof v === 'string' && /^https?:/i.test(v.trim())) return null;
  return v ?? null;
}

function validateNodeShape(node, depthNum, seen) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    throw new Error('No invalido (nao e objeto).');
  }
  if (!node.id || typeof node.id !== 'string') {
    throw new Error('No sem id (ou id invalido).');
  }
  if (seen.has(node.id)) throw new Error(`ID duplicado: ${node.id}`);
  seen.add(node.id);
  if (seen.size > MAX_NODES) {
    throw new Error(`Projeto grande demais (>${MAX_NODES} nos).`);
  }
  if (!node.type || typeof node.type !== 'string') {
    throw new Error(`No ${node.id} sem tipo.`);
  }
  if (depthNum > MAX_DEPTH) {
    throw new Error('Profundidade excedida (possivel ciclo em children).');
  }
  const children = node.children;
  if (children != null && !Array.isArray(children)) {
    throw new Error(`No ${node.id} com children invalido (nao e lista).`);
  }
  (children || []).forEach((c) => validateNodeShape(c, depthNum + 1, seen));
}

/**
 * Valida um projeto desserializado { tree, header, schemaVersion }.
 * Devolve { tree, header } saneado ou lanca Error com mensagem em PT-BR.
 */
function validateImport(data) {
  if (!data || !Array.isArray(data.tree)) {
    throw new Error('Arquivo invalido: arvore ausente.');
  }
  const seen = new Set();
  data.tree.forEach((n) => validateNodeShape(n, 1, seen));

  const issues = auditTree(data.tree);
  const errors = issues.filter((i) => i.level === 'error');
  if (errors.length) {
    throw new Error(`Arquivo com erros estruturais: ${errors.map((e) => e.message).join('; ')}`);
  }

  const header = { ...(data.header || {}) };
  if (header.contractorLogo !== undefined) header.contractorLogo = sanitizeLogo(header.contractorLogo);
  if (header.clientLogo !== undefined) header.clientLogo = sanitizeLogo(header.clientLogo);

  return { tree: data.tree, header };
}

module.exports = {
  MAX_NODES, MAX_DEPTH,
  sanitizeLogo, validateNodeShape, validateImport,
};
