/* ==========================================================================
   FLASH REPORT — app web de campo (sem framework, sem CDN, offline)
   Consome o mesmo núcleo de src/flash/flashReport.js do app Expo.
   ========================================================================== */
(function () {
'use strict';

var F = __require('src/flash/flashReport');

var KEY_DRAFT = '@flash/report';
var KEY_HIST = '@flash/history';
var MAX_HIST = 60;

var S = {
  tab: 'editar',
  report: F.sampleReport(),
  history: [],
};

/* ---------------- persistência ---------------- */
function saveDraft() {
  try { localStorage.setItem(KEY_DRAFT, JSON.stringify(S.report)); }
  catch (e) { toast('Armazenamento cheio: reduza o tamanho dos logos.', true); }
}
function loadDraft() {
  try {
    var raw = localStorage.getItem(KEY_DRAFT);
    if (!raw) return false;
    var d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return false;
    S.report = Object.assign(F.defaultReport(), d);
    return true;
  } catch (e) { return false; }
}
function loadHist() {
  try {
    var raw = localStorage.getItem(KEY_HIST);
    S.history = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(S.history)) S.history = [];
  } catch (e) { S.history = []; }
}
function persistHist() {
  try { localStorage.setItem(KEY_HIST, JSON.stringify(S.history.slice(0, MAX_HIST))); }
  catch (e) { toast('Histórico cheio: apague itens antigos.', true); }
}

/* ---------------- helpers DOM ---------------- */
function el(tag, cls, txt) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined && txt !== null) n.textContent = String(txt);
  return n;
}
function esc(s) {
  var d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}
function $(id) { return document.getElementById(id); }
function on(node, ev, fn) { node.addEventListener(ev, fn); return node; }
function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

var toastTimer = null;
function toast(msg, isErr) {
  var t = $('toast');
  t.textContent = msg;
  t.className = isErr ? 'err' : '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.className = 'hidden'; }, isErr ? 5000 : 2600);
}

function button(label, cls, icon, fn) {
  var b = el('button', 'btn ' + (cls || ''));
  if (icon) b.appendChild(el('span', 'ic', icon));
  b.appendChild(el('span', null, label));
  if (fn) on(b, 'click', fn);
  return b;
}
function field(label, value, onInput, opts) {
  opts = opts || {};
  var w = el('div', 'fld');
  var lb = el('div', 'lb');
  lb.appendChild(el('b', null, label));
  if (opts.unit) lb.appendChild(el('i', null, opts.unit));
  w.appendChild(lb);
  var inp;
  if (opts.kind === 'datetime') {
    inp = el('input'); inp.type = 'datetime-local'; inp.value = value || '';
  } else if (opts.multiline) {
    inp = el('textarea'); inp.value = value == null ? '' : String(value);
    inp.rows = opts.rows || 3;
  } else {
    inp = el('input'); inp.type = 'text'; inp.value = value == null ? '' : String(value);
  }
  if (opts.placeholder) inp.placeholder = opts.placeholder;
  on(inp, 'input', function () { onInput(inp.value); });
  w.appendChild(inp);
  if (opts.hint) w.appendChild(el('div', 'hint', opts.hint));
  return w;
}
function section(txt) { return el('div', 'h3', txt); }

function set(path, value) {
  S.report[path] = value;
  S.report.updatedAt = new Date().toISOString();
  saveDraft();
  syncDot();
}

/* ---------------- chips de locais ---------------- */
function placeChips(host) {
  clear(host);
  var wrap = el('div', 'chips');
  var all = [];
  F.PRESET_PLACES.forEach(function (p) { if (all.indexOf(p) < 0) all.push(p); });
  (S.report.places || []).forEach(function (p) { if (all.indexOf(p) < 0) all.push(p); });
  all.forEach(function (p) {
    var isOn = (S.report.places || []).indexOf(p) >= 0;
    var c = el('button', 'chip' + (isOn ? ' on' : ''), (isOn ? '✓ ' : '') + p);
    on(c, 'click', function () {
      var list = S.report.places || [];
      var i = list.indexOf(p);
      if (i >= 0) list.splice(i, 1);
      else list.push(p);
      set('places', list);
      placeChips(host);
    });
    wrap.appendChild(c);
  });
  host.appendChild(wrap);
  var row = el('div', 'upd-row');
  var extra = '';
  var f = field('Outro local', '', function (v) { extra = v; }, { placeholder: 'Ex.: Mina N4WS' });
  f.style.marginBottom = '0';
  row.appendChild(f);
  var add = el('button', 'btn dark sm', '+');
  add.style.flex = '0 0 56px';
  add.style.marginTop = '25px';
  on(add, 'click', function () {
    var v = String(extra || '').trim();
    if (!v) { toast('Digite o nome do local.', true); return; }
    var list = S.report.places || [];
    if (list.indexOf(v) < 0) list.push(v);
    extra = '';
    set('places', list);
    placeChips(host);
  });
  row.appendChild(add);
  host.appendChild(row);
}

