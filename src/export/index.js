/**
 * ORQUESTRADOR DE EXPORTACAO - "Gerar Laudo"
 * Um unico ponto de entrada para os 4 formatos + backup JSON.
 */
import * as Sharing from 'expo-sharing';
import { exportPdf, printLaudo } from './pdfExport';
import { exportDoc } from './docExport';
import { exportXlsx } from './xlsxExport';
import { exportImage, saveToGallery } from './imageExport';
import { exportJson } from './jsonExport';

export const FORMATS = [
  { key: 'pdf',  label: 'PDF',   hint: 'Laudo completo com capa',        icon: 'PDF' },
  { key: 'doc',  label: 'WORD',  hint: 'Editavel (.doc)',                icon: 'DOC' },
  { key: 'xlsx', label: 'EXCEL', hint: 'Quadro de cargas por quadro',    icon: 'XLS' },
  { key: 'png',  label: 'IMAGEM', hint: 'Resumo executivo (.png/.jpg)',  icon: 'IMG' },
  { key: 'json', label: 'BACKUP', hint: 'Projeto completo (.json)',      icon: 'BAK' },
];

/**
 * @param {'pdf'|'doc'|'xlsx'|'png'|'jpg'|'json'} format
 * @param {Object} ctx { tree, header, viewRef, sections }
 */
export async function generate(format, ctx) {
  const { tree, header, viewRef, sections } = ctx;
  switch (format) {
    case 'pdf':  return exportPdf(tree, header, { sections });
    case 'doc':  return exportDoc(tree, header, { sections });
    case 'xlsx': return exportXlsx(tree, header);
    case 'png':  return exportImage(viewRef, header, 'png');
    case 'jpg':  return exportImage(viewRef, header, 'jpg');
    case 'json': return exportJson(tree, header);
    default: throw new Error(`Formato nao suportado: ${format}`);
  }
}

/** Gera e abre a folha de compartilhamento nativa */
export async function generateAndShare(format, ctx) {
  const file = await generate(format, ctx);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: file.mime,
      dialogTitle: `Compartilhar ${file.name}`,
      UTI: format === 'pdf' ? 'com.adobe.pdf' : undefined,
    });
  }
  return file;
}

/** Gera todos os formatos em lote (usado no botao "Pacote completo") */
export async function generateAll(ctx, formats = ['pdf', 'doc', 'xlsx', 'json']) {
  const out = [];
  for (const f of formats) {
    try { out.push({ format: f, ...(await generate(f, ctx)) }); }
    catch (e) { out.push({ format: f, error: e.message }); }
  }
  return out;
}

export { printLaudo, saveToGallery };
