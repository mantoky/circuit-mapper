/**
 * TEMPLATE HTML DO LAUDO - Circuit Mapper
 * ------------------------------------------------------------------
 * Funcao PURA: (tree, header) => string HTML paginado A4.
 * Este mesmo HTML alimenta 3 saidas:
 *   - PDF  : expo-print.printToFileAsync
 *   - DOC  : blob Word-compativel (MSO headers)
 *   - IMG  : renderizacao em WebView + react-native-view-shot
 */

const { flatten, collectByType, countByType, countAll, depth } = require('../../core/treeEngine');
const { validateTree } = require('../../core/validation');
const { buildAllTables, buildAssetInventory } = require('../../core/loadTable');
const { typeInfo } = require('../../core/schema');

const T = {
  bg: '#0E1A2B', deep: '#0A1422', surf: '#16263D', surfAlt: '#1C2E47',
  yellow: '#22D3EE', text: '#E6EDF3', muted: '#9FB3C8',
  ok: '#34D399', warn: '#FBBF24', err: '#F87171', border: '#2A3F5F',
};

function esc(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(iso) {
  if (!iso) return '-';
  // Datas "AAAA-MM-DD" sao tratadas como data civil local: new Date('2026-07-25')
  // seria interpretado como UTC e retrocederia um dia em fusos negativos (BRT).
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Evita "ART ART 123" quando o usuario ja digita o prefixo no campo. */
function artLabel(v) {
  const t = String(v || '').trim();
  if (!t) return '';
  return /^art\b/i.test(t) ? t.toUpperCase().replace(/^ART\s*/i, 'ART ') : `ART ${t}`;
}

function num(v, d = 2) {
  if (v === '-' || v === null || v === undefined || v === '') return '-';
  const n = Number(v);
  if (!Number.isFinite(n)) return esc(v);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: d });
}

/** <colgroup> proporcional: com table-layout:fixed garante que N colunas
 *  caibam exatamente na largura util da folha, sem estouro horizontal. */
function colgroup(widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  return `<colgroup>${widths
    .map((w) => `<col style="width:${((w / total) * 100).toFixed(3)}%"/>`)
    .join('')}</colgroup>`;
}

const statusPill = (s, compact = false) => {
  const map = {
    ok: [T.ok, 'CONFORME', 'CONFORME'],
    warn: [T.warn, 'RESSALVA', 'RESSALVA'],
    error: [T.err, 'NAO CONFORME', 'NAO CONF.'],
    CONFORME: [T.ok, 'CONFORME', 'CONFORME'],
    RESSALVA: [T.warn, 'RESSALVA', 'RESSALVA'],
    'NAO CONFORME': [T.err, 'NAO CONFORME', 'NAO CONF.'],
  };
  const e = map[s] || [T.muted, '-', '-'];
  const label = compact ? e[2] : e[1];
  return `<span class="pill" style="background:${e[0]}1F;color:${e[0]};border-color:${e[0]}">${label}</span>`;
};