/* ---------------- grade de status ---------------- */
function statusGrid(host) {
  clear(host);
  var g = el('div', 'status-grid');
  F.STATUSES.forEach(function (st) {
    var b = el('button', 'status-opt' + (S.report.status === st.id ? ' on' : ''));
    b.appendChild(el('span', 'dot', st.dot));
    b.appendChild(el('span', null, st.label));
    on(b, 'click', function () { set('status', st.id); statusGrid(host); });
    g.appendChild(b);
  });
  host.appendChild(g);
}

/* ---------------- categorias ---------------- */
function categoryChips(host) {
  clear(host);
  var wrap = el('div', 'chips');
  F.CATEGORIES.forEach(function (c) {
    var b = el('button', 'chip' + (S.report.category === c ? ' on' : ''), c);
    on(b, 'click', function () { set('category', c); categoryChips(host); });
    wrap.appendChild(b);
  });
  host.appendChild(wrap);
}

/* ---------------- logos ---------------- */
function logoBox(kind) {
  var isContractor = kind === 'contractor';
  var key = isContractor ? 'contractorLogo' : 'clientLogo';
  var nameKey = isContractor ? 'contractorName' : 'clientName';
  var title = isContractor ? 'Contratada' : 'Contratante';

  var box = el('div', 'logo-box' + (S.report[key] ? ' has' : ''));
  box.appendChild(el('div', 'cap', title));
  if (S.report[key]) {
    var img = el('img'); img.src = S.report[key]; img.alt = title;
    box.appendChild(img);
  } else {
    box.appendChild(el('div', 'empty', 'TOQUE PARA\nSELECIONAR O LOGO'));
  }
  var inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; inp.style.display = 'none';
  on(inp, 'change', function () {
    var f = inp.files && inp.files[0];
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      // Reduz para caber no localStorage e no cartão.
      shrinkImage(rd.result, function (small) {
        S.report[key] = small;
        S.report.updatedAt = new Date().toISOString();
        saveDraft(); render();
        toast('Logo da ' + title.toLowerCase() + ' carregado.');
      });
    };
    rd.onerror = function () { toast('Falha ao ler a imagem.', true); };
    rd.readAsDataURL(f);
  });
  on(box, 'click', function () { inp.click(); });

  var wrap = el('div');
  wrap.appendChild(box);
  wrap.appendChild(inp);
  var nm = document.createElement('input');
  nm.type = 'text'; nm.className = 'logo-name'; nm.style.marginTop = '8px';
  nm.placeholder = isContractor ? 'Nome da contratada (ex.: Xerox)' : 'Nome da contratante (ex.: Vale)';
  nm.value = S.report[nameKey] || '';
  on(nm, 'input', function () { set(nameKey, nm.value); });
  on(nm, 'click', function (e) { e.stopPropagation(); });
  wrap.appendChild(nm);
  if (S.report[key]) {
    var rm = el('button', null, 'REMOVER LOGO');
    rm.style.cssText = 'font:700 10px Roboto;letter-spacing:.9px;color:#F87171;margin-top:6px';
    on(rm, 'click', function (e) {
      e.stopPropagation();
      S.report[key] = null;
      saveDraft(); render();
    });
    wrap.appendChild(rm);
  }
  return wrap;
}

function shrinkImage(dataUri, cb) {
  var img = new Image();
  img.onload = function () {
    var max = 480;
    var w = img.width, h = img.height;
    if (w > max || h > max) {
      if (w >= h) { h = Math.round((h * max) / w); w = max; }
      else { w = Math.round((w * max) / h); h = max; }
    }
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    cb(c.toDataURL('image/png'));
  };
  img.onerror = function () { cb(dataUri); };
  img.src = dataUri;
}

