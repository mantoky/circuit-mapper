/**
 * Nomenclatura padronizada de arquivos:
 *   LT-2026-0147_SE-01-QGBT-01_2026-07-25.pdf
 * Remove acentos e caracteres invalidos em sistemas de arquivos Android/iOS.
 */
function slug(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // remove diacriticos
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function fileName(header = {}, ext = 'pdf') {
  const parts = [
    slug(header.reportNumber || 'LAUDO'),
    slug(header.equipmentTag || header.site || 'CADASTRO'),
    (header.issueDate || new Date().toISOString()).slice(0, 10),
  ].filter(Boolean);
  const base = parts.join('_');
  return ext ? `${base}.${ext}` : base;
}

module.exports = { fileName, slug };