/* ============================ CSS ============================ */
function styles() {
  return `
  @page { size: A4 portrait; margin: 14mm 12mm 16mm 12mm; }
  /* O quadro de cargas tem 20 colunas tecnicas: exige folha em paisagem. */
  @page land { size: A4 landscape; margin: 11mm 9mm 12mm 9mm; }
  .page.land { page: land; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin:0; background:#fff; color:#0E1A2B;
         font-family: Roboto, "Aptos Narrow", "Helvetica Neue", Arial, sans-serif; font-size:9.5pt; line-height:1.42; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }

  /* ---------- CAPA ---------- */
  /* Capa em coluna flex: o bloco de assinatura e empurrado para a base
     sem posicionamento absoluto, evitando sobreposicao com a tabela de dados. */
  .cover { background:${T.bg}; color:${T.text}; height:265mm; padding:0; position:relative;
           display:flex; flex-direction:column; }
  .cover .topbar { height:9mm; background:${T.yellow}; flex:none; }
  .cover .botbar { height:5mm; background:${T.yellow}; flex:none; }
  .cover .inner  { flex:1; padding:10mm 14mm 8mm; display:flex; flex-direction:column; }
  .cover .spacer { flex:1; min-height:6mm; }
  .logos { display:flex; justify-content:space-between; align-items:center; gap:10mm; }
  .logobox { flex:1; height:22mm; border:1.2pt dashed ${T.border}; border-radius:3mm;
             display:flex; align-items:center; justify-content:center; overflow:hidden; background:#FFFFFF0A; }
  .logobox img { max-height:20mm; max-width:100%; object-fit:contain; }
  .logobox span { color:${T.muted}; font-size:7.5pt; letter-spacing:.8pt; text-transform:uppercase; }
  .cover h1 { font-size:26pt; line-height:1.14; font-weight:900; margin:10mm 0 3mm; letter-spacing:.2pt;
              color:${T.text}; text-transform:uppercase; }
  .cover .bar { width:44mm; height:2.6mm; background:${T.yellow}; margin:0 0 6mm; }
  .cover h2 { font-size:13pt; font-weight:500; color:${T.yellow}; margin:0 0 8mm; }
  .cover .meta { width:100%; border-collapse:collapse; margin:0; }
  .cover .meta td { padding:2.6mm 3mm; border-bottom:.6pt solid ${T.border}; font-size:9.5pt; vertical-align:top; }
  .cover .meta td.k { color:${T.yellow}; width:38mm; font-weight:700; font-size:8pt;
                      letter-spacing:.7pt; text-transform:uppercase; }
  .cover .sig { display:flex; gap:8mm; flex:none; }
  .cover .sig div { flex:1; border-top:.9pt solid ${T.yellow}; padding-top:2.4mm; font-size:8pt; color:${T.muted}; }
  .cover .sig strong { display:block; color:${T.text}; font-size:10pt; margin-bottom:.8mm; }
  .stamprow { display:flex; justify-content:flex-end; margin-top:5mm; flex:none; }
  .stamp { border:1.6pt solid ${T.yellow}; color:${T.yellow}; display:inline-block;
           padding:1.6mm 4mm; font-size:8pt; font-weight:900; letter-spacing:1.4pt; }

  /* ---------- CONTEUDO ---------- */
  .hdr { display:flex; justify-content:space-between; align-items:center;
         border-bottom:1.6pt solid ${T.yellow}; padding-bottom:2mm; margin-bottom:5mm; }
  .hdr .l { font-size:8pt; font-weight:900; letter-spacing:1pt; text-transform:uppercase; color:#0E1A2B; }
  .hdr .r { font-size:7.5pt; color:#666; text-align:right; }
  h3.sec { background:${T.bg}; color:${T.yellow}; font-size:10.5pt; font-weight:900; letter-spacing:.8pt;
           text-transform:uppercase; padding:2.4mm 3mm; margin:6mm 0 3mm; border-left:3.4mm solid ${T.yellow}; }
  h4.sub { font-size:9.5pt; font-weight:800; color:#0E1A2B; margin:4mm 0 1.6mm;
           border-bottom:.6pt solid #CCC; padding-bottom:1mm; }
  p { margin:0 0 2.6mm; text-align:justify; }
  ul.norm { margin:0 0 3mm; padding-left:6mm; }
  ul.norm li { margin-bottom:1.2mm; }

  table.d { width:100%; border-collapse:collapse; margin-bottom:4mm; table-layout:fixed; }
  table.d tr { page-break-inside:avoid; }
  table.d th, table.d td { word-wrap:break-word; overflow-wrap:break-word; }
  table.d thead { display:table-header-group; }
  table.d th { background:${T.bg}; color:${T.yellow}; font-size:6.8pt; font-weight:800; letter-spacing:.3pt;
               text-transform:uppercase; padding:1.6mm 1mm; border:.5pt solid ${T.border}; text-align:center; }
  table.d td { font-size:7.4pt; padding:1.3mm 1mm; border:.5pt solid #BBB; text-align:center; }
  table.d td.l { text-align:left; }
  table.d tbody tr:nth-child(even) { background:#F2F2F2; }
  table.d tfoot td { background:#E4E4E4; font-weight:800; font-size:7.6pt; border:.5pt solid #999; }
  table.d tr.nc td { background:#FBE6E6; }
  table.d tr.wn td { background:#FFF4E0; }

  table.kv { width:100%; border-collapse:collapse; margin-bottom:3mm; }
  table.kv td { font-size:8.4pt; padding:1.5mm 2mm; border:.5pt solid #CCC; }
  table.kv td.k { background:#EDEDED; font-weight:800; width:32mm; font-size:7.4pt;
                  text-transform:uppercase; letter-spacing:.4pt; }

  .pill { display:inline-block; font-size:6.2pt; font-weight:900; letter-spacing:.2pt;
          padding:.5mm 1.2mm; border-radius:1mm; border:.6pt solid; white-space:nowrap; }

  .cards { display:flex; gap:2.6mm; margin-bottom:4mm; flex-wrap:wrap; }
  .card { flex:1; min-width:26mm; background:${T.bg}; color:${T.text}; border-radius:1.6mm;
          padding:2.6mm; border-left:2.4mm solid ${T.yellow}; }
  .card .v { font-size:16pt; font-weight:900; color:${T.yellow}; line-height:1; }
  .card .k { font-size:6.6pt; text-transform:uppercase; letter-spacing:.7pt; color:${T.muted}; margin-top:1.2mm; }

  .verdict { border:1.4pt solid; border-radius:2mm; padding:3.4mm; margin:4mm 0; font-weight:800; font-size:11pt;
             text-align:center; letter-spacing:.6pt; text-transform:uppercase; }

  /* ---------- ARVORE ---------- */
  .tree { border:.6pt solid #CCC; border-radius:1.4mm; overflow:hidden; margin-bottom:4mm; }
  .tr { display:flex; align-items:center; gap:2mm; padding:1.3mm 2mm; border-bottom:.4pt solid #E2E2E2; font-size:8pt; }
  .tr:nth-child(even) { background:#F7F7F7; }
  .tr .tag { font-size:6.4pt; font-weight:900; letter-spacing:.4pt; padding:.4mm 1.4mm; border-radius:.8mm;
             background:${T.bg}; color:${T.yellow}; min-width:12mm; text-align:center; }
  .tr .lb { flex:1; font-weight:600; }
  .tr .at { color:#777; font-size:7pt; }

  /* ---------- APONTAMENTOS ---------- */
  .fnd { border:.7pt solid #CCC; border-left:2.6mm solid ${T.err}; border-radius:1.4mm;
         padding:2.4mm 3mm; margin-bottom:2.6mm; page-break-inside:avoid; }
  .fnd.w { border-left-color:${T.warn}; }
  .fnd .t { display:flex; justify-content:space-between; gap:3mm; margin-bottom:1.4mm; align-items:flex-start; }
  .fnd .code { font-size:7.4pt; font-weight:900; letter-spacing:.6pt; background:${T.bg}; color:${T.yellow};
               padding:.6mm 1.8mm; border-radius:.8mm; white-space:nowrap; }
  .fnd .loc { font-size:7pt; color:#777; text-align:right; }
  .fnd .msg { font-size:8.4pt; font-weight:600; margin-bottom:1.2mm; }
  .fnd .act { font-size:7.8pt; color:#333; }
  .fnd .act b { color:${T.bg}; }
  .fnd .ref { font-size:6.8pt; color:#888; font-style:italic; margin-top:1mm; }

  .ftnote { font-size:7pt; color:#777; border-top:.5pt solid #CCC; padding-top:1.6mm; margin-top:4mm; }
  .sigblock { display:flex; gap:8mm; margin-top:18mm; }
  .sigblock div { flex:1; text-align:center; border-top:.9pt solid #333; padding-top:2mm; font-size:8pt; }
  .sigblock strong { display:block; font-size:10pt; }

  /* ---------- REGISTRO FOTOGRAFICO ---------- */
  .gallery { display:flex; flex-wrap:wrap; gap:4mm; }
  .ph { width:72mm; page-break-inside:avoid; border:.6pt solid #CCC; border-radius:1.4mm;
        overflow:hidden; background:#FAFAFA; }
  .ph img { width:100%; height:48mm; object-fit:cover; display:block; }
  .ph .cap { font-size:8pt; padding:1.6mm 2mm .6mm; font-weight:600; color:#0E1A2B; }
  .ph .loc { font-size:7pt; padding:0 2mm 1.8mm; color:#777; }
  `;
}