/* ---------------- atualizações ---------------- */
function updatesEditor(host) {
  clear(host);
  (S.report.updates || []).forEach(function (u, idx) {
    var item = el('div', 'upd-item');
    var x = el('button', 'x', '×');
    on(x, 'click', function () {
      S.report.updates.splice(idx, 1);
      set('updates', S.report.updates);
      updatesEditor(host);
    });
    item.appendChild(x);
    item.appendChild(el('div', 'w', F.formatDateTime(u.at)));
    item.appendChild(el('div', null, u.text));
    host.appendChild(item);
  });
  var row = el('div', 'upd-row');
  var txt = '';
  var f = field('Nova atualização', '', function (v) { txt = v; },
    { multiline: true, rows: 2, placeholder: 'Ex.: Link backup ativado em Serra Norte.' });
  f.style.marginBottom = '0';
  row.appendChild(f);
  var add = el('button', 'btn dark sm', '+');
  add.style.flex = '0 0 56px';
  add.style.marginTop = '25px';
  on(add, 'click', function () {
    var v = String(txt || '').trim();
    if (!v) { toast('Digite a atualização.', true); return; }
    S.report.updates = (S.report.updates || []).concat([{ at: new Date().toISOString(), text: v }]);
    set('updates', S.report.updates);
    updatesEditor(host);
    toast('Atualização registrada.');
  });
  row.appendChild(add);
  host.appendChild(row);
}

/* =========================================================================
   TELA: EDITAR
   ========================================================================= */
function screenEditar() {
  var root = el('div', 'wrap');
  var r = S.report;

  var pend = F.validate(r);
  if (pend.length) {
    var w = el('div', 'warn-card');
    w.appendChild(el('b', null, 'Faltam ' + pend.length + ' item(ns) para publicar:'));
    var ul = el('ul'); ul.style.margin = '6px 0 0'; ul.style.padding = '0';
    pend.forEach(function (p) { ul.appendChild(el('li', null, p)); });
    w.appendChild(ul);
    root.appendChild(w);
  }

  root.appendChild(section('Cabeçalho do informativo'));
  root.appendChild(field('Setor emissor', r.sector, function (v) { set('sector', v); },
    { placeholder: 'GER TECN ATEND PA' }));

  root.appendChild(section('Falha'));
  root.appendChild(field('Título da falha', r.title, function (v) { set('title', v); },
    { placeholder: 'FALHA NO SERVIDOR DE IMPRESSÃO' }));
  root.appendChild(field('Serviço afetado (subtítulo)', r.subtitle, function (v) { set('subtitle', v); },
    { multiline: true, rows: 2, placeholder: 'Indisponibilidade do serviço de impressão e digitalização em rede.' }));
  root.appendChild(el('div', 'hint', 'Categoria'));
  var catHost = el('div'); root.appendChild(catHost); categoryChips(catHost);
  root.appendChild(el('div', 'hint', 'Status do atendimento'));
  var stHost = el('div'); root.appendChild(stHost); statusGrid(stHost);

  root.appendChild(section('Locais afetados'));
  var plHost = el('div'); root.appendChild(plHost); placeChips(plHost);

  root.appendChild(section('Linha do tempo'));
  var rt = el('div', 'row');
  var f1 = field('Início', r.startAt, function (v) { set('startAt', v); }, { kind: 'datetime' });
  var f2 = field('Previsão de retorno', r.forecastAt, function (v) { set('forecastAt', v); }, { kind: 'datetime' });
  rt.appendChild(f1); rt.appendChild(f2);
  root.appendChild(rt);
  var dur = F.durationBetween(r.startAt, r.forecastAt || undefined);
  if (dur) {
    var k = el('div', 'kpis');
    var kpi = el('div', 'kpi');
    kpi.appendChild(el('div', 'v', '⏳ ' + dur));
    kpi.appendChild(el('div', 'k', 'Duração estimada'));
    k.appendChild(kpi);
    root.appendChild(k);
  }

  root.appendChild(section('Detalhamento'));
  root.appendChild(field('Motivo / causa', r.reason, function (v) { set('reason', v); },
    { multiline: true, rows: 2, placeholder: 'Falha no servidor de impressão da Vale.' }));
  root.appendChild(field('Situação atual', r.situation, function (v) { set('situation', v); },
    { multiline: true, rows: 2, placeholder: 'Em andamento. Time da Xerox já está atuando...' }));
  root.appendChild(field('Próximos passos', r.nextSteps, function (v) { set('nextSteps', v); },
    { multiline: true, rows: 2, placeholder: 'Reinicialização do serviço e validação por site.' }));
  root.appendChild(field('Impacto', r.impact, function (v) { set('impact', v); },
    { multiline: true, rows: 2, placeholder: 'Quem está sem o serviço e desde quando.' }));

  root.appendChild(section('Atendimento'));
  var ra = el('div', 'row');
  ra.appendChild(field('Chamado / protocolo', r.ticket, function (v) { set('ticket', v); },
    { placeholder: 'INC-2026-0917' }));
  ra.appendChild(field('Contato', r.contact, function (v) { set('contact', v); },
    { placeholder: 'Ramal / Teams da planta' }));
  root.appendChild(ra);
  root.appendChild(field('Time da contratante', r.ownerTeam, function (v) { set('ownerTeam', v); },
    { placeholder: 'GER TECN ATEND PA — Vale' }));
  root.appendChild(field('Time da contratada', r.vendorTeam, function (v) { set('vendorTeam', v); },
    { placeholder: 'Xerox — Suporte de campo' }));
  root.appendChild(field('Responsável pelo informe', r.author, function (v) { set('author', v); },
    { placeholder: 'Técnico de plantão' }));

  root.appendChild(section('Atualizações da ocorrência'));
  var upHost = el('div'); root.appendChild(upHost); updatesEditor(upHost);

  root.appendChild(section('Logos — contratada e contratante'));
  root.appendChild(el('p', 'hint', 'Os logos aparecem no topo do cartão e ficam salvos no aparelho (offline).'));
  var lg = el('div', 'logo-grid');
  lg.appendChild(logoBox('contractor'));
  lg.appendChild(logoBox('client'));
  root.appendChild(lg);

  root.appendChild(section('Ações'));
  root.appendChild(button('Ver prévia do informativo', 'lg', 'PRV', function () { go('previa'); }));
  var row = el('div', 'row'); row.style.marginTop = '10px';
  row.appendChild(button('Exemplo', 'dark sm', 'DEMO', function () {
    S.report = F.sampleReport(); saveDraft(); render();
    toast('Exemplo carregado: falha no servidor de impressão.');
  }));
  row.appendChild(button('Limpar', 'dark sm', 'DEL', function () {
    if (confirm('Apagar o rascunho atual?')) {
      S.report = F.defaultReport(); saveDraft(); render();
    }
  }));
  root.appendChild(row);
  return root;
}

