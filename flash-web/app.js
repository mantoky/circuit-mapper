/* ==========================================================================
   FLASH REPORT — app standalone TI / LTE
   Consome src/core/flashReport.js (mesmo motor do nucleo).
   ========================================================================== */
(function () {
'use strict';

var FR = __require('src/core/flashReport');

var KEY = '@flash-report/v1';
var COLORS = {
  ok: '#34D399', warn: '#FBBF24', err: '#F87171', pri: '#22D3EE',
  dim: '#6B829E', info: '#60A5FA',
};

var S = { report: null };

function $(id){ return document.getElementById(id); }
function el(tag, cls, txt){
  var n = document.createElement(tag);
  if(cls) n.className = cls;
  if(txt !== undefined && txt !== null) n.textContent = String(txt);
  return n;
}
function clear(node){ while(node.firstChild) node.removeChild(node.firstChild); return node; }
function on(node, ev, fn){ node.addEventListener(ev, fn); return node; }

var toastTimer = null;
function toast(msg, isErr){
  var t = $('toast');
  t.textContent = msg;
  t.className = isErr ? 'err' : '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.className = 'hidden'; }, isErr ? 5000 : 2600);
}

function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(S.report)); }
  catch(e){ toast('Falha ao salvar: '+e.message, true); }
}
function load(){
  try{
    var raw = localStorage.getItem(KEY);
    if(!raw) return false;
    S.report = Object.assign(FR.emptyFlashReport(), JSON.parse(raw));
    return true;
  }catch(e){ return false; }
}

function button(label, cls, icon, fn){
  var b = el('button', 'btn '+(cls||''));
  if(icon){ var i = el('span','ic',icon); b.appendChild(i); }
  b.appendChild(el('span', null, label));
  if(fn) on(b,'click',fn);
  return b;
}
function field(label, value, onInput, opts){
  opts = opts||{};
  var w = el('div','fld');
  var lb = el('div','lb'); lb.appendChild(el('b',null,label));
  w.appendChild(lb);
  var inp = el(opts.multiline ? 'textarea' : 'input');
  inp.value = value==null?'':String(value);
  if(opts.placeholder) inp.placeholder = opts.placeholder;
  if(opts.kind==='number') inp.setAttribute('inputmode','decimal');
  on(inp,'input',function(){ onInput(inp.value); });
  w.appendChild(inp);
  return w;
}
function select(label, value, options, onPick){
  var w = el('div','fld');
  var lb = el('div','lb'); lb.appendChild(el('b',null,label));
  w.appendChild(lb);
  var row = el('div','chips');
  options.forEach(function(opt){
    var active = String(value)===String(opt);
    var c = el('button','chip'+(active?' on':''), String(opt));
    on(c,'click',function(){ if(!active) onPick(opt); });
    row.appendChild(c);
  });
  w.appendChild(row);
  return w;
}
function section(txt){ return el('div','h3',txt); }

function accent(status){
  if(status==='normalizado') return COLORS.ok;
  if(status==='encerrado') return COLORS.dim;
  if(status==='identificado') return COLORS.info;
  if(status==='em_analise') return '#A78BFA';
  if(status==='monitorando') return COLORS.warn;
  return COLORS.warn;
}

function logoPicker(label, key){
  var r = S.report;
  var w = el('div','logo');
  w.appendChild(el('div','h3',label)).style.cssText=
    'font:700 13px Roboto;letter-spacing:1.1px;color:#22D3EE;text-transform:uppercase;border:0;padding:0;margin:0 0 6px';
  var box = el('button','box');
  function draw(){
    clear(box);
    if(r[key]){ var img = el('img'); img.src = r[key]; box.appendChild(img); }
    else box.appendChild(el('span',null,'TOQUE PARA\nSELECIONAR IMAGEM'));
  }
  draw();
  var inp = el('input'); inp.type='file'; inp.accept='image/*'; inp.style.display='none';
  on(inp,'change',function(){
    var f = inp.files && inp.files[0]; if(!f) return;
    var rd = new FileReader();
    rd.onload = function(){ r[key]=rd.result; save(); draw(); toast('Logo carregado.'); };
    rd.onerror = function(){ toast('Falha ao ler a imagem.', true); };
    rd.readAsDataURL(f);
  });
  on(box,'click',function(){ inp.click(); });
  w.appendChild(box); w.appendChild(inp);
  if(r[key]){
    var rm = el('button',null,'REMOVER');
    rm.style.cssText='font:700 10px Roboto;letter-spacing:.9px;color:#F87171;margin-top:5px';
    on(rm,'click',function(){ r[key]=null; save(); render(); });
    w.appendChild(rm);
  }
  return w;
}