/* ======================= BLOCOS ======================= */

function coverPage(h) {
  const logo = (src, label) => src
    ? `<div class="logobox"><img src="${esc(src)}" /></div>`
    : `<div class="logobox"><span>${esc(label)}</span></div>`;
  return `
  <div class="page cover">
    <div class="topbar"></div>
    <div class="inner">
    <div class="logos">
      ${logo(h.contractorLogo, 'Logo Contratada')}
      ${logo(h.clientLogo, 'Logo Contratante')}
    </div>
    <div class="stamprow"><span class="stamp">DOCUMENTO TECNICO</span></div>
    <h1>${esc(h.reportTitle || 'Laudo Tecnico de Circuitos Eletricos')}</h1>
    <div class="bar"></div>
    <h2>${esc(h.site || '')}${h.equipmentTag ? ' &nbsp;|&nbsp; ' + esc(h.equipmentTag) : ''}</h2>
    <table class="meta">
      <tr><td class="k">Documento</td><td><strong>${esc(h.reportNumber || '-')}</strong> &nbsp;&nbsp; Rev. ${esc(h.revision || '00')}</td></tr>
      <tr><td class="k">Contratante</td><td>${esc(h.client || '-')}${h.clientCnpj ? ' &mdash; ' + esc(h.clientCnpj) : ''}</td></tr>
      <tr><td class="k">Contratada</td><td>${esc(h.contractor || '-')}${h.contractorDoc ? ' &mdash; ' + esc(h.contractorDoc) : ''}</td></tr>
      <tr><td class="k">Contrato</td><td>${esc(h.contract || '-')}</td></tr>
      <tr><td class="k">Localidade</td><td>${esc(h.location || '-')}</td></tr>
      <tr><td class="k">TAG do Equip.</td><td>${esc(h.equipmentTag || '-')}</td></tr>
      <tr><td class="k">Solicitante</td><td>${esc(h.requester || '-')}</td></tr>
      <tr><td class="k">Data da Inspecao</td><td>${fmtDate(h.inspectionDate)}</td></tr>
      <tr><td class="k">Data de Emissao</td><td>${fmtDate(h.issueDate)}</td></tr>
    </table>
    <div class="spacer"></div>
    <div class="sig">
      <div><strong>${esc(h.technician || '-')}</strong>${esc(h.technicianTitle || '')} &mdash; ${esc(h.crea || '')}</div>
      <div><strong>ART / RRT</strong>${esc(artLabel(h.art) || 'A emitir')}</div>
    </div>
    </div>
    <div class="botbar"></div>
  </div>`;
}