/* =========================================================================
   CARTÃO + MENSAGEM (usados na prévia e na impressão)
   ========================================================================= */
function logoImgOrFallback(src, name, fallbackShort) {
  if (src) return '<img src="' + src + '" alt="' + esc(name || '') + '"/>';
  return '<span class="fallback">' + esc(name || fallbackShort) + '</span>';
}

function cardHtml(r) {
  var meta;
  try { meta = F.statusMeta(r.status); }
  catch (e) { meta = F.STATUSES[0]; }
  var ups = (r.updates || []).map(function (u) {
    return '<li>' + (u.at ? '<b>' + esc(F.formatDateTime(u.at)) + '</b> — ' : '') + esc(u.text) + '</li>';
  }).join('');
  return '' +
    '<div class="card" id="flashCard">' +
      '<div class="card-top">' +
        '<div class="logos">' +
          logoImgOrFallback(r.contractorLogo, r.contractorName, 'CONTRATADA') +
          logoImgOrFallback(r.clientLogo, r.clientName, 'CONTRATANTE') +
        '</div>' +
        '<div class="ht"><b>📢 FLASH REPORT</b><span>INFORMATIVO - ' + esc((r.sector || F.DEFAULT_SECTOR).toUpperCase()) + '</span></div>' +
        '<div class="card-status">' + meta.dot + '</div>' +
      '</div>' +
      '<div class="card-body">' +
        '<h1>' + esc((r.title || 'Falha em ambiente de TI/LTE').toUpperCase()) + '</h1>' +
        (r.subtitle ? '<p class="sub">' + esc(r.subtitle) + '</p>' : '') +
        '<div class="meta-rows">' +
          '<div class="mr">📍 <b>Locais Afetados:</b> ' + esc(F.joinPlaces(r.places)) + '</div>' +
          '<div class="mr">📂 <b>Categoria:</b> ' + esc(r.category) +
            (r.ticket ? ' &nbsp;·&nbsp; 🔖 <b>Chamado:</b> ' + esc(r.ticket) : '') + '</div>' +
          ((r.startAt || r.forecastAt) ? '<div class="mr">🕐 ' +
            (r.startAt ? '<b>Início:</b> ' + esc(F.formatDateTime(r.startAt)) : '') +
            (r.forecastAt ? ' &nbsp;|&nbsp; ⏳ <b>Previsão:</b> ' + esc(F.formatDateTime(r.forecastAt)) : '') +
            (F.durationBetween(r.startAt, r.forecastAt || undefined) ? ' &nbsp;|&nbsp; ⌛ <b>Duração:</b> ' + esc(F.durationBetween(r.startAt, r.forecastAt || undefined)) : '') +
            '</div>' : '') +
          (r.impact ? '<div class="mr">💥 <b>Impacto:</b> ' + esc(r.impact) + '</div>' : '') +
        '</div>' +
        (r.reason ? '<p class="free"><b>Motivo:</b> ' + esc(r.reason) + '</p>' : '') +
        (r.situation ? '<p class="free"><b>Situação Atual:</b> ' + esc(r.situation) + '</p>' : '') +
        (r.nextSteps ? '<p class="free">➡️ <b>Próximos passos:</b> ' + esc(r.nextSteps) + '</p>' : '') +
        ((r.vendorTeam || r.ownerTeam) ? '<p class="free">👥 ' + esc([r.vendorTeam, r.ownerTeam].filter(Boolean).join('  ·  ')) + '</p>' : '') +
        (r.contact ? '<p class="free">☎️ <b>Contato:</b> ' + esc(r.contact) + '</p>' : '') +
        (ups ? '<div class="updates"><b>🧾 Atualizações</b><ul style="margin:0;padding:0;list-style:none">' + ups + '</ul></div>' : '') +
      '</div>' +
      '<div class="card-foot">' +
        '<span class="st">' + meta.dot + ' ' + esc(meta.label) + '</span>' +
        '<span class="au">' + esc(r.author || '') + (r.author ? '<br/>' : '') + 'Atualizado em ' + esc(F.formatDateTime(new Date())) + '</span>' +
      '</div>' +
    '</div>';
}

