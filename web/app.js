/* ==========================================================================
   CIRCUIT MAPPER — build web de campo
   Espelha o app Expo consumindo OS MESMOS modulos de src/core e src/export.
   Sem framework e sem CDN: roda offline no navegador do celular.
   ========================================================================== */
(function () {
'use strict';

/* ---------------- modulos do app (identicos ao Expo) ---------------- */
var T      = __require('src/core/treeEngine');
var SCH    = __require('src/core/schema');
var ENG    = __require('src/core/engineering');
var VAL    = __require('src/core/validation');
var LT     = __require('src/core/loadTable');
var SEED   = __require('src/core/seed');
var LAUDO  = __require('src/export/templates/laudoHtml');
var WBSPEC = __require('src/export/workbookSpec');
var XLSX   = __require('src/export/xlsxWriter');
var FN     = __require('src/export/fileName');
var IMPVAL = __require('src/core/importValidate');

var COLORS = {
  ok: '#34D399', warn: '#FBBF24', err: '#F87171', pri: '#22D3EE', dim: '#6B829E',
  phaseR: '#F87171', phaseS: '#E6EDF3', phaseT: '#60A5FA', neutral: '#38BDF8', ground: '#34D399',
};
function statusColor(s){ return s==='ok'?COLORS.ok : s==='warn'?COLORS.warn : s==='error'?COLORS.err : COLORS.dim; }
function phaseColor(p){
  p = String(p||'').toUpperCase().trim();
  if(p==='R'||p==='L1') return COLORS.phaseR;
  if(p==='S'||p==='L2') return COLORS.phaseS;
  if(p==='T'||p==='L3') return COLORS.phaseT;
  if(p==='N') return COLORS.neutral;
  if(p==='PE') return COLORS.ground;
  return COLORS.pri;
}
var STATUS_LABEL = { ok:'CONFORME', warn:'RESSALVA', error:'NAO CONF.' };

/* ---------------- estado (espelha projectReducer.js) ---------------- */
var KEY = '@vcm/web';
var MAX_HISTORY = 40;
var S = {
  tab: 'projeto', tree: [], header: null, expanded: {},
  past: [], future: [], filter: '', editId: null, addFor: undefined,
  sections: ['cover','intro','tree','tables','assets','findings','conclusion'],
  log: [],
};

var EMPTY_HEADER = {
  reportTitle:'LAUDO TECNICO DE MAPEAMENTO E CADASTRO DE CIRCUITOS ELETRICOS',
  reportNumber:'', revision:'00', client:'', clientCnpj:'', contractor:'', contractorDoc:'',
  contract:'', site:'', location:'', equipmentTag:'', requester:'', scope:'', methodology:'',
  standards:['ABNT NBR 5410:2004 - Instalacoes eletricas de baixa tensao',
             'NR-10 - Seguranca em instalacoes e servicos em eletricidade'],
  technician:'', technicianTitle:'Engenheiro Eletricista', crea:'', art:'',
  inspectionDate:new Date().toISOString().slice(0,10),
  issueDate:new Date().toISOString().slice(0,10),
  instruments:[], contractorLogo:null, clientLogo:null,
};

function save(){
  try{ localStorage.setItem(KEY, JSON.stringify({tree:S.tree, header:S.header, expanded:S.expanded})); }
  catch(e){ toast('Falha ao salvar localmente: '+e.message, true); }
}
function load(){
  try{
    var raw = localStorage.getItem(KEY);
    if(!raw) return false;
    var d = JSON.parse(raw);
    S.tree = d.tree||[]; S.header = d.header||clone(EMPTY_HEADER); S.expanded = d.expanded||{};
    return true;
  }catch(e){ return false; }
}
function clone(o){ return JSON.parse(JSON.stringify(o)); }

/** Toda mutacao da arvore passa por aqui (historico + persistencia) */
function mutate(fn){
  S.past.push(S.tree);
  if(S.past.length>MAX_HISTORY) S.past.shift();
  S.future = [];
  S.tree = fn(S.tree);
  save(); render();
}
function undo(){
  if(!S.past.length) return;
  S.future.unshift(S.tree);
  S.tree = S.past.pop();
  save(); render();
}
function redo(){
  if(!S.future.length) return;
  S.past.push(S.tree);
  S.tree = S.future.shift();
  save(); render();
}

/** validacao memoizada por referencia da arvore */
var _vCache = null, _vKey = null;
function validation(){
  if(_vKey === S.tree) return _vCache;
  _vCache = VAL.validateTree(S.tree); _vKey = S.tree;
  return _vCache;
}

/* ---------------- helpers de DOM ---------------- */
function el(tag, cls, txt){
  var n = document.createElement(tag);
  if(cls) n.className = cls;
  if(txt !== undefined && txt !== null) n.textContent = String(txt);
  return n;
}
function esc(s){ var d=document.createElement('div'); d.textContent = s==null?'':String(s); return d.innerHTML; }
function $(id){ return document.getElementById(id); }
function on(node, ev, fn){ node.addEventListener(ev, fn); return node; }
function clear(node){ while(node.firstChild) node.removeChild(node.firstChild); return node; }

var toastTimer = null;
function toast(msg, isErr){
  var t = $('toast');
  t.textContent = msg;
  t.className = isErr ? 'err' : '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.className = 'hidden'; }, isErr?5000:2600);
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
  if(opts.unit) lb.appendChild(el('i',null,opts.unit));
  w.appendChild(lb);
  var inp = el(opts.multiline ? 'textarea' : 'input');
  if(!opts.multiline) inp.type = opts.kind==='number' ? 'text' : 'text';
  if(opts.kind==='number'){ inp.setAttribute('inputmode','decimal'); }
  inp.value = value==null?'':String(value);
  if(opts.placeholder) inp.placeholder = opts.placeholder;
  on(inp,'input',function(){ onInput(inp.value); });
  w.appendChild(inp);
  if(opts.hint) w.appendChild(el('div','hint',opts.hint));
  return w;
}
function select(label, value, options, onPick, unit){
  var w = el('div','fld');
  var lb = el('div','lb'); lb.appendChild(el('b',null,label));
  if(unit) lb.appendChild(el('i',null,unit));
  w.appendChild(lb);
  var row = el('div','chips');
  options.forEach(function(opt){
    var active = String(value)===String(opt);
    var c = el('button','chip'+(active?' on':''), String(opt));
    on(c,'click',function(){ onPick(active?'':opt); });
    row.appendChild(c);
  });
  w.appendChild(row);
  return w;
}
function kpi(v,k,accent){
  var c = el('div','kpi');
  if(accent) c.style.borderLeftColor = accent;
  var vv = el('div','v', v); if(accent) vv.style.color = accent;
  c.appendChild(vv); c.appendChild(el('div','k',k));
  return c;
}
function pill(status){
  var c = statusColor(status);
  var p = el('span','pill', STATUS_LABEL[status]||status);
  p.style.color = c; p.style.borderColor = c; p.style.background = c+'22';
  return p;
}
function section(txt){ return el('div','h3',txt); }

/* ---------------- bottom sheet ---------------- */
var sheetOnClose = null;
function openSheet(title, sub, bodyNode, footNodes, onClose){
  $('shTitle').textContent = title;
  $('shSub').textContent = sub||'';
  clear($('shBody')).appendChild(bodyNode);
  var f = $('shFoot'); clear(f);
  if(footNodes && footNodes.length){ footNodes.forEach(function(n){ f.appendChild(n); }); f.className='sh-foot'; }
  else f.className='sh-foot hidden';
  $('sheetHost').className = '';
  sheetOnClose = onClose||null;
}
function closeSheet(){
  $('sheetHost').className = 'hidden';
  var cb = sheetOnClose; sheetOnClose = null;
  S.editId = null; S.addFor = undefined;
  if(cb) cb();
  render();
}

/* =========================================================================
   TELA: PROJETO
   ========================================================================= */
function screenProjeto(){
  var root = el('div','pad');
  var v = validation(), sum = v.summary;

  if(!S.tree.length){
    var hero = el('div','card');
    hero.style.borderRadius = '16px'; hero.style.padding = '22px';
    hero.appendChild(el('div','h3','Novo levantamento')).style.marginTop='0';
    hero.appendChild(el('p','hint',
      'Cadastre a hierarquia completa da instalacao — do suprimento primario ate a carga terminal — '
      + 'e gere o laudo tecnico com quadro de cargas automatico.'));
    hero.appendChild(button('Iniciar cadastro','lg','+',function(){ go('construcao'); }));
    var b2 = button('Carregar dados de demonstracao','ghost mt','DEMO',loadDemo);
    hero.appendChild(b2);
    hero.appendChild(button('Importar projeto (.json)','dark mt','IMP',importJson));
    root.appendChild(hero);
    return root;
  }

  var t1 = el('div'); t1.style.font='800 22px "Aptos Narrow",Roboto,sans-serif';
  t1.textContent = S.header.site || 'Projeto sem identificacao';
  root.appendChild(t1);
  var t2 = el('div'); t2.style.font='500 13px Roboto'; t2.style.color=COLORS.pri;
  t2.style.margin='4px 0 16px';
  t2.textContent = [S.header.reportNumber,S.header.location,S.header.equipmentTag]
    .filter(Boolean).join('  ·  ') || '—';
  root.appendChild(t2);

  var accent = sum.errors?COLORS.err:sum.warnings?COLORS.warn:COLORS.ok;
  var r1 = el('div','kpis');
  r1.appendChild(kpi(T.countAll(S.tree),'Itens cadastrados'));
  r1.appendChild(kpi(T.depth(S.tree),'Niveis'));
  r1.appendChild(kpi(sum.circuits,'Circuitos'));
  root.appendChild(r1);
  var r2 = el('div','kpis');
  r2.appendChild(kpi(sum.panels,'Quadros'));
  r2.appendChild(kpi(sum.totalKva,'kVA instalados'));
  r2.appendChild(kpi(sum.conformityIndex+'%','Conformidade',accent));
  root.appendChild(r2);
  var r3 = el('div','kpis');
  r3.appendChild(kpi(sum.errors,'Nao conformidades',COLORS.err));
  r3.appendChild(kpi(sum.warnings,'Ressalvas',COLORS.warn));
  r3.appendChild(kpi(sum.conform,'Itens conformes',COLORS.ok));
  root.appendChild(r3);

  var vd = el('div','verdict',sum.verdict);
  vd.style.borderColor = accent; vd.style.color = accent;
  root.appendChild(vd);

  root.appendChild(section('Inventario por categoria'));
  var counts = T.countByType(S.tree);
  Object.keys(counts).forEach(function(k){
    var ti = SCH.typeInfo(k);
    var row = el('div','inv');
    var tag = el('div','ty',ti.short); tag.style.color=ti.color; tag.style.borderColor=ti.color;
    row.appendChild(tag);
    row.appendChild(el('div','n',ti.label));
    row.appendChild(el('div','q',counts[k]));
    root.appendChild(row);
  });

  root.appendChild(section('Acoes'));
  root.appendChild(button('Modo Construcao','lg','ARV',function(){ go('construcao'); }));
  root.appendChild(button('Modo Laudo / Relatorios','ghost lg mt','DOC',function(){ go('laudo'); }));
  root.appendChild(button('Importar projeto (.json)','dark mt','IMP',importJson));
  root.appendChild(button('Limpar projeto','danger mt','DEL',function(){
    if(confirm('Todos os dados locais serao apagados. Confirmar?')){
      S.tree=[]; S.header=clone(EMPTY_HEADER); S.expanded={}; S.past=[]; S.future=[];
      save(); render(); toast('Projeto limpo.');
    }
  }));
  return root;
}

function loadDemo(){
  mutate(function(){ return SEED.attachSampleAssets(SEED.buildSeedTree()); });
  S.header = Object.assign(clone(EMPTY_HEADER), SEED.seedReportHeader);
  var exp = {};
  (function walk(l){ l.forEach(function(n){ exp[n.id]=true; walk(n.children); }); })(S.tree);
  S.expanded = exp;
  save(); go('construcao');
  toast('Cenario ficticio carregado: '+T.countAll(S.tree)+' itens.');
}

/* =========================================================================
   TELA: CONSTRUCAO (Explorer)
   ========================================================================= */
function screenConstrucao(){
  var root = el('div');

  var tools = el('div','tools');
  var inp = el('input');
  inp.placeholder = 'Buscar por TAG, descricao, secao, disjuntor...';
  inp.value = S.filter;
  on(inp,'input',function(){ S.filter = inp.value; renderTree(treeHost); });
  tools.appendChild(inp);
  root.appendChild(tools);

  var acts = el('div','acts');
  acts.appendChild(button('Novo','sm','+',function(){ openAdd(null); }));
  acts.appendChild(button('Expandir','dark sm',null,function(){ setAllExpanded(true); }));
  acts.appendChild(button('Recolher','dark sm',null,function(){ setAllExpanded(false); }));
  acts.appendChild(button('Desfazer','ghost sm',null,undo));
  root.appendChild(acts);

  var treeHost = el('div','#tree'); treeHost.id = 'tree';
  root.appendChild(treeHost);
  renderTree(treeHost);
  return root;
}

function setAllExpanded(val){
  var exp = {};
  (function walk(l){ l.forEach(function(n){ exp[n.id]=val; walk(n.children); }); })(S.tree);
  S.expanded = exp; save(); render();
}

function renderTree(host){
  clear(host);
  var flat = T.flatten(S.tree, { expanded: S.expanded });
  if(S.filter){
    var q = S.filter.toLowerCase();
    flat = flat.filter(function(f){
      var a = f.node.attributes||{};
      var hay = [f.node.label, f.node.type].concat(Object.keys(a).map(function(k){return a[k];}))
        .join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  if(!flat.length){
    var e = el('div','empty');
    e.appendChild(el('b',null,'NENHUM ITEM '+(S.filter?'ENCONTRADO':'CADASTRADO')));
    e.appendChild(el('span',null, S.filter
      ? 'Ajuste o termo de busca.'
      : 'Toque em NOVO para iniciar a arvore pelo site, subestacao ou quadro geral.\n\n'
        + 'A hierarquia aceita niveis ilimitados:\nSite › Subestacao › Trafo › Quadro Geral › '
        + 'Sub-quadro › Grupo › Circuito › Ativo'));
    host.appendChild(e);
    return;
  }
  var statusById = validation().statusById;
  flat.forEach(function(f){ host.appendChild(treeRow(f, statusById[f.id])); });
}

function treeRow(f, status){
  var n = f.node, ti = SCH.typeInfo(n.type), a = n.attributes||{};
  var row = el('div','tr'+(S.editId===n.id?' sel':''));

  for(var i=0;i<f.level;i++) row.appendChild(el('div','gd'));

  var acc = el('div','acc');
  acc.style.background = status ? statusColor(status) : ti.color;
  row.appendChild(acc);

  var tg = el('button','tg'+(f.hasChildren?'':' no'), f.hasChildren ? (f.isExpanded?'−':'+') : '·');
  if(f.hasChildren) on(tg,'click',function(ev){
    ev.stopPropagation();
    S.expanded[n.id] = !S.expanded[n.id]; save(); render();
  });
  row.appendChild(tg);

  var ct = el('button','ct');
  var l1 = el('div','l1');
  var ty = el('span','ty',ti.short); ty.style.color=ti.color; ty.style.borderColor=ti.color;
  l1.appendChild(ty);
  l1.appendChild(el('span','nm',n.label));
  if(a.phase){
    var ph = el('span','ph',a.phase);
    ph.style.background = phaseColor(a.phase);
    ph.style.color = String(a.phase).toUpperCase()==='S' ? '#06141F' : '#FFF';
    l1.appendChild(ph);
  }
  ct.appendChild(l1);

  var pw = a.powerW ? (Number(a.powerW)>=1000 ? (Number(a.powerW)/1000).toFixed(1)+'kW' : a.powerW+'W') : null;
  var tension = a.tension ? (/v/i.test(String(a.tension)) ? String(a.tension) : a.tension+'V') : null;
  var bits = [a.tag||a.circuitNumber, tension, a.section&&a.section+'mm2',
              a.breaker&&a.breaker+'A', pw, a.location].filter(Boolean).slice(0,3);
  if(bits.length) ct.appendChild(el('div','sb', bits.join('  •  ')));
  on(ct,'click',function(){ openEdit(n.id); });
  row.appendChild(ct);

  if(f.hasChildren) row.appendChild(el('div','cnt', f.childCount));
  if(status && status!=='ok'){
    var d = el('div','dot'); d.style.background = statusColor(status);
    d.style.marginRight='6px'; d.style.alignSelf='center';
    row.appendChild(d);
  }
  if(ti.allowedChildren.length){
    var add = el('button','add','+');
    on(add,'click',function(ev){ ev.stopPropagation(); openAdd(n.id); });
    row.appendChild(add);
  }
  return row;
}

/* ---------------- modal: novo item ---------------- */
function openAdd(parentId){
  S.addFor = parentId;
  var parent = parentId ? T.findNode(S.tree, parentId) : null;
  var parentType = parent ? parent.type : null;
  var allowed = parentType ? SCH.allowedChildren(parentType) : SCH.CREATION_ORDER;

  var body = el('div');
  body.appendChild(el('p','hint', parentType
    ? 'Tipos permitidos sob "'+SCH.typeInfo(parentType).label+'":'
    : 'Selecione o tipo de item raiz:'));
  allowed.forEach(function(t){
    var ti = SCH.NODE_TYPES[t]; if(!ti) return;
    var b = el('button','pickr');
    var bg = el('div','bg2',ti.short); bg.style.color=ti.color; bg.style.borderColor=ti.color;
    b.appendChild(bg);
    var box = el('div'); box.style.flex='1'; box.style.minWidth='0';
    box.appendChild(el('div','t1',ti.label));
    box.appendChild(el('div','t2', ti.allowedChildren.length
      ? 'Aceita: '+ti.allowedChildren.map(function(c){return SCH.NODE_TYPES[c].label;}).join(', ')
      : 'Item terminal (folha da arvore)'));
    b.appendChild(box);
    b.appendChild(el('div','ar','›'));
    on(b,'click',function(){
      var created = null;
      mutate(function(tree){
        var node = T.createNode({ type:t, label:SCH.typeInfo(t).label,
          attributes:SCH.defaultAttributes(t) });
        created = node.id;
        if(parentId) S.expanded[parentId] = true;
        return T.addChild(tree, parentId, node);
      });
      closeSheet();
      openEdit(created);
    });
    body.appendChild(b);
  });
  openSheet('Novo item da hierarquia',
    parentId ? 'Sob: '+(parent?parent.label:'') : 'Item de nivel raiz', body);
}

/* ---------------- modal: editar item ---------------- */
function openEdit(id){
  S.editId = id;
  var node = T.findNode(S.tree, id);
  if(!node) return;
  var purpose = VAL.inheritedPurpose(S.tree, id);
  var path = T.findPath(S.tree, id) || [];

  var body = el('div');

  var crumb = el('div');
  crumb.style.cssText='display:flex;gap:6px;overflow-x:auto;padding-bottom:10px;'
    +'margin-bottom:10px;border-bottom:1px solid #2A3F5F';
  path.forEach(function(p,i){
    if(i) { var s=el('span',null,'›'); s.style.color=COLORS.dim; crumb.appendChild(s); }
    var b = el('button',null,p.label);
    b.style.cssText='font:'+(i===path.length-1?'700':'500')+' 13px Roboto;white-space:nowrap;color:'
      +(i===path.length-1?COLORS.pri:'#9FB3C8');
    on(b,'click',function(){ closeSheet(); openEdit(p.id); });
    crumb.appendChild(b);
  });
  body.appendChild(crumb);

  body.appendChild(field('Descricao do Item', node.label, function(v){
    mutateQuiet(function(tree){ return T.updateNode(tree,id,{label:v}); });
    $('shTitle').textContent = v;
    renderTree($('tree')||el('div'));
  }, { placeholder: SCH.typeInfo(node.type).label }));

  /* painel de calculo ao vivo */
  var calcHost = el('div');
  body.appendChild(calcHost);
  function renderCalc(){
    clear(calcHost);
    if(node.type !== 'circuit') return;
    node = T.findNode(S.tree, id);
    var r = VAL.validateCircuit(node, { purpose: purpose });
    var box = el('div','calc');
    var ch = el('div','ch');
    ch.appendChild(el('b',null,'Verificacao NBR 5410 (ao vivo)'));
    ch.appendChild(pill(r.status));
    box.appendChild(ch);
    var g = el('div','mg');
    [['Ib',(r.computed.ib||0)+' A','Corrente de projeto',false],
     ['In',(r.computed.in||'-')+' A','Disjuntor',false],
     ['Iz',(r.computed.iz||0)+' A','Cabo corrigido',false],
     ['dV',(r.computed.voltageDrop||0)+' %','Limite 4%',r.computed.voltageDrop>4],
     ['S(VA)',String(r.computed.powerVa||0),'Pot. aparente',false],
     ['PE min',(r.computed.peMin||0)+' mm2','Tab. 58',false]
    ].forEach(function(m){
      var c = el('div','mt1');
      c.appendChild(el('div','k',m[0]));
      var v = el('div','v',m[1]); if(m[3]) v.style.color=COLORS.err;
      c.appendChild(v);
      c.appendChild(el('div','h',m[2]));
      g.appendChild(c);
    });
    box.appendChild(g);
    box.appendChild(el('div','crit','Criterio: Ib ≤ In ≤ Iz'
      + (r.computed.ib&&r.computed.in&&r.computed.iz
        ? '  →  '+r.computed.ib+' ≤ '+r.computed.in+' ≤ '+r.computed.iz : '')));
    box.appendChild(button('Dimensionar automaticamente','ghost sm mt','CALC',function(){
      var cur = T.findNode(S.tree,id);
      var res = ENG.autoSize(cur.attributes||{}, purpose);
      if(!res || !res.section){ toast('Informe potencia/corrente e comprimento.',true); return; }
      mutate(function(tree){
        return T.updateNode(tree,id,{ attributes:{
          section:String(res.section), breaker:String(res.breaker),
          ip:String(res.ib), peSection:String(res.peSection) } });
      });
      toast('Sugerido: '+res.section+'mm2 · '+res.breaker+'A · dV '+res.voltageDrop+'%');
      openEdit(id);
    }));
    r.findings.forEach(function(f){
      var fd = el('div','fnd'+(f.level==='warn'?' w':''));
      fd.appendChild(el('div','c', f.code+' · '+f.ref));
      fd.appendChild(el('div','m', f.message));
      fd.appendChild(el('div','a','▸ '+f.action));
      box.appendChild(fd);
    });
    calcHost.appendChild(box);
  }
  renderCalc();

  /* campos tipados do schema */
  body.appendChild(section('Atributos Tecnicos'));
  var defs = SCH.fieldsFor(node.type);
  var attrsHost = el('div');
  body.appendChild(attrsHost);

  function setAttr(k,v){
    mutateQuiet(function(tree){ return T.setAttribute(tree,id,k,v); });
    renderCalc();
    var th = $('tree'); if(th) renderTree(th);
  }

  defs.forEach(function(d){
    var a = (T.findNode(S.tree,id).attributes)||{};
    if(d.kind==='select'){
      var host = el('div');
      function drawSel(){
        clear(host);
        var cur = (T.findNode(S.tree,id).attributes||{})[d.key];
        host.appendChild(select(d.label, cur, d.options, function(v){
          setAttr(d.key,v); drawSel();
        }, d.unit));
      }
      drawSel();
      attrsHost.appendChild(host);
    } else {
      attrsHost.appendChild(field(d.label, a[d.key], function(v){ setAttr(d.key,v); },
        { kind:d.kind, unit:d.unit, hint:d.hint, placeholder:d.placeholder,
          multiline:d.key==='observation' }));
    }
  });

  /* fotos do item */
  body.appendChild(section('Fotos do Item'));
  body.appendChild(el('p','hint',
    'Registre fotos do ponto de inspecao. Elas sao embutidas no laudo tecnico.'));
  var photoHost = el('div');
  body.appendChild(photoHost);

  function resizeDataUri(file, cb){
    var r = new FileReader();
    r.onload = function(){
      var img = new Image();
      img.onload = function(){
        var max = 1280, w = img.width, h = img.height;
        if(w > max || h > max){ if(w >= h){ h = Math.round(h*max/w); w = max; } else { w = Math.round(w*max/h); h = max; } }
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(c.toDataURL('image/jpeg', 0.7));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }

  function drawPhotos(){
    clear(photoHost);
    var n = T.findNode(S.tree,id);
    var photos = (n.meta && n.meta.photos) || [];
    var grid = el('div'); grid.style.cssText='display:flex;flex-wrap:wrap;gap:10px;margin-top:10px';
    photos.forEach(function(p){
      var cell = el('div'); cell.style.cssText='width:108px;position:relative';
      var img = el('img'); img.src = p.uri;
      img.style.cssText='width:108px;height:108px;object-fit:cover;border-radius:10px;border:1.5px solid #2A3F5F';
      img.addEventListener('click', function(){ window.open(p.uri); });
      cell.appendChild(img);
      var del = el('button',null,'×');
      del.style.cssText='position:absolute;top:-6px;right:-6px;width:26px;height:26px;border-radius:13px;'
        +'background:#F87171;color:#fff;font:800 16px Roboto;border:none;line-height:22px;cursor:pointer';
      del.addEventListener('click', function(){
        mutate(function(tree){ return T.removePhoto(tree,id,p.id); });
        drawPhotos();
      });
      cell.appendChild(del);
      var cap = document.createElement('input'); cap.type='text'; cap.value = p.caption||'';
      cap.placeholder='Legenda...';
      cap.style.cssText='width:100%;margin-top:6px;font:11px Roboto;color:#E6EDF3;background:#243B5C;'
        +'border:1.5px solid #2A3F5F;border-radius:6px;padding:6px 8px;height:30px;box-sizing:border-box';
      cap.addEventListener('input', function(){
        var v = cap.value;
        mutateQuiet(function(tree){ return T.setPhotoCaption(tree,id,p.id,v); });
      });
      cell.appendChild(cap);
      grid.appendChild(cell);
    });
    photoHost.appendChild(grid);

    var row = el('div','row'); row.style.cssText='gap:8px;margin-top:10px';
    var cam = button('Tirar foto','sm','CAM',function(){ camInput.click(); });
    row.appendChild(cam);
    var gal = button('Galeria','dark sm',null,function(){ galInput.click(); });
    row.appendChild(gal);
    photoHost.appendChild(row);

    var camInput = document.createElement('input'); camInput.type='file'; camInput.accept='image/*';
    camInput.capture = 'environment'; camInput.style.display='none';
    var galInput = document.createElement('input'); galInput.type='file'; galInput.accept='image/*'; galInput.style.display='none';
    function onPick(e){
      var f = e.target.files && e.target.files[0]; if(!f) return;
      resizeDataUri(f, function(dataUri){
        var photo = { id:'ph_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),
          uri:dataUri, caption:'', takenAt:new Date().toISOString() };
        mutate(function(tree){ return T.addPhoto(tree,id,photo); });
        drawPhotos();
        toast('Foto anexada.');
      });
      e.target.value = '';
    }
    camInput.addEventListener('change', onPick);
    galInput.addEventListener('change', onPick);
    photoHost.appendChild(camInput); photoHost.appendChild(galInput);
  }
  drawPhotos();

  /* atributos diversos */
  body.appendChild(section('Atributos Diversos'));
  body.appendChild(el('p','hint',
    'Metadados livres para particularidades do site (ex.: "Nivel de curto", '
    + '"Data da termografia", "N. do desenho unifilar").'));
  var customHost = el('div');
  body.appendChild(customHost);
  function drawCustom(){
    clear(customHost);
    var cur = T.findNode(S.tree,id);
    var known = defs.map(function(d){return d.key;});
    Object.keys(cur.attributes||{}).filter(function(k){ return known.indexOf(k)<0; })
      .forEach(function(k){
        var r = el('div'); r.style.cssText='display:flex;gap:8px;align-items:flex-start';
        var f = field(k, cur.attributes[k], function(v){ setAttr(k,v); });
        f.style.flex='1';
        r.appendChild(f);
        var del = el('button',null,'×');
        del.style.cssText='width:48px;min-height:56px;margin-top:25px;border-radius:10px;'
          +'border:1.5px solid #F87171;color:#F87171;background:#16263D;font:800 24px Roboto;flex:none';
        on(del,'click',function(){ setAttr(k,''); drawCustom(); });
        r.appendChild(del);
        customHost.appendChild(r);
      });
    var nk='', nv='';
    var addRow = el('div','row');
    addRow.appendChild(field('Novo atributo','',function(v){nk=v;},{placeholder:'Nome do campo'}));
    addRow.appendChild(field('Valor','',function(v){nv=v;},{placeholder:'Conteudo'}));
    customHost.appendChild(addRow);
    customHost.appendChild(button('Adicionar atributo','ghost','+',function(){
      if(!nk.trim()){ toast('Informe o nome do atributo.',true); return; }
      setAttr(nk.trim(), nv||'-'); drawCustom();
    }));
  }
  drawCustom();

  var nd = T.findNode(S.tree,id);
  body.appendChild(el('div','meta',
    'ID: '+nd.id+'\nCriado: '+new Date(nd.meta.createdAt).toLocaleString('pt-BR')
    +'\nAtualizado: '+new Date(nd.meta.updatedAt).toLocaleString('pt-BR')));

  var foot = [
    button('Duplicar','dark sm',null,function(){
      mutate(function(tree){ return T.duplicateNode(tree,id); });
      closeSheet(); toast('Item duplicado.');
    }),
    button('Excluir','danger sm',null,function(){
      var cnt = T.countAll([T.findNode(S.tree,id)]);
      var msg = '"'+T.findNode(S.tree,id).label+'" sera removido'
        + (cnt>1 ? ' junto com '+(cnt-1)+' item(ns) dependente(s)' : '') + '. Confirmar?';
      if(confirm(msg)){
        mutate(function(tree){ return T.removeNode(tree,id); });
        closeSheet(); toast('Item removido.');
      }
    }),
    button('Concluir','sm',null,closeSheet),
  ];
  openSheet(node.label, SCH.typeInfo(node.type).label, body, foot);
}

/** mutacao sem re-render global (mantem foco do teclado no campo) */
function mutateQuiet(fn){
  S.past.push(S.tree);
  if(S.past.length>MAX_HISTORY) S.past.shift();
  S.future = [];
  S.tree = fn(S.tree);
  save();
  syncUndoButtons();
}

/* =========================================================================
   TELA: CONFORMIDADE
   ========================================================================= */
var auditFilter = 'all';
function screenConformidade(){
  var root = el('div');
  var v = validation(), sum = v.summary;

  var k = el('div','kpis'); k.style.padding='0 16px';
  k.appendChild(kpi(sum.errors,'Nao conf.',COLORS.err));
  k.appendChild(kpi(sum.warnings,'Ressalvas',COLORS.warn));
  k.appendChild(kpi(sum.conform,'Conformes',COLORS.ok));
  k.appendChild(kpi(sum.conformityIndex+'%','Indice'));
  root.appendChild(k);

  var fl = el('div','filters');
  [['all','Todos'],['error','Nao conformidades'],['warn','Ressalvas']].forEach(function(x){
    var b = el('button','btn '+(auditFilter===x[0]?'':'dark'), x[1]);
    b.className = 'btn '+(auditFilter===x[0]?'':'dark');
    b.textContent = x[1];
    on(b,'click',function(){ auditFilter=x[0]; render(); });
    fl.appendChild(b);
  });
  root.appendChild(fl);

  var list = el('div','pad');
  var data = v.findings.slice().sort(function(a,b){
    return a.level===b.level?0:(a.level==='error'?-1:1);
  });
  if(auditFilter!=='all') data = data.filter(function(x){ return x.level===auditFilter; });

  if(!data.length){
    var e = el('div','empty');
    e.appendChild(el('span',null, S.tree.length
      ? 'Nenhum apontamento nesta categoria.'
      : 'Cadastre circuitos para gerar a verificacao.'));
    list.appendChild(e);
  }
  data.forEach(function(f){
    var c = el('div','card '+(f.level==='error'?'err':'warn'));
    var top = el('div','top');
    var code = el('span','pill',f.code);
    var col = f.level==='error'?COLORS.err:COLORS.warn;
    code.style.color=col; code.style.borderColor=col;
    top.appendChild(code);
    top.appendChild(el('div','nm2',f.nodeLabel));
    c.appendChild(top);
    c.appendChild(el('div','pth',f.path));
    c.appendChild(el('div','msg',f.message));
    c.appendChild(el('div','act','▸ '+f.action));
    c.appendChild(el('div','ref',f.ref));
    var b = button('Abrir item','dark sm mt',null,function(){
      go('construcao'); openEdit(f.nodeId);
    });
    c.appendChild(b);
    list.appendChild(c);
  });
  root.appendChild(list);
  return root;
}

/* =========================================================================
   TELA: LAUDO (cabecalho + geracao)
   ========================================================================= */
var laudoStep = 'header';
function screenLaudo(){
  return laudoStep==='header' ? screenLaudoHeader() : screenLaudoExport();
}

function screenLaudoHeader(){
  var root = el('div','pad');
  var h = S.header;
  function set(k){ return function(v){ h[k]=v; save(); }; }

  root.appendChild(section('Identificacao do Documento'));
  root.appendChild(field('Titulo do Laudo',h.reportTitle,set('reportTitle'),{multiline:true}));
  var r1 = el('div','row');
  var f1 = field('Numero do Documento',h.reportNumber,set('reportNumber'),{placeholder:'LT-2026-0147'});
  f1.style.flex='2'; r1.appendChild(f1);
  r1.appendChild(field('Revisao',h.revision,set('revision'),{placeholder:'00'}));
  root.appendChild(r1);

  root.appendChild(section('Contratante (Cliente)'));
  root.appendChild(field('Razao Social',h.client,set('client'),{placeholder:'Cliente Ltda.'}));
  root.appendChild(field('CNPJ',h.clientCnpj,set('clientCnpj')));
  root.appendChild(field('Solicitante / Area',h.requester,set('requester'),
    {placeholder:'Gerencia de Manutencao Eletrica'}));
  root.appendChild(field('Contrato / Ordem de Servico',h.contract,set('contract')));

  root.appendChild(section('Contratada (Executante)'));
  root.appendChild(field('Razao Social / Profissional',h.contractor,set('contractor'),
    {placeholder:'Robson do Carmo - Engenharia Eletrica'}));
  root.appendChild(field('CNPJ / CPF',h.contractorDoc,set('contractorDoc')));

  root.appendChild(section('Localidade e Ativo'));
  root.appendChild(field('Site / Instalacao',h.site,set('site'),
    {placeholder:'Complexo Itabira - Usina 3'}));
  root.appendChild(field('Localidade',h.location,set('location'),{placeholder:'Itabira / MG'}));
  root.appendChild(field('TAG do Equipamento',h.equipmentTag,set('equipmentTag'),
    {placeholder:'SE-01 / QGBT-01'}));

  root.appendChild(section('Logotipos'));
  root.appendChild(el('p','hint',
    'As imagens sao embutidas na capa em base64 — funcionam offline, sem dependencia de rede.'));
  var lr = el('div','row');
  lr.appendChild(logoPicker('Logo da Contratada','contractorLogo'));
  lr.appendChild(logoPicker('Logo da Contratante','clientLogo'));
  root.appendChild(lr);

  root.appendChild(section('Escopo e Metodologia'));
  root.appendChild(field('Escopo dos Servicos',h.scope,set('scope'),{multiline:true}));
  root.appendChild(field('Metodologia Aplicada',h.methodology,set('methodology'),{multiline:true}));
  root.appendChild(field('Normas de Referencia (uma por linha)',(h.standards||[]).join('\n'),
    function(v){ h.standards = v.split('\n').filter(Boolean); save(); },{multiline:true}));

  root.appendChild(section('Instrumentos Utilizados'));
  var instHost = el('div');
  root.appendChild(instHost);
  function drawInst(){
    clear(instHost);
    (h.instruments||[]).forEach(function(i,idx){
      var r = el('div','inv');
      var box = el('div'); box.style.flex='1'; box.style.minWidth='0';
      box.appendChild(el('div','n',i.name));
      box.appendChild(el('div','t2',[i.model,i.serial,i.calibration&&'Cal. '+i.calibration]
        .filter(Boolean).join('  ·  ')));
      r.appendChild(box);
      var d = el('button',null,'×');
      d.style.cssText='width:44px;height:44px;border-radius:8px;border:1.4px solid #F87171;'
        +'color:#F87171;font:800 24px Roboto;flex:none';
      on(d,'click',function(){ h.instruments.splice(idx,1); save(); drawInst(); });
      r.appendChild(d);
      instHost.appendChild(r);
    });
    var n1='',n2='',n3='',n4='';
    var ra = el('div','row');
    ra.appendChild(field('Instrumento','',function(v){n1=v;},{placeholder:'Alicate amperimetro'}));
    ra.appendChild(field('Modelo','',function(v){n2=v;},{placeholder:'Fluke 376'}));
    instHost.appendChild(ra);
    var rb = el('div','row');
    rb.appendChild(field('N. de Serie','',function(v){n3=v;}));
    rb.appendChild(field('Calibracao','',function(v){n4=v;},{placeholder:'2026-02-11'}));
    instHost.appendChild(rb);
    instHost.appendChild(button('Adicionar instrumento','ghost','+',function(){
      if(!n1.trim()){ toast('Informe o instrumento.',true); return; }
      h.instruments = (h.instruments||[]).concat([{name:n1,model:n2,serial:n3,calibration:n4}]);
      save(); drawInst();
    }));
  }
  drawInst();

  root.appendChild(section('Responsavel Tecnico'));
  root.appendChild(field('Nome',h.technician,set('technician'),{placeholder:'Robson do Carmo'}));
  root.appendChild(field('Titulo Profissional',h.technicianTitle,set('technicianTitle')));
  var r5 = el('div','row');
  r5.appendChild(field('CREA',h.crea,set('crea'),{placeholder:'CREA-MG 0000000'}));
  r5.appendChild(field('ART / RRT',h.art,set('art')));
  root.appendChild(r5);
  var r6 = el('div','row');
  r6.appendChild(field('Data da Inspecao',h.inspectionDate,set('inspectionDate'),
    {placeholder:'AAAA-MM-DD'}));
  r6.appendChild(field('Data de Emissao',h.issueDate,set('issueDate'),{placeholder:'AAAA-MM-DD'}));
  root.appendChild(r6);

  root.appendChild(button('Ir para geracao de documentos','lg mt','GER',function(){
    laudoStep='export'; render();
  }));
  return root;
}

function logoPicker(label, key){
  var w = el('div','logo');
  w.appendChild(el('div','h3',label)).style.cssText=
    'font:700 13px Roboto;letter-spacing:1.1px;color:#22D3EE;text-transform:uppercase;'
    +'border:0;padding:0;margin:0 0 6px';
  var box = el('button','box');
  function draw(){
    clear(box);
    if(S.header[key]){
      var img = el('img'); img.src = S.header[key]; box.appendChild(img);
    } else box.appendChild(el('span',null,'TOQUE PARA\nSELECIONAR IMAGEM'));
  }
  draw();
  var inp = el('input'); inp.type='file'; inp.accept='image/*'; inp.style.display='none';
  on(inp,'change',function(){
    var f = inp.files && inp.files[0]; if(!f) return;
    var rd = new FileReader();
    rd.onload = function(){ S.header[key] = rd.result; save(); draw(); toast('Logo carregado.'); };
    rd.onerror = function(){ toast('Falha ao ler a imagem.',true); };
    rd.readAsDataURL(f);
  });
  on(box,'click',function(){ inp.click(); });
  w.appendChild(box); w.appendChild(inp);
  var act = el('div'); act.style.cssText='display:flex;justify-content:space-between;margin-top:5px';
  if(S.header[key]){
    var rm = el('button',null,'REMOVER');
    rm.style.cssText='font:700 10px Roboto;letter-spacing:.9px;color:#F87171';
    on(rm,'click',function(){ S.header[key]=null; save(); render(); });
    act.appendChild(rm);
  }
  w.appendChild(act);
  return w;
}

var SECTION_LABELS = [
  ['cover','Capa'],['intro','Identificacao e metodologia'],['tree','Estrutura hierarquica'],
  ['tables','Quadros de cargas'],['assets','Inventario de ativos'],
  ['findings','Apontamentos tecnicos'],['conclusion','Parecer conclusivo'],
];
var FORMATS = [
  ['pdf','PDF','Laudo completo com capa','PDF'],
  ['doc','WORD','Editavel (.doc)','DOC'],
  ['xlsx','EXCEL','Quadro de cargas por quadro','XLS'],
  ['png','IMAGEM','Resumo executivo (.png)','IMG'],
  ['json','BACKUP','Projeto completo (.json)','BAK'],
];

function screenLaudoExport(){
  var root = el('div','pad');
  var v = validation(), sum = v.summary;
  var accent = sum.errors?COLORS.err:sum.warnings?COLORS.warn:COLORS.ok;

  root.appendChild(button('‹ Voltar ao cabecalho','dark sm',null,function(){
    laudoStep='header'; render();
  }));

  var k = el('div','kpis'); k.style.marginTop='12px';
  k.appendChild(kpi(sum.circuits,'Circuitos'));
  k.appendChild(kpi(sum.panels,'Quadros'));
  k.appendChild(kpi(sum.conformityIndex+'%','Conformidade',accent));
  root.appendChild(k);

  var vb = el('div','card');
  vb.style.borderLeftColor = accent;
  var vt = el('div','top'); vt.appendChild(pill(sum.errors?'error':sum.warnings?'warn':'ok'));
  vb.appendChild(vt);
  vb.appendChild(el('div','msg',sum.verdict));
  root.appendChild(vb);

  root.appendChild(section('Secoes incluidas no documento'));
  SECTION_LABELS.forEach(function(x){
    var on_ = S.sections.indexOf(x[0])>=0;
    var r = el('button','ckrow');
    var c = el('div','ck'+(on_?' on':''), on_?'✓':'');
    r.appendChild(c);
    r.appendChild(el('div',null,x[1]));
    on(r,'click',function(){
      var i = S.sections.indexOf(x[0]);
      if(i>=0) S.sections.splice(i,1); else S.sections.push(x[0]);
      render();
    });
    root.appendChild(r);
  });

  root.appendChild(section('Formatos de saida'));
  FORMATS.forEach(function(f){
    var r = el('div','fmt');
    r.appendChild(el('div','bg3',f[3]));
    var t = el('div','t'); t.appendChild(el('b',null,f[1])); t.appendChild(el('i',null,f[2]));
    r.appendChild(t);
    r.appendChild(button('Gerar','sm',null,function(){ generate(f[0]); }));
    root.appendChild(r);
  });

  root.appendChild(button('Gerar pacote completo','lg mt','ALL',function(){
    ['pdf','doc','xlsx','json'].forEach(function(f,i){
      setTimeout(function(){ generate(f, true); }, i*700);
    });
    toast('Gerando pacote (PDF, DOC, XLSX, JSON)...');
  }));
  root.appendChild(button('Imprimir / salvar via sistema','ghost mt','PRN',function(){
    generate('pdf');
  }));
  root.appendChild(button('Exportar resumo em JPG','dark mt','JPG',function(){
    generate('jpg');
  }));

  if(S.log.length){
    root.appendChild(section('Arquivos gerados nesta sessao'));
    S.log.forEach(function(l){
      var r = el('div','logrow');
      r.appendChild(el('span',null,l.name));
      r.appendChild(el('span',null,l.when));
      root.appendChild(r);
    });
  }
  return root;
}

/* =========================================================================
   EXPORTACAO
   ========================================================================= */
function download(blob, name){
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
  S.log.unshift({ name: name, when: new Date().toLocaleTimeString('pt-BR') });
  S.log = S.log.slice(0,8);
}

function generate(fmt, quiet){
  if(!S.tree.length){ toast('Cadastre a hierarquia antes de gerar o laudo.',true); return; }
  try{
    var h = S.header, name;
    if(fmt==='pdf'){
      var html = LAUDO.buildLaudoHtml(S.tree, h, { sections: S.sections });
      var w = window.open('','_blank');
      if(!w){ toast('Permita pop-ups para gerar o PDF.',true); return; }
      w.document.open(); w.document.write(html); w.document.close();
      setTimeout(function(){ try{ w.focus(); w.print(); }catch(e){} }, 700);
      if(!quiet) toast('Use "Salvar como PDF" no dialogo de impressao.');
      S.log.unshift({ name: FN.fileName(h,'pdf')+' (impressao)',
        when:new Date().toLocaleTimeString('pt-BR') });
      render(); return;
    }
    if(fmt==='doc'){
      var MSO = '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View>'
        + '</w:WordDocument></xml><![endif]-->'
        + '<style>@page WordSection1{size:21cm 29.7cm;margin:1.4cm 1.2cm 1.6cm 1.2cm}'
        + 'div.WordSection1{page:WordSection1}</style>';
      var doc = LAUDO.buildLaudoHtml(S.tree, h, { sections: S.sections })
        .replace('</head>', MSO+'</head>')
        .replace('<body>','<body><div class="WordSection1">')
        .replace('</body>','</div></body>');
      name = FN.fileName(h,'doc');
      download(new Blob([doc],{type:'application/msword'}), name);
    } else if(fmt==='xlsx'){
      var spec = WBSPEC.buildWorkbookSpec(S.tree, h);
      var bytes = XLSX.specToXlsxBytes(spec);
      name = FN.fileName(h,'xlsx');
      download(new Blob([bytes],
        {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), name);
    } else if(fmt==='json'){
      var payload = JSON.stringify({ schemaVersion:1, app:'circuit-mapper',
        exportedAt:new Date().toISOString(), header:h, tree:S.tree }, null, 2);
      name = FN.fileName(h,'json');
      download(new Blob([payload],{type:'application/json'}), name);
    } else if(fmt==='png' || fmt==='jpg'){
      name = FN.fileName(h,fmt);
      renderSummaryCanvas(function(canvas){
        canvas.toBlob(function(blob){
          download(blob, name);
          if(!quiet) toast('Resumo exportado: '+name);
        }, fmt==='jpg'?'image/jpeg':'image/png', 0.94);
      });
      return;
    } else { toast('Formato nao suportado: '+fmt,true); return; }
    if(!quiet) toast('Gerado: '+name);
    render();
  }catch(e){
    toast('Falha na geracao ('+fmt+'): '+e.message, true);
  }
}

/** Resumo executivo desenhado em canvas (equivale ao SummaryCard + view-shot) */
function renderSummaryCanvas(cb){
  var W=1240, H=760, c=document.createElement('canvas');
  c.width=W; c.height=H;
  var x=c.getContext('2d');
  var v=validation(), sum=v.summary, h=S.header;
  var accent = sum.errors?COLORS.err:sum.warnings?COLORS.warn:COLORS.ok;

  x.fillStyle='#0E1A2B'; x.fillRect(0,0,W,H);
  x.fillStyle=COLORS.pri; x.fillRect(0,0,W,14); x.fillRect(0,H-14,W,14);

  x.fillStyle=COLORS.pri; x.font='700 20px Roboto, Arial';
  x.fillText('LAUDO TECNICO · MAPEAMENTO DE CIRCUITOS ELETRICOS', 40, 72);

  x.fillStyle='#E6EDF3'; x.font='900 44px Roboto, Arial';
  var title = h.site || 'Instalacao nao identificada';
  while(x.measureText(title).width > W-80 && title.length>10) title = title.slice(0,-4)+'…';
  x.fillText(title, 40, 132);

  x.fillStyle='#9FB3C8'; x.font='500 22px Roboto, Arial';
  x.fillText([h.reportNumber,h.equipmentTag,h.location].filter(Boolean).join('   ·   '), 40, 172);

  function card(cx,cy,cw,ch,val,lab,col){
    x.fillStyle='#16263D'; x.fillRect(cx,cy,cw,ch);
    x.fillStyle=col||COLORS.pri; x.fillRect(cx,cy,8,ch);
    x.fillStyle=col||COLORS.pri; x.font='900 40px Roboto, Arial';
    x.fillText(String(val), cx+26, cy+56);
    x.fillStyle='#9FB3C8'; x.font='700 14px Roboto, Arial';
    x.fillText(String(lab).toUpperCase(), cx+26, cy+88);
  }
  var gap=14, n=5, cw=(W-80-gap*(n-1))/n;
  [[T.countAll(S.tree),'Itens'],[T.depth(S.tree),'Niveis'],[sum.panels,'Quadros'],
   [sum.circuits,'Circuitos'],[sum.totalKva,'kVA']]
    .forEach(function(m,i){ card(40+i*(cw+gap),210,cw,110,m[0],m[1]); });
  var cw2=(W-80-gap*3)/4;
  [[sum.errors,'Nao conformidades',COLORS.err],[sum.warnings,'Ressalvas',COLORS.warn],
   [sum.conform,'Itens conformes',COLORS.ok],[sum.conformityIndex+'%','Indice',accent]]
    .forEach(function(m,i){ card(40+i*(cw2+gap),340,cw2,110,m[0],m[1],m[2]); });

  x.strokeStyle=accent; x.lineWidth=5; x.strokeRect(40,480,W-80,86);
  x.fillStyle=accent; x.font='900 30px Roboto, Arial';
  x.textAlign='center'; x.fillText(sum.verdict, W/2, 534); x.textAlign='left';

  x.fillStyle='#6B829E'; x.font='500 19px Roboto, Arial';
  x.fillText([h.technician,h.technicianTitle,h.crea].filter(Boolean).join('  ·  '), 40, 620);
  x.fillText('Emitido em '+(h.issueDate||'—')+'   |   Circuit Mapper', 40, 652);
  cb(c);
}

function importJson(){
  var inp = document.createElement('input');
  inp.type='file'; inp.accept='.json,application/json';
  inp.onchange = function(){
    var f = inp.files && inp.files[0]; if(!f) return;
    var rd = new FileReader();
    rd.onload = function(){
      try{
        var d = JSON.parse(rd.result);
        if(d.schemaVersion > 1) throw new Error('Arquivo de versao mais recente (v'+d.schemaVersion+').');
        var clean = IMPVAL.validateImport(d); // valida estrutura, IDs, ciclo, sanitiza logos remotos
        mutate(function(){ return clean.tree; });
        if(clean.header) S.header = Object.assign(clone(EMPTY_HEADER), clean.header);
        setAllExpanded(true);
        toast('Projeto importado: '+T.countAll(S.tree)+' itens.');
      }catch(e){ toast('Erro na importacao: '+e.message, true); }
    };
    rd.readAsText(f);
  };
  inp.click();
}

/* =========================================================================
   SHELL
   ========================================================================= */
var TITLES = {
  projeto:['CIRCUIT MAPPER','Mapeamento e Cadastro de Circuitos Eletricos'],
  construcao:['MODO CONSTRUCAO',''],
  conformidade:['CONFORMIDADE','Checklist automatico ABNT NBR 5410'],
  laudo:['LAUDO','PDF · Word · Excel · Imagem · Backup'],
};
function go(tab){ S.tab = tab; if(tab==='laudo') laudoStep='header'; render(); }

function syncUndoButtons(){
  $('btnUndo').disabled = !S.past.length;
  $('btnRedo').disabled = !S.future.length;
}

function render(){
  var host = $('screen');
  clear(host);
  var t = TITLES[S.tab];
  $('scrTitle').textContent = t[0];
  $('scrSub').textContent = S.tab==='construcao'
    ? T.countAll(S.tree)+' itens · '+T.depth(S.tree)+' niveis · salvo localmente'
    : S.tab==='laudo'
      ? (laudoStep==='header' ? 'Cabecalho do documento tecnico' : t[1])
      : t[1];

  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function(b){
    b.className = 'tab' + (b.getAttribute('data-tab')===S.tab ? ' on' : '');
  });

  host.appendChild(
    S.tab==='projeto' ? screenProjeto()
    : S.tab==='construcao' ? screenConstrucao()
    : S.tab==='conformidade' ? screenConformidade()
    : screenLaudo()
  );
  syncUndoButtons();
}

function boot(){
  if(!load()) S.header = clone(EMPTY_HEADER);
  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function(b){
    on(b,'click',function(){ go(b.getAttribute('data-tab')); });
  });
  on($('btnUndo'),'click',undo);
  on($('btnRedo'),'click',redo);
  on($('shClose'),'click',closeSheet);
  on($('backdrop'),'click',closeSheet);
  window.addEventListener('keydown',function(e){
    if(e.key==='Escape' && !$('sheetHost').classList.contains('hidden')) closeSheet();
  });
  render();
  setTimeout(function(){ $('splash').className='hidden'; }, 450);
}

/* API exposta para o smoke test automatizado (jsdom) */
window.__VCM = {
  state: S, render: render, go: go, openAdd: openAdd, openEdit: openEdit,
  closeSheet: closeSheet, generate: generate, loadDemo: loadDemo,
  mutate: mutate, undo: undo, redo: redo, validation: validation,
  setAllExpanded: setAllExpanded, renderSummaryCanvas: renderSummaryCanvas,
  modules: { T:T, SCH:SCH, ENG:ENG, VAL:VAL, LT:LT, SEED:SEED, LAUDO:LAUDO,
             WBSPEC:WBSPEC, XLSX:XLSX, FN:FN },
};

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
else boot();

})();