function pageHeader(h, title) {
  return `<div class="hdr">
    <div class="l">${esc(title)}</div>
    <div class="r">${esc(h.reportNumber || '')} &nbsp;Rev.${esc(h.revision || '00')}<br/>${esc(h.site || '')}</div>
  </div>`;
}

function introPage(h, tree, val) {
  const counts = countByType(tree);
  const rows = Object.entries(counts)
    .map(([k, v]) => `<tr><td class="l">${esc(typeInfo(k).label)}</td><td>${v}</td></tr>`).join('');
  return `
  <div class="page">
    ${pageHeader(h, 'Identificacao e Metodologia')}
    <h3 class="sec">1. Objetivo</h3>
    <p>Este documento apresenta o resultado do mapeamento, cadastro hierarquico e verificacao de conformidade
    dos circuitos eletricos da instalacao identificada, tendo por finalidade subsidiar as acoes de manutencao,
    a atualizacao do cadastro tecnico de ativos e a adequacao da instalacao aos requisitos normativos vigentes.</p>

    <h3 class="sec">2. Escopo dos Servicos</h3>
    <p>${esc(h.scope || '-')}</p>

    <h3 class="sec">3. Normas e Documentos de Referencia</h3>
    <ul class="norm">${(h.standards || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>

    <h3 class="sec">4. Metodologia Aplicada</h3>
    <p>${esc(h.methodology || '-')}</p>

    <h3 class="sec">5. Instrumentos Utilizados</h3>
    <table class="d">
      ${colgroup([34, 24, 22, 20])}
      <thead><tr><th>Instrumento</th><th>Modelo</th><th>N. de Serie</th><th>Calibracao</th></tr></thead>
      <tbody>${(h.instruments || []).map((i) => `<tr>
        <td class="l">${esc(i.name)}</td><td>${esc(i.model)}</td>
        <td>${esc(i.serial)}</td><td>${fmtDate(i.calibration)}</td></tr>`).join('')}</tbody>
    </table>

    <h3 class="sec">6. Sintese do Cadastro Realizado</h3>
    <div class="cards">
      <div class="card"><div class="v">${countAll(tree)}</div><div class="k">Itens Cadastrados</div></div>
      <div class="card"><div class="v">${val.summary.panels}</div><div class="k">Quadros</div></div>
      <div class="card"><div class="v">${val.summary.circuits}</div><div class="k">Circuitos</div></div>
      <div class="card"><div class="v">${depth(tree)}</div><div class="k">Niveis Hierarquicos</div></div>
      <div class="card"><div class="v">${num(val.summary.totalKva)}</div><div class="k">kVA Instalados</div></div>
    </div>
    <table class="d" style="width:60%"><thead><tr><th>Categoria de Ativo</th><th>Quantidade</th></tr></thead>
      <tbody>${rows}</tbody></table>
  </div>`;
}