/* =========================================================================
   TELA: PRÉVIA
   ========================================================================= */
function screenPrevia() {
  var root = el('div', 'wrap');
  var r = S.report;
  var pend = F.validate(r);
  if (pend.length) {
    var w = el('div', 'warn-card no-print');
    w.appendChild(el('b', null, 'Revise antes de publicar:'));
    var ul = el('ul'); ul.style.margin = '6px 0 0'; ul.style.padding = '0';
    pend.forEach(function (p) { ul.appendChild(el('li', null, p)); });
    w.appendChild(ul);
    root.appendChild(w);
  }

  var host = el('div');
  host.innerHTML = cardHtml(r);
  root.appendChild(host);

  var np = el('div', 'no-print');
  np.appendChild(section('Texto para WhatsApp / Teams'));
  var msg = F.buildMessage(r);
  var box = el('div', 'msg-box', msg);
  np.appendChild(box);

  np.appendChild(button('Copiar texto', 'lg mt', 'COPY', function () {
    copyText(msg, function (ok) {
      toast(ok ? 'Texto copiado. Cole no WhatsApp/Teams.' : 'Cópia bloqueada: selecione o texto manualmente.', !ok);
    });
  }));
  var row = el('div', 'row'); row.style.marginTop = '10px';
  row.appendChild(button('Compartilhar', 'dark sm', 'SHR', function () {
    if (navigator.share) {
      navigator.share({ title: 'Flash Report', text: msg }).catch(function () {});
    } else {
      copyText(msg, function (ok) {
        toast(ok ? 'Texto copiado para compartilhar.' : 'Compartilhamento indisponível.', !ok);
      });
    }
  }));
  row.appendChild(button('Imprimir / PDF', 'dark sm', 'PDF', function () { window.print(); }));
  np.appendChild(row);

  var row2 = el('div', 'row'); row2.style.marginTop = '10px';
  row2.appendChild(button('Baixar .txt', 'dark sm', 'TXT', function () {
    var blob = new Blob([msg], { type: 'text/plain;charset=utf-8' });
    download(blob, F.fileName(r, 'txt'));
    toast('Arquivo baixado.');
  }));
  row2.appendChild(button('Salvar no histórico', 'ok sm', 'SAV', function () { saveToHistory(); }));
  np.appendChild(row2);
  np.appendChild(button('Voltar e editar', 'ghost mt', 'EDT', function () { go('editar'); }));
  root.appendChild(np);
  return root;
}

