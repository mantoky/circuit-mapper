/**
 * ESCRITOR XLSX MINIMO (sem dependencias)
 * ------------------------------------------------------------------
 * Gera um .xlsx valido (OOXML em container ZIP) usando entradas STORED
 * (sem compressao), que o Excel/LibreOffice/Google Sheets aceitam.
 *
 * Motivo de existir: substitui o exceljs, que depende de modulos de core do
 * Node (archiver, unzipper, readable-stream, tmp) inexistentes no Hermes.
 * Sem dependencia alguma, o mesmo codigo roda no app nativo e no build web,
 * consumindo o mesmo workbookSpec.
 *
 * Suporta: multiplas abas, largura de coluna, mesclagem, congelamento de
 * painel, negrito, cor de fonte, preenchimento e bordas.
 */

/* ---------------- CRC32 / ZIP ---------------- */
let CRC_TABLE = null;
function crcTable() {
  if (CRC_TABLE) return CRC_TABLE;
  CRC_TABLE = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    CRC_TABLE[n] = c;
  }
  return CRC_TABLE;
}
function crc32(bytes) {
  const t = crcTable();
  let c = 0 ^ -1;
  for (let i = 0; i < bytes.length; i++) c = (c >>> 8) ^ t[(c ^ bytes[i]) & 0xff];
  return (c ^ -1) >>> 0;
}

/**
 * String -> bytes UTF-8. Implementacao propria como fallback porque o Hermes
 * (React Native) nao garante TextEncoder nem expoe Buffer.
 */
function utf8(str) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
  const s = String(str);
  const out = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i);
    // pares surrogados -> ponto de codigo unico
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      const c2 = s.charCodeAt(i + 1);
      if (c2 >= 0xdc00 && c2 <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        i++;
      }
    }
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63),
                  0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return new Uint8Array(out);
}

/** Monta um ZIP com entradas STORED. Devolve Uint8Array. */
function zip(entries) {
  const parts = [];
  const central = [];
  let offset = 0;

  const u16 = (n) => [n & 0xff, (n >>> 8) & 0xff];
  const u32 = (n) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];

  entries.forEach((e) => {
    const nameB = utf8(e.name);
    const data = e.data;
    const crc = crc32(data);
    const local = [
      ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length),
      ...u16(nameB.length), ...u16(0),
    ];
    parts.push(new Uint8Array(local), nameB, data);
    central.push({ nameB, crc, size: data.length, offset });
    offset += local.length + nameB.length + data.length;
  });

  const cdParts = [];
  let cdSize = 0;
  central.forEach((c) => {
    const rec = [
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0),
      ...u32(c.crc), ...u32(c.size), ...u32(c.size),
      ...u16(c.nameB.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0),
      ...u32(c.offset),
    ];
    cdParts.push(new Uint8Array(rec), c.nameB);
    cdSize += rec.length + c.nameB.length;
  });

  const end = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0),
    ...u16(central.length), ...u16(central.length),
    ...u32(cdSize), ...u32(offset), ...u16(0),
  ]);

  const all = [...parts, ...cdParts, end];
  const total = all.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  all.forEach((a) => { out.set(a, p); p += a.length; });
  return out;
}

/* ---------------- base64 (sem Buffer) ---------------- */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Uint8Array -> string base64, em JS puro.
 * Existe para o React Native (Hermes nao tem Buffer nem btoa) poder gravar
 * o .xlsx com expo-file-system usando EncodingType.Base64.
 */
function bytesToBase64(bytes) {
  let out = '';
  const len = bytes.length;
  let i = 0;
  for (; i + 2 < len; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >>> 18) & 63] + B64[(n >>> 12) & 63] + B64[(n >>> 6) & 63] + B64[n & 63];
  }
  const rest = len - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += B64[(n >>> 18) & 63] + B64[(n >>> 12) & 63] + '==';
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(n >>> 18) & 63] + B64[(n >>> 12) & 63] + B64[(n >>> 6) & 63] + '=';
  }
  return out;
}

/* ---------------- OOXML ---------------- */
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

