/**
 * EXPORTACAO DOC (Word) - HTML com cabecalhos MSO.
 * Estrategia deliberada: gera .doc valido, editavel no Word/Google Docs/LibreOffice,
 * sem dependencias binarias que quebrem o bundle RN. Mantem toda a formatacao
 * (cores do tema, tabelas do quadro de cargas, quebras de pagina A4).
 */
import * as FileSystem from 'expo-file-system';
import { buildLaudoHtml } from './templates/laudoHtml';
import { fileName } from './fileName';

const MSO_HEAD = `<!--[if gte mso 9]><xml>
<w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument>
</xml><![endif]-->
<style>@page WordSection1 { size:21cm 29.7cm; margin:1.4cm 1.2cm 1.6cm 1.2cm; }
div.WordSection1 { page:WordSection1; } br.pb { page-break-before:always; }</style>`;

export async function exportDoc(tree, header, opts = {}) {
  const html = buildLaudoHtml(tree, header, opts)
    .replace('</head>', `${MSO_HEAD}</head>`)
    .replace('<body>', '<body><div class="WordSection1">')
    .replace('</body>', '</div></body>');

  const name = fileName(header, 'doc');
  const uri = `${FileSystem.documentDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, html, { encoding: FileSystem.EncodingType.UTF8 });
  return { uri, name, mime: 'application/msword' };
}