function buildCard(r){
  var kind = FR.kindInfo(r.kind);
  var st = FR.statusInfo(r.status);
  var sev = FR.severityInfo(r.severity);
  var env = FR.environmentInfo(r.environment);
  var a = accent(r.status);
  var card = el('div','fr-card');
  var stripe = el('div','fr-stripe'); stripe.style.background = a; card.appendChild(stripe);

  var logos = el('div','fr-logos');
  function slot(uri, caption, side){
    var s = el('div','fr-logo-slot '+side);
    if(uri){ var img = el('img','fr-logo'); img.src = uri; s.appendChild(img); }
    else s.appendChild(el('div','fr-logo-ph','LOGO'));
    s.appendChild(el('div','fr-logo-cap', caption || (side==='left'?'Contratada':'Contratante')));
    return s;
  }
  logos.appendChild(slot(r.contractorLogo, r.contractor, 'left'));
  var mid = el('div','fr-logo-mid');
  mid.appendChild(el('div','fr-kicker', kind.emoji+' FLASH REPORT'));
  mid.appendChild(el('div','fr-kind', kind.id+' · '+env.label));
  logos.appendChild(mid);
  logos.appendChild(slot(r.clientLogo, r.client, 'right'));
  card.appendChild(logos);

  card.appendChild(el('div','fr-area', r.area || 'OPERACAO'));
  if(Number(r.updateNumber) > 1) card.appendChild(el('div','fr-upd','ATUALIZACAO #'+r.updateNumber));
  card.appendChild(el('div','fr-title', String(r.title||'SEM TITULO').toUpperCase()));
  if(r.description) card.appendChild(el('div','fr-desc', r.description));

  var badges = el('div','fr-badges');
  function badge(txt, color){
    var b = el('span','fr-badge', txt);
    b.style.borderColor = color; b.style.color = color; b.style.background = color+'22';
    badges.appendChild(b);
  }
  badge(st.emoji+' '+st.label, a);
  badge(sev.emoji+' '+sev.label, COLORS.warn);
  if(r.ticket) badge(r.ticket, COLORS.info);
  card.appendChild(badges);

  function row(label, value, hi){
    if(!value) return;
    var rw = el('div','fr-row'+(hi?' hi':''));
    rw.appendChild(el('div','fr-row-lb', label));
    rw.appendChild(el('div','fr-row-v', value));
    card.appendChild(rw);
  }
  row('Locais afetados', FR.joinList(r.locations));
  row('Servicos impactados', FR.joinList(r.services));
  row('Impacto', r.impact);
  row('Motivo', r.reason);
  row('Situacao atual', r.situation, true);
  row('Contorno', r.workaround);

  var tl = el('div','fr-timeline');
  function tcell(k,v){
    if(!v) return;
    var c = el('div','fr-tcell');
    c.appendChild(el('div','fr-tk', k));
    c.appendChild(el('div','fr-tv', v));
    tl.appendChild(c);
  }
  tcell('Inicio', r.startedAt);
  tcell('Atualizado', r.updatedAt);
  tcell('Previsao', r.eta);
  if(tl.childNodes.length) card.appendChild(tl);

  var parties = el('div','fr-parties');
  if(r.client) parties.appendChild(el('div',null,'Contratante: '+r.client));
  if(r.contractor) parties.appendChild(el('div',null,'Contratada: '+r.contractor));
  var teams = FR.joinList(r.teams);
  if(teams) parties.appendChild(el('div',null,'Times: '+teams));
  if(r.responsible) parties.appendChild(el('div',null,'Responsavel: '+r.responsible));
  if(r.contact) parties.appendChild(el('div',null,'Contato: '+r.contact));
  if(parties.childNodes.length) card.appendChild(parties);
  if(r.notes) card.appendChild(el('div','fr-notes','Obs.: '+r.notes));

  var stripe2 = el('div','fr-stripe'); stripe2.style.background = a; card.appendChild(stripe2);
  return card;
}