function treePage(h, tree) {
  const flat = flatten(tree);
  const rows = flat.map((f) => {
    const ti = typeInfo(f.node.type);
    const a = f.node.attributes || {};
    const withV = (v) => (/v/i.test(String(v)) ? String(v) : `${v}V`);
    const bits = [a.tag, a.tension && withV(a.tension), a.section && `${a.section}mm2`,
      a.breaker && `${a.breaker}A`, a.phase && `Fase ${a.phase}`, a.location, a.assetType]
      .filter(Boolean).slice(0, 4).join(' | ');
    return `<div class="tr">
      <span style="width:${f.level * 4}mm; display:inline-block"></span>
      <span class="tag">${esc(ti.short)}</span>
      <span class="lb">${esc(f.node.label)}</span>
      <span class="at">${esc(bits)}</span>
    </div>`;
  }).join('');
  return `
  <div class="page">
    ${pageHeader(h, 'Estrutura Hierarquica da Instalacao')}
    <h3 class="sec">7. Arvore de Ativos Eletricos</h3>
    <p>Estrutura recursiva levantada em campo, do suprimento primario ate a carga terminal
    (profundidade de ${depth(tree)} niveis, ${countAll(tree)} itens).</p>
    <div class="tree">${rows}</div>
  </div>`;
}

function loadTablePages(h, tree) {
  const tables = buildAllTables(tree);
  return tables.map((t, i) => {
    const a = t.attributes || {};
    const head = t.columns.map((c) => `<th>${esc(c.header)}</th>`).join('');
    const body = t.rows.map((r) => {
      const cls = r._status === 'error' ? 'nc' : r._status === 'warn' ? 'wn' : '';
      return `<tr class="${cls}">${t.columns.map((c) => {
        const v = r[c.key];
        if (c.key === 'status') return `<td>${statusPill(v, true)}</td>`;
        const align = (c.key === 'description') ? ' class="l"' : '';
        const isNum = ['powerW', 'powerVa', 'ib', 'iz', 'voltageDrop', 'length', 'breaker', 'tension'].includes(c.key);
        return `<td${align}>${isNum ? num(v, 2) : esc(v)}</td>`;
      }).join('')}</tr>`;
    }).join('');
    return `
    <div class="page land">
      ${pageHeader(h, `Quadro de Cargas ${t.tag}`)}
      <h3 class="sec">8.${i + 1} Quadro de Cargas &mdash; ${esc(t.tag)}</h3>
      <table class="kv">
        <tr><td class="k">TAG</td><td>${esc(a.tag || t.panel.label)}</td>
            <td class="k">Tensao</td><td>${esc(a.tension || '-')}</td>
            <td class="k">Grau de Prot.</td><td>${esc(a.ipGrade || '-')}</td></tr>
        <tr><td class="k">Localizacao</td><td>${esc(a.location || '-')}</td>
            <td class="k">Prot. Geral</td><td>${esc(a.mainBreaker || '-')}</td>
            <td class="k">Barramento</td><td>${esc(a.busbarCurrent ? a.busbarCurrent + ' A' : '-')}</td></tr>
        <tr><td class="k">Alimentador</td><td>${esc(a.feederSection || '-')}${a.feederLength ? ' / ' + esc(a.feederLength) + ' m' : ''}</td>
            <td class="k">Fator Demanda</td><td>${esc(a.demandFactor !== undefined ? a.demandFactor : '-')}</td>
            <td class="k">Fabricante</td><td>${esc(a.manufacturer || '-')}</td></tr>
        <tr><td class="k">Caminho</td><td colspan="5">${esc(t.path)}</td></tr>
      </table>
      <table class="d">
        ${colgroup(t.columns.map((c) => c.width))}
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
        <tfoot>
          <tr>
            <td colspan="4">TOTAL &mdash; ${t.totals.circuits} circuitos</td>
            <td>${num(t.totals.powerW, 0)}</td>
            <td>${num(t.totals.powerVa, 0)}</td>
            <td colspan="8">Potencia aparente total: <b>${num(t.totals.powerKva)} kVA</b> &nbsp;|&nbsp;
                Demanda: <b>${num(t.totals.demandKva)} kVA</b></td>
            <td colspan="4">Corrente de demanda: <b>${num(t.totals.demandCurrent)} A</b></td>
            <td>${t.totals.nonConform ? statusPill('error', true) : t.totals.attention ? statusPill('warn', true) : statusPill('ok', true)}</td>
          </tr>
        </tfoot>
      </table>
      <div class="ftnote">Ib = corrente de projeto | Iz = capacidade de conducao corrigida (FCA x FCT) |
      dV = queda de tensao acumulada no circuito terminal. Criterio de aceitacao: Ib &le; In &le; Iz e dV &le; 4% (NBR 5410, 5.3.4 e 6.2.7).</div>
    </div>`;
  }).join('');
}

