/**
 * EXPORTACAO PDF - expo-print (nativo Android/iOS, sem servidor)
 */
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { buildLaudoHtml } from './templates/laudoHtml';
import { fileName } from './fileName';

/**
 * Gera o laudo em PDF (capa + folhas tecnicas).
 * @returns {Promise<{uri:string, name:string, mime:string}>}
 */
export async function exportPdf(tree, header, opts = {}) {
  const html = buildLaudoHtml(tree, header, opts);
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
    width: 595,   // A4 @72dpi
    height: 842,
    margins: { left: 24, right: 24, top: 32, bottom: 40 },
  });
  const name = fileName(header, 'pdf');
  const dest = `${FileSystem.documentDirectory}${name}`;
  await FileSystem.moveAsync({ from: uri, to: dest });
  return { uri: dest, name, mime: 'application/pdf' };
}

/** Abre o dialogo nativo de impressao (impressora / salvar em PDF do SO) */
export async function printLaudo(tree, header, opts = {}) {
  const html = buildLaudoHtml(tree, header, opts);
  await Print.printAsync({ html });
}