function downloadPng(r){
  var canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1400;
  var ctx = canvas.getContext('2d');
  var a = accent(r.status);
  var kind = FR.kindInfo(r.kind);
  var st = FR.statusInfo(r.status);
  var sev = FR.severityInfo(r.severity);
  var env = FR.environmentInfo(r.environment);

  function fill(c,x,y,w,h){ ctx.fillStyle=c; ctx.fillRect(x,y,w,h); }
  function text(str,x,y,size,color,align,bold){
    ctx.fillStyle = color||'#E6EDF3';
    ctx.font = (bold?'700 ':'500 ')+size+'px Roboto, Arial, sans-serif';
    ctx.textAlign = align||'left';
    ctx.fillText(String(str||''), x, y);
  }

  fill('#0E1A2B',0,0,1080,1400);
  fill(a,36,36,1008,12);
  text(kind.emoji+' FLASH REPORT', 540, 110, 28, '#22D3EE', 'center', true);
  text(kind.id+' · '+env.label, 540, 150, 22, '#9FB3C8', 'center', true);
  text(r.area||'OPERACAO', 540, 185, 18, '#6B829E', 'center', true);
  text(String(r.title||'SEM TITULO').toUpperCase(), 540, 250, 36, '#E6EDF3', 'center', true);

  var y = 300;
  function wrapText(str, maxW, size, color){
    if(!str) return;
    ctx.font = '500 '+size+'px Roboto, Arial, sans-serif';
    var words = String(str).split(/\s+/), line='', lines=[];
    words.forEach(function(w){
      var test = line ? line+' '+w : w;
      if(ctx.measureText(test).width > maxW){ lines.push(line); line=w; }
      else line = test;
    });
    if(line) lines.push(line);
    lines.forEach(function(ln){ text(ln, 540, y, size, color, 'center'); y += size+8; });
    y += 8;
  }
  wrapText(r.description, 920, 22, '#9FB3C8');
  y += 10;
  text(st.emoji+' '+st.label+'   ·   '+sev.emoji+' '+sev.label+(r.ticket?'   ·   '+r.ticket:''),
    540, y, 22, a, 'center', true);
  y += 40;

  function block(label, value){
    if(!value) return;
    fill('#16263D', 48, y, 984, 10); y += 28;
    text(label.toUpperCase(), 70, y, 16, '#22D3EE', 'left', true); y += 28;
    ctx.font = '500 20px Roboto, Arial, sans-serif';
    var words = String(value).split(/\s+/), line='';
    words.forEach(function(w){
      var test = line ? line+' '+w : w;
      if(ctx.measureText(test).width > 900){
        text(line, 70, y, 20, '#9FB3C8', 'left'); y += 28; line = w;
      } else line = test;
    });
    if(line){ text(line, 70, y, 20, '#9FB3C8', 'left'); y += 28; }
    y += 12;
  }
  block('Locais afetados', FR.joinList(r.locations));
  block('Servicos impactados', FR.joinList(r.services));
  block('Motivo', r.reason);
  block('Situacao atual', r.situation);
  block('Contorno', r.workaround);

  y += 10;
  var parties = [];
  if(r.client) parties.push('Contratante: '+r.client);
  if(r.contractor) parties.push('Contratada: '+r.contractor);
  if(r.responsible) parties.push('Responsavel: '+r.responsible);
  parties.forEach(function(p){ text(p, 70, y, 18, '#6B829E', 'left'); y += 26; });
  fill(a, 36, 1370, 1008, 12);

  var pending = 0;
  function done(){
    pending--;
    if(pending>0) return;
    canvas.toBlob(function(blob){
      if(!blob){ toast('Falha ao gerar PNG.', true); return; }
      var link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'flash-report-'+(r.ticket||r.id||'fr')+'.png';
      link.click();
      setTimeout(function(){ URL.revokeObjectURL(link.href); }, 1500);
      toast('Card PNG baixado.');
    }, 'image/png');
  }
  function drawLogo(uri, x){
    if(!uri) return;
    pending++;
    var img = new Image();
    img.onload = function(){
      var h = 64, w = Math.min(200, img.width*(h/img.height));
      ctx.drawImage(img, x, 70, w, h);
      done();
    };
    img.onerror = function(){ done(); };
    img.src = uri;
  }
  pending = 1;
  drawLogo(r.contractorLogo, 48);
  drawLogo(r.clientLogo, 830);
  done();
}

