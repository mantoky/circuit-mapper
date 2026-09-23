/** SMOKE TEST do Flash Report — carrega dist/FLASH-REPORT.html em DOM real. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const bundle = path.join(__dirname, '..', 'dist', 'FLASH-REPORT.html');
if (!fs.existsSync(bundle)) {
  console.log('(pulado: rode "npm run build:flash" antes)');
  process.exit(0);
}
const html = fs.readFileSync(bundle, 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
});

setTimeout(() => {
  try {
    const { document, __FLASH } = dom.window;
    // Splash some após o boot
    const splashHidden = document.getElementById('splash').className === 'hidden';
    console.log((splashHidden ? '✓' : '✗') + ' splash some após o boot');
    if (!splashHidden) process.exitCode = 1;

    // API exposta
    console.log((__FLASH ? '✓' : '✗') + ' window.__FLASH exposta');
    if (!__FLASH) { process.exitCode = 1; return; }

    // Exemplo pré-carregado (primeira execução usa o sample)
    const msg = __FLASH.modules.F.buildMessage(__FLASH.state.report);
    const checks = [
      ['cabeçalho operacional', msg.indexOf('📢 FLASH REPORT | INFORMATIVO - GER TECN ATEND PA') === 0],
      ['título do exemplo', msg.indexOf('*FALHA NO SERVIDOR DE IMPRESSÃO*') >= 0],
      ['locais do exemplo', msg.indexOf('Serra Leste, Serra Norte e Serra Sul') >= 0],
    ];
    checks.forEach(([n, ok]) => {
      console.log((ok ? '✓' : '✗') + ' mensagem: ' + n);
      if (!ok) process.exitCode = 1;
    });

    // NavegaçãoEditar -> Prévia -> Histórico
    __FLASH.go('previa');
    const hasCard = !!document.getElementById('flashCard');
    console.log((hasCard ? '✓' : '✗') + ' prévia renderiza o cartão');
    if (!hasCard) process.exitCode = 1;
    const hasMsg = (document.querySelector('.msg-box') || { textContent: '' }).textContent.indexOf('FLASH REPORT') >= 0;
    console.log((hasMsg ? '✓' : '✗') + ' prévia mostra texto WhatsApp');
    if (!hasMsg) process.exitCode = 1;

    __FLASH.saveToHistory();
    const n = __FLASH.state.history.length;
    console.log((n === 1 ? '✓' : '✗') + ' salvar no histórico (' + n + ')');
    if (n !== 1) process.exitCode = 1;

    __FLASH.go('historico');
    const items = document.querySelectorAll('.hist').length;
    console.log((items === 1 ? '✓' : '✗') + ' histórico lista 1 item');
    if (items !== 1) process.exitCode = 1;

    // Novo relatório em branco
    __FLASH.go('editar');
    console.log('✓ fluxo editar → prévia → histórico OK');
  } catch (e) {
    console.error('✗ exceção no smoke test:', e && e.message);
    process.exitCode = 1;
  }
}, 900);