function colLetter(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** Constroi a tabela de estilos a partir dos estilos usados nas linhas */
function buildStyles(styleDefs) {
  const fonts = ['<font><sz val="10"/><name val="Roboto"/></font>'];
  const fills = ['<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>'];
  const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>'];
  const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  const map = {};

  styleDefs.forEach((d, i) => {
    const fontXml = `<font>${d.bold ? '<b/>' : ''}${d.italic ? '<i/>' : ''}`
      + `<sz val="${d.size || 10}"/>`
      + `${d.color ? `<color rgb="${d.color}"/>` : ''}`
      + `<name val="${d.font || 'Roboto'}"/></font>`;
    let fontId = fonts.indexOf(fontXml);
    if (fontId < 0) { fonts.push(fontXml); fontId = fonts.length - 1; }

    let fillId = 0;
    if (d.fill) {
      const fillXml = `<fill><patternFill patternType="solid"><fgColor rgb="${d.fill}"/>`
        + `<bgColor indexed="64"/></patternFill></fill>`;
      fillId = fills.indexOf(fillXml);
      if (fillId < 0) { fills.push(fillXml); fillId = fills.length - 1; }
    }

    let borderId = 0;
    if (d.border) {
      const b = '<border>'
        + ['left', 'right', 'top', 'bottom'].map((s) =>
          `<${s} style="thin"><color rgb="FFB0B0B0"/></${s}>`).join('')
        + '<diagonal/></border>';
      borderId = borders.indexOf(b);
      if (borderId < 0) { borders.push(b); borderId = borders.length - 1; }
    }

    const align = `<alignment horizontal="${d.align || 'left'}" vertical="center"`
      + `${d.wrap ? ' wrapText="1"' : ''}${d.indent ? ` indent="${d.indent}"` : ''}/>`;
    xfs.push(`<xf numFmtId="0" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}"`
      + ` xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${align}</xf>`);
    map[d.key] = xfs.length - 1;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="${fonts.length}">${fonts.join('')}</fonts>
<fills count="${fills.length}">${fills.join('')}</fills>
<borders count="${borders.length}">${borders.join('')}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
  return { xml, map };
}

function sheetXml(sheet, styleMap, resolveStyle) {
  const widths = (sheet.widths || []).map((w, i) =>
    `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');

  const merges = [];
  const rowsXml = sheet.rows.map((r, ri) => {
    const rowNum = ri + 1;
    const cells = [];
    const spans = r.spans || null;
    let col = 1;
    (r.cells || []).forEach((v, ci) => {
      const span = spans ? (spans[ci] || 1) : 1;
      const ref = `${colLetter(col)}${rowNum}`;
      if (span > 1) merges.push(`${ref}:${colLetter(col + span - 1)}${rowNum}`);
      if (v !== null && v !== undefined && v !== '') {
        const s = resolveStyle(r, ci, col);
        const sAttr = s !== undefined ? ` s="${s}"` : '';
        if (typeof v === 'number' && Number.isFinite(v)) {
          cells.push(`<c r="${ref}"${sAttr}><v>${v}</v></c>`);
        } else {
          cells.push(`<c r="${ref}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`);
        }
      } else {
        const s = resolveStyle(r, ci, col);
        if (s !== undefined) cells.push(`<c r="${ref}" s="${s}"/>`);
      }
      col += span;
    });
    if (!spans && r.merge && (r.cells || []).length) {
      merges.push(`A${rowNum}:${colLetter(r.merge)}${rowNum}`);
    }
    const ht = r.style === 'title' ? ' ht="22" customHeight="1"'
      : r.style === 'header' ? ' ht="30" customHeight="1"' : '';
    return `<row r="${rowNum}"${ht}>${cells.join('')}</row>`;
  }).join('');

  const freeze = sheet.freeze
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${parseInt(String(sheet.freeze).replace(/\D/g, ''), 10) - 1}"`
      + ` topLeftCell="${sheet.freeze}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
${freeze}
<sheetFormatPr defaultRowHeight="14"/>
${widths ? `<cols>${widths}</cols>` : ''}
<sheetData>${rowsXml}</sheetData>
${merges.length ? `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}
<pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
}

/**
 * @param {Object} spec  saida de buildWorkbookSpec()
 * @returns {Uint8Array} conteudo binario do .xlsx
 */
function specToXlsxBytes(spec) {
  const S = spec.style;
  const defs = [
    { key: 'title', bold: true, size: 14, color: S.yellow, fill: S.charcoal, indent: 1 },
    { key: 'subtitle', italic: true, size: 10, color: S.textLight, fill: S.charcoalSoft },
    { key: 'section', bold: true, size: 10, color: S.textDark, fill: S.yellow },
    { key: 'header', bold: true, size: 9, color: S.yellow, fill: S.charcoal, align: 'center', wrap: true, border: true },
    { key: 'total', bold: true, size: 9, color: S.textDark, fill: S.yellow, border: true },
    { key: 'verdict', bold: true, size: 11, color: S.yellow, fill: S.charcoal, border: true },
    { key: 'note', italic: true, size: 8, color: 'FF666666' },
    { key: 'kvKey', bold: true, size: 9, fill: S.gray, border: true },
    { key: 'kvVal', size: 9, border: true },
    { key: 'data', size: 9, border: true },
    { key: 'dataWarn', size: 9, fill: S.warn, border: true },
    { key: 'dataErr', size: 9, fill: S.err, border: true },
  ];
  const { xml: stylesXml, map } = buildStyles(defs);

  const resolveStyle = (r, ci, col) => {
    const st = r.style;
    if (st === 'kv' || st === 'kvline') {
      if (r.spans && r.spans.length) return map[ci % 2 === 0 ? 'kvKey' : 'kvVal'];
      return map[(st === 'kv' ? col === 1 : col % 2 === 1) ? 'kvKey' : 'kvVal'];
    }
    if (st && map[st] !== undefined) return map[st];
    if (!st) {
      if (r.status === 'error') return map.dataErr;
      if (r.status === 'warn') return map.dataWarn;
      return map.data;
    }
    return undefined;
  };

  const sheets = spec.sheets;
  const files = [];
  files.push({
    name: '[Content_Types].xml',
    data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`),
  });
  files.push({
    name: '_rels/.rels',
    data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
  });
  files.push({
    name: 'xl/workbook.xml',
    data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheets.map((s, i) =>
      `<sheet name="${esc(s.name).slice(0, 31)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
</workbook>`),
  });
  files.push({
    name: 'xl/_rels/workbook.xml.rels',
    data: utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}
<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
  });
  files.push({ name: 'xl/styles.xml', data: utf8(stylesXml) });
  sheets.forEach((s, i) => {
    files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: utf8(sheetXml(s, map, resolveStyle)) });
  });

  return zip(files);
}

module.exports = { specToXlsxBytes, zip, crc32, colLetter, bytesToBase64, utf8 };