function copyText(text, cb) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () { cb(true); }, function () { cb(false); });
  } else {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    cb(ok);
  }
}

function download(blob, name) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
}

function saveToHistory() {
  var snap = JSON.parse(JSON.stringify(S.report));
  snap.savedAt = new Date().toISOString();
  S.history.unshift(snap);
  S.history = S.history.slice(0, MAX_HIST);
  persistHist();
  render();
  toast('Informativo salvo no histórico.');
  go('historico');
}

/* =========================================================================
   TELA: HISTÓRICO
   ========================================================================= */
function screenHistorico() {
  var root = el('div', 'wrap');
  if (!S.history.length) {
    var e = el('div', 'empty');
    e.appendChild(el('b', null, 'NENHUM INFORMATIVO SALVO'));
    e.appendChild(el('span', null, 'Monte o flash report na aba Editar, confira na Prévia e toque em "Salvar no histórico".'));
    root.appendChild(e);
    root.appendChild(button('Criar agora', 'lg mt', '+', function () { go('editar'); }));
    return root;
  }
  S.history.forEach(function (h, idx) {
    var meta;
    try { meta = F.statusMeta(h.status); } catch (err) { meta = F.STATUSES[0]; }
    var c = el('div', 'hist');
    c.style.borderLeftColor = h.status === 'normalizado' ? '#34D399'
      : h.status === 'critico' ? '#F87171' : '#22D3EE';
    c.appendChild(el('div', 't', (h.title || 'Sem título').toUpperCase()));
    c.appendChild(el('div', 's',
      meta.dot + ' ' + meta.label + '  ·  ' + F.joinPlaces(h.places) +
      '  ·  Salvo em ' + F.formatDateTime(h.savedAt || h.updatedAt)));
    var acts = el('div', 'acts');
    acts.appendChild(button('Abrir', 'sm', null, function () {
      S.report = Object.assign(F.defaultReport(), JSON.parse(JSON.stringify(h)));
      S.report.id = F.buildId();
      saveDraft(); go('previa');
    }));
    acts.appendChild(button('Duplicar', 'dark sm', null, function () {
      var copy = JSON.parse(JSON.stringify(h));
      copy.id = F.buildId();
      copy.title = (copy.title || '') + ' (cópia)';
      copy.savedAt = new Date().toISOString();
      S.history.unshift(copy);
      persistHist(); render();
      toast('Cópia criada.');
    }));
    acts.appendChild(button('Apagar', 'danger sm', null, function () {
      if (confirm('Apagar "' + (h.title || 'sem título') + '" do histórico?')) {
        S.history.splice(idx, 1);
        persistHist(); render();
      }
    }));
    c.appendChild(acts);
    root.appendChild(c);
  });
  root.appendChild(button('Apagar histórico inteiro', 'ghost mt', 'DEL', function () {
    if (confirm('Apagar todos os ' + S.history.length + ' informativos salvos?')) {
      S.history = [];
      persistHist(); render();
    }
  }));
  return root;
}

/* =========================================================================
   SHELL
   ========================================================================= */
function go(tab) { S.tab = tab; render(); }

function syncDot() {
  var d = $('statusDot');
  if (!d) return;
  try { d.textContent = F.statusMeta(S.report.status).dot; }
  catch (e) { d.textContent = '🟡'; }
}

function render() {
  var host = $('screen');
  clear(host);
  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
    b.className = 'tab' + (b.getAttribute('data-tab') === S.tab ? ' on' : '');
  });
  host.appendChild(
    S.tab === 'editar' ? screenEditar()
    : S.tab === 'previa' ? screenPrevia()
    : screenHistorico()
  );
  syncDot();
}

function boot() {
  if (!loadDraft()) { S.report = F.sampleReport(); saveDraft(); }
  loadHist();
  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
    on(b, 'click', function () { go(b.getAttribute('data-tab')); });
  });
  render();
  setTimeout(function () { $('splash').className = 'hidden'; }, 450);
}

window.__FLASH = {
  state: S,
  render: render,
  go: go,
  saveToHistory: saveToHistory,
  modules: { F: F },
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