function copyText(msg){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(msg).then(function(){ toast('Texto copiado.'); })
      .catch(function(){ toast('Nao foi possivel copiar.', true); });
    return;
  }
  var ta = el('textarea'); ta.value = msg; document.body.appendChild(ta);
  ta.select();
  try{ document.execCommand('copy'); toast('Texto copiado.'); }
  catch(e){ toast('Nao foi possivel copiar.', true); }
  document.body.removeChild(ta);
}

function render(){
  if(!S.report) S.report = FR.emptyFlashReport();
  var r = S.report;
  var host = $('screen');
  clear(host);

  var layout = el('div','layout');
  var form = el('div');
  var preview = el('div','sticky');

  function patch(k){ return function(v){ r[k]=v; save(); }; }
  function patchList(k){ return function(v){ r[k]=FR.parseList(v); save(); }; }
  function pick(key, map){
    return function(v){ r[key] = map ? map(v) : v; save(); render(); };
  }

  form.appendChild(section('Classificacao'));
  form.appendChild(select('Tipo', r.kind, FR.KINDS.map(function(k){return k.id;}), pick('kind')));
  form.appendChild(select('Ambiente', r.environment, FR.ENVIRONMENTS.map(function(e){return e.id;}), pick('environment')));
  form.appendChild(select('Severidade',
    (FR.severityInfo(r.severity)||{}).label||'Alta',
    FR.SEVERITIES.map(function(s){return s.label;}),
    pick('severity', function(lab){
      var hit = FR.SEVERITIES.filter(function(s){return s.label===lab;})[0];
      return hit ? hit.id : 'alta';
    })));
  form.appendChild(select('Status',
    (FR.statusInfo(r.status)||{}).label||'Em atendimento',
    FR.STATUSES.map(function(s){return s.label;}),
    pick('status', function(lab){
      var hit = FR.STATUSES.filter(function(s){return s.label===lab;})[0];
      return hit ? hit.id : 'em_atendimento';
    })));

  form.appendChild(section('Identificacao'));
  form.appendChild(field('Area / Gerencia', r.area, patch('area'), {placeholder:'GER TECN ATEND PA'}));
  form.appendChild(field('Titulo da falha', r.title, patch('title'), {placeholder:'FALHA NO SERVIDOR DE IMPRESSAO'}));
  form.appendChild(field('Descricao', r.description, patch('description'), {multiline:true}));
  var idRow = el('div','row');
  idRow.appendChild(field('Chamado / Ticket', r.ticket, patch('ticket'), {placeholder:'INC-2026-0412'}));
  idRow.appendChild(field('Atualizacao #', String(r.updateNumber||1), function(v){
    r.updateNumber = Number(v)||1; save();
  }, {kind:'number'}));
  form.appendChild(idRow);

  form.appendChild(section('Escopo do impacto'));
  form.appendChild(field('Locais afetados', (r.locations||[]).join(', '), patchList('locations'),
    {multiline:true, placeholder:'Serra Leste, Serra Norte, Serra Sul'}));
  form.appendChild(field('Servicos impactados', (r.services||[]).join(', '), patchList('services'),
    {multiline:true, placeholder:'Impressao, Digitalizacao'}));
  form.appendChild(field('Impacto operacional', r.impact, patch('impact'), {multiline:true}));
  form.appendChild(field('Motivo', r.reason, patch('reason'), {multiline:true}));
  form.appendChild(field('Situacao atual', r.situation, patch('situation'), {multiline:true}));
  form.appendChild(field('Contorno / Workaround', r.workaround, patch('workaround'), {multiline:true}));

  form.appendChild(section('Linha do tempo'));
  var tRow = el('div','row');
  tRow.appendChild(field('Inicio', r.startedAt, patch('startedAt'), {placeholder:'AAAA-MM-DD HH:MM'}));
  tRow.appendChild(field('Atualizado', r.updatedAt, patch('updatedAt'), {placeholder:'AAAA-MM-DD HH:MM'}));
  form.appendChild(tRow);
  form.appendChild(field('Previsao (ETA)', r.eta, patch('eta'), {placeholder:'AAAA-MM-DD HH:MM'}));

  form.appendChild(section('Empresas e responsaveis'));
  form.appendChild(field('Contratante', r.client, patch('client'), {placeholder:'Vale S.A.'}));
  form.appendChild(field('Contratada', r.contractor, patch('contractor'), {placeholder:'Xerox'}));
  form.appendChild(field('Times envolvidos', (r.teams||[]).join(', '), patchList('teams')));
  form.appendChild(field('Responsavel', r.responsible, patch('responsible')));
  form.appendChild(field('Contato / Plantao', r.contact, patch('contact')));
  form.appendChild(field('Observacoes', r.notes, patch('notes'), {multiline:true}));

  form.appendChild(section('Logotipos'));
  form.appendChild(el('p','hint','Contratada a esquerda · Contratante a direita'));
  var lr = el('div','row');
  lr.appendChild(logoPicker('Logo da Contratada','contractorLogo'));
  lr.appendChild(logoPicker('Logo da Contratante','clientLogo'));
  form.appendChild(lr);

  form.appendChild(section('Atalhos'));
  var shortcuts = el('div','row');
  shortcuts.appendChild(button('Nova atualizacao','dark','#',function(){
    r.updateNumber = Number(r.updateNumber||1)+1;
    r.kind = 'ATUALIZACAO';
    r.updatedAt = FR.nowLocalStamp();
    save(); render();
  }));
  shortcuts.appendChild(button('Normalizado','ok','OK',function(){
    r.status = 'normalizado';
    r.kind = 'NORMALIZACAO';
    r.updatedAt = FR.nowLocalStamp();
    if(!r.situation) r.situation = 'Servico restabelecido. Monitoramento ativo.';
    save(); render();
  }));
  form.appendChild(shortcuts);

  preview.appendChild(section('Preview do card'));
  var wrap = el('div','fr-preview-wrap');
  wrap.appendChild(buildCard(r));
  preview.appendChild(wrap);

  preview.appendChild(section('Texto WhatsApp / Teams'));
  var msg = FR.formatWhatsApp(r);
  var box = el('pre','fr-msg'); box.textContent = msg;
  preview.appendChild(box);

  preview.appendChild(button('Copiar texto','lg mt','TXT',function(){
    var issues = FR.validateFlashReport(r).filter(function(i){ return i.level==='error'; });
    if(issues.length){ toast(issues[0].message, true); return; }
    copyText(msg);
  }));
  preview.appendChild(button('Baixar card PNG','ghost lg mt','IMG',function(){
    var issues = FR.validateFlashReport(r).filter(function(i){ return i.level==='error'; });
    if(issues.length){ toast(issues[0].message, true); return; }
    downloadPng(r);
  }));

  layout.appendChild(form);
  layout.appendChild(preview);
  host.appendChild(layout);
}

function loadDemo(){
  S.report = FR.demoFlashReport();
  save(); render();
  toast('Caso demo: servidor de impressao (Vale / Xerox).');
}
function newReport(){
  S.report = FR.emptyFlashReport();
  save(); render();
  toast('Novo flash report.');
}

function boot(){
  if(!load()) S.report = FR.demoFlashReport();
  on($('btnDemo'),'click', loadDemo);
  on($('btnNew'),'click', newReport);
  render();
  setTimeout(function(){ $('splash').className='hidden'; }, 350);
}

window.__FLASH = { state:S, render:render, loadDemo:loadDemo, modules:{ FR:FR } };

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