function assetPage(h, tree) {
  const inv = buildAssetInventory(tree);
  if (!inv.length) return '';
  return `
  <div class="page land">
    ${pageHeader(h, 'Inventario de Ativos')}
    <h3 class="sec">9. Inventario de Ativos e Cargas Terminais</h3>
    <table class="d">
      ${colgroup([12, 30, 15, 7, 10, 8, 10, 18, 14])}
      <thead><tr><th>TAG</th><th>Descricao</th><th>Tipo</th><th>Qtd</th><th>P (W)</th>
      <th>V</th><th>In (A)</th><th>Fabricante</th><th>Condicao</th></tr></thead>
      <tbody>${inv.map((r) => `<tr>
        <td>${esc(r.tag)}</td><td class="l">${esc(r.description)}</td><td>${esc(r.assetType)}</td>
        <td>${num(r.quantity, 0)}</td><td>${num(r.powerW, 0)}</td><td>${num(r.tension, 0)}</td>
        <td>${num(r.currentA)}</td><td>${esc(r.manufacturer)}</td><td>${esc(r.condition)}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function photosPage(h, tree) {
  const items = [];
  const walk = (nodes, trail) => {
    (nodes || []).forEach((n) => {
      const path = [...trail, n.label].join(' > ');
      const photos = (n.meta && n.meta.photos) || [];
      photos.forEach((p) => {
        if (!p || !p.uri) return;
        items.push({ path, caption: p.caption || '', uri: p.uri, type: typeInfo(n.type).label });
      });
      walk(n.children, [...trail, n.label]);
    });
  };
  walk(tree, []);
  if (!items.length) return '';
  const cards = items.map((it) => `
    <div class="ph">
      <img src="${esc(it.uri)}"/>
      <div class="cap">${esc(it.caption || '(sem legenda)')}</div>
      <div class="loc">${esc(it.path)}</div>
    </div>`).join('');
  return `
  <div class="page">
    ${pageHeader(h, 'Registro Fotografico')}
    <h3 class="sec">Registro Fotografico</h3>
    <p>Imagens coletadas em campo durante o levantamento, organizadas por ponto de inspecao.</p>
    <div class="gallery">${cards}</div>
  </div>`;
}

function findingsPage(h, val) {
  const order = { error: 0, warn: 1 };
  const list = [...val.findings].sort((a, b) => (order[a.level] - order[b.level]) || a.code.localeCompare(b.code));
  const body = list.length ? list.map((f, i) => `
    <div class="fnd ${f.level === 'warn' ? 'w' : ''}">
      <div class="t">
        <span class="code">${esc(f.code)} &nbsp;|&nbsp; ${f.level === 'error' ? 'NAO CONFORMIDADE' : 'RESSALVA'} ${String(i + 1).padStart(2, '0')}</span>
        <span class="loc">${esc(f.nodeLabel)}<br/>${esc(f.path)}</span>
      </div>
      <div class="msg">${esc(f.message)}</div>
      <div class="act"><b>Acao recomendada:</b> ${esc(f.action)}</div>
      <div class="ref">Referencia: ${esc(f.ref)}</div>
    </div>`).join('')
    : `<p>Nao foram identificados apontamentos tecnicos no escopo verificado.</p>`;

  return `
  <div class="page">
    ${pageHeader(h, 'Apontamentos Tecnicos')}
    <h3 class="sec">10. Apontamentos, Nao Conformidades e Ressalvas</h3>
    <div class="cards">
      <div class="card" style="border-left-color:${T.err}"><div class="v" style="color:${T.err}">${val.summary.errors}</div><div class="k">Nao Conformidades</div></div>
      <div class="card" style="border-left-color:${T.warn}"><div class="v" style="color:${T.warn}">${val.summary.warnings}</div><div class="k">Ressalvas</div></div>
      <div class="card" style="border-left-color:${T.ok}"><div class="v" style="color:${T.ok}">${val.summary.conform}</div><div class="k">Itens Conformes</div></div>
      <div class="card"><div class="v">${num(val.summary.conformityIndex, 1)}%</div><div class="k">Indice de Conformidade</div></div>
    </div>
    ${body}
  </div>`;
}

function conclusionPage(h, val) {
  const color = val.summary.errors > 0 ? T.err : val.summary.warnings > 0 ? T.warn : T.ok;
  return `
  <div class="page">
    ${pageHeader(h, 'Parecer Tecnico e Encerramento')}
    <h3 class="sec">11. Parecer Tecnico Conclusivo</h3>
    <div class="verdict" style="border-color:${color}; color:${color}; background:${color}14">
      ${esc(val.summary.verdict)}
    </div>
    <p>Com base na inspecao realizada em ${fmtDate(h.inspectionDate)} e na verificacao dos parametros de
    dimensionamento e protecao dos ${val.summary.circuits} circuitos terminais distribuidos em
    ${val.summary.panels} quadros eletricos, apurou-se indice de conformidade de
    <b>${num(val.summary.conformityIndex, 1)}%</b>, com <b>${val.summary.errors}</b> nao conformidade(s) e
    <b>${val.summary.warnings}</b> ressalva(s) tecnica(s).</p>
    ${val.summary.errors > 0 ? `<p><b>As nao conformidades classificadas como NC exigem intervencao corretiva</b>, uma vez que
    representam risco de sobreaquecimento de condutores, choque eletrico ou indisponibilidade operacional.
    Recomenda-se o tratamento imediato dos itens relacionados a coordenacao de protecao (NC-01) e a
    ausencia de dispositivo diferencial-residual (NC-04), por seu impacto direto na seguranca das pessoas.</p>` : ''}
    <p>As ressalvas apontadas nao impedem a operacao da instalacao, porem devem ser incorporadas ao plano de
    manutencao com prazo definido, de modo a preservar a conformidade da instalacao ao longo do ciclo de vida
    do ativo.</p>

    <h4 class="sub">11.1 Recomendacoes Gerais</h4>
    <ul class="norm">
      <li>Atualizar os diagramas unifilares e o cadastro tecnico com os dados levantados neste documento.</li>
      <li>Implantar identificacao permanente de todos os circuitos nos quadros (NBR 5410, 6.1.6).</li>
      <li>Executar termografia periodica nos barramentos e conexoes dos quadros de forca.</li>
      <li>Verificar anualmente o funcionamento dos dispositivos diferenciais-residuais pelo botao de teste.</li>
      <li>Manter as medicoes de resistencia de aterramento e de isolamento em periodicidade definida pelo plano de manutencao.</li>
    </ul>

    <h4 class="sub">11.2 Limitacoes e Validade</h4>
    <p>As conclusoes deste laudo referem-se exclusivamente as condicoes observadas na data da inspecao e ao escopo
    delimitado no item 2. Nao foram executados ensaios destrutivos, abertura de paineis energizados alem do
    previsto em procedimento, nem verificacao de circuitos inacessiveis. Alteracoes posteriores na instalacao
    invalidam as conclusoes aqui apresentadas.</p>
    <p><b>Escopo da verificacao automatica:</b> este documento apura coordenacao de protecao (Ib&le;In&le;Iz),
    secao minima, queda de tensao terminal, presenca de DR em areas de tomada/molhadas, secao do condutor de
    protecao, equilibrio de fases, capacidade do barramento, identificacao e grau de protecao. Nao abrange
    calculo de curto-circuito (Icc), seletividade entre estagios de protecao, capacidade de interrupcao dos
    dispositivos, impedancia do loop de falta, aterramento e ensaios laboratoriais &mdash; itens que devem ser
    avaliados por profissional habilitado. O indice de conformidade refere-se exclusivamente aos criterios
    automaticos acima.</p>

    <div class="sigblock">
      <div><strong>${esc(h.technician || '-')}</strong>${esc(h.technicianTitle || '')}<br/>${esc(h.crea || '')}<br/>${esc(artLabel(h.art))}</div>
      <div><strong>Recebido por</strong>${esc(h.requester || '-')}<br/>Data: ____/____/________</div>
    </div>
    <div class="ftnote">Documento gerado por Circuit Mapper &mdash; Mapeamento e Cadastro de Circuitos Eletricos.
    Emitido em ${fmtDate(h.issueDate)}. Este laudo somente tem validade acompanhado da respectiva Anotacao de
    Responsabilidade Tecnica (ART) registrada no CREA.</div>
  </div>`;
}

/* ======================= API ======================= */

/**
 * @param {Array} tree  arvore hierarquica
 * @param {Object} header dados do cabecalho/laudo
 * @param {Object} opts { sections: [...] }
 */
function buildLaudoHtml(tree, header = {}, opts = {}) {
  const val = validateTree(tree);
  const s = opts.sections || ['cover', 'intro', 'tree', 'tables', 'assets', 'photos', 'findings', 'conclusion'];
  const parts = [];
  if (s.includes('cover')) parts.push(coverPage(header));
  if (s.includes('intro')) parts.push(introPage(header, tree, val));
  if (s.includes('tree')) parts.push(treePage(header, tree));
  if (s.includes('tables')) parts.push(loadTablePages(header, tree));
  if (s.includes('assets')) parts.push(assetPage(header, tree));
  if (s.includes('photos')) parts.push(photosPage(header, tree));
  if (s.includes('findings')) parts.push(findingsPage(header, val));
  if (s.includes('conclusion')) parts.push(conclusionPage(header, val));

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(header.reportNumber || 'Laudo')} - ${esc(header.site || '')}</title>
<style>${styles()}</style></head>
<body>${parts.join('\n')}</body></html>`;
}

/**
 * Variante compacta para exportacao em IMAGEM (.png/.jpg).
 * Layout em tabela (nao flex) para renderizar identico em qualquer engine.
 * No dispositivo o caminho primario e o componente nativo SummaryCard +
 * react-native-view-shot; este HTML e o fallback para WebView/impressao.
 */
function buildSummaryHtml(tree, header = {}) {
  const val = validateTree(tree);
  const s = val.summary;
  const accent = s.errors ? T.err : s.warnings ? T.warn : T.ok;

  const cell = (v, k, c) => `<td class="kc" style="border-left-color:${c || T.yellow}">
      <div class="kv" style="color:${c || T.yellow}">${v}</div>
      <div class="kk">${k}</div></td>`;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Resumo - ${esc(header.reportNumber || '')}</title>
<style>
  @page { size: 240mm 150mm; margin: 0; }
  * { box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body { margin:0; width:240mm; background:${T.bg}; color:${T.text};
         font-family:Roboto,"Aptos Narrow",Arial,sans-serif; }
  .top { height:6mm; background:${T.yellow}; }
  .bot { height:6mm; background:${T.yellow}; }
  .body { padding:8mm 10mm; }
  .kicker { font-size:9pt; font-weight:900; letter-spacing:2.4pt; color:${T.yellow}; text-transform:uppercase; }
  h1 { font-size:22pt; font-weight:900; margin:4mm 0 2mm; color:${T.text}; }
  .meta { font-size:10pt; color:${T.muted}; margin-bottom:7mm; }
  table.k { width:100%; border-collapse:separate; border-spacing:3mm 0; margin-bottom:5mm; }
  td.kc { background:${T.surf}; border-radius:2mm; padding:4mm 3mm; border-left:2.4mm solid ${T.yellow};
          width:16.6%; vertical-align:top; }
  .kv { font-size:20pt; font-weight:900; line-height:1; }
  .kk { font-size:7pt; font-weight:700; letter-spacing:.9pt; text-transform:uppercase;
        color:${T.muted}; margin-top:2.4mm; }
  .verdict { border:1.4mm solid ${accent}; color:${accent}; border-radius:2mm; padding:4mm;
             font-size:14pt; font-weight:900; text-align:center; letter-spacing:.6pt; text-transform:uppercase; }
  .foot { font-size:8.5pt; color:${T.muted}; margin-top:6mm; line-height:1.6; }
</style></head><body>
  <div class="top"></div>
  <div class="body">
    <div class="kicker">Laudo Tecnico &middot; Mapeamento de Circuitos Eletricos</div>
    <h1>${esc(header.site || 'Instalacao nao identificada')}</h1>
    <div class="meta">${[header.reportNumber, header.equipmentTag, header.location]
      .filter(Boolean).map(esc).join(' &nbsp;&middot;&nbsp; ')}</div>
    <table class="k"><tr>
      ${cell(countAll(tree), 'Itens')}
      ${cell(depth(tree), 'Niveis')}
      ${cell(s.panels, 'Quadros')}
      ${cell(s.circuits, 'Circuitos')}
      ${cell(num(s.totalKva), 'kVA')}
      ${cell(`${num(s.conformityIndex, 1)}%`, 'Conformidade', accent)}
    </tr></table>
    <table class="k"><tr>
      ${cell(s.errors, 'Nao conformidades', T.err)}
      ${cell(s.warnings, 'Ressalvas', T.warn)}
      ${cell(s.conform, 'Itens conformes', T.ok)}
    </tr></table>
    <div class="verdict">${esc(s.verdict)}</div>
    <div class="foot">
      ${esc(header.technician || '-')} &nbsp;&middot;&nbsp; ${esc(header.technicianTitle || '')}
      &nbsp;&middot;&nbsp; ${esc(header.crea || '')}<br/>
      Emitido em ${fmtDate(header.issueDate)} &nbsp;|&nbsp; Circuit Mapper
    </div>
  </div>
  <div class="bot"></div>
</body></html>`;
}

module.exports = { buildLaudoHtml, buildSummaryHtml, styles, esc, fmtDate };
