/**
 * EXPORTACAO EXCEL (.xlsx)
 * ------------------------------------------------------------------
 * Usa o escritor proprio (src/export/xlsxWriter.js) em vez de exceljs.
 *
 * Motivo: exceljs depende de archiver, unzipper, readable-stream e tmp —
 * modulos de core do Node que nao existem no runtime Hermes/JSC. Metro
 * resolveria o bundle "browser" da lib (>1 MB, com globais de navegador),
 * o que e fonte classica de falha de build e de crash em producao.
 *
 * O escritor proprio gera OOXML valido (ZIP com entradas STORED), nao tem
 * dependencia alguma, e o mesmo codigo roda no app nativo e no build web.
 * A saida foi conferida contra openpyxl e LibreOffice Calc.
 */
import * as FileSystem from 'expo-file-system';
import { buildWorkbookSpec } from './workbookSpec';
import { specToXlsxBytes, bytesToBase64 } from './xlsxWriter';
import { fileName } from './fileName';

/**
 * Gera o Quadro de Cargas completo em .xlsx.
 * @returns {Promise<{uri:string, name:string, mime:string}>}
 */
export async function exportXlsx(tree, header) {
  const spec = buildWorkbookSpec(tree, header);
  const bytes = specToXlsxBytes(spec);
  const base64 = bytesToBase64(bytes);

  const name = fileName(header, 'xlsx');
  const uri = `${FileSystem.documentDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return {
    uri,
    name,
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

/** Exposto para inspecao/teste: bytes crus da planilha, sem tocar no disco */
export function buildXlsxBytes(tree, header) {
  return specToXlsxBytes(buildWorkbookSpec(tree, header));
}
