/**
 * SUITE COMPLETA — npm test
 * Executa os tres blocos de teste em processos isolados e consolida o resultado.
 */
const { execFileSync } = require('child_process');
const path = require('path');

const suites = ['engine.test.js', 'flow.test.js', 'exports.test.js', 'safety.test.js', 'web.test.js'];
let failed = 0;

console.log('\n\x1b[43m\x1b[30m  CIRCUIT MAPPER — SUITE DE TESTES  \x1b[0m');

for (const s of suites) {
  console.log(`\n\x1b[1m▸ ${s}\x1b[0m`);
  if (s === 'web.test.js') {
    // depende do bundle web e do jsdom; nao trava a suite se faltarem
    const fs = require('fs');
    if (!fs.existsSync(path.join(__dirname, '..', 'dist', 'CIRCUIT-MAPPER.html'))) {
      console.log('  \x1b[33m(pulado: rode "npm run build:web" antes)\x1b[0m');
      continue;
    }
    let hasJsdom = false;
    for (const c of ['jsdom', '/tmp/node_modules/jsdom',
                     path.join(__dirname, '..', 'node_modules', 'jsdom')]) {
      try { require.resolve(c); hasJsdom = true; break; } catch (e) { /* segue */ }
    }
    if (!hasJsdom) { console.log('  \x1b[33m(pulado: rode "npm i -D jsdom")\x1b[0m'); continue; }
  }
  try {
    const out = execFileSync(process.execPath, [path.join(__dirname, s)], { encoding: 'utf8' });
    process.stdout.write(out);
  } catch (e) {
    process.stdout.write(e.stdout || '');
    process.stderr.write(e.stderr || '');
    failed++;
  }
}

console.log(`\n${'█'.repeat(64)}`);
if (failed) {
  console.log(`\x1b[31m RESULTADO: ${failed} suite(s) com falha \x1b[0m`);
  process.exit(1);
}
console.log('\x1b[32m RESULTADO: todas as suites aprovadas \x1b[0m');
console.log('█'.repeat(64) + '\n');
