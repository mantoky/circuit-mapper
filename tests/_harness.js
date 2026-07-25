/** Micro-harness de teste sem dependencias externas. */
let pass = 0, fail = 0;
const failures = [];

function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; return true; }
  fail++; failures.push(`${msg}\n    esperado: ${e}\n    obtido:   ${a}`);
  return false;
}
function ok(cond, msg) {
  if (cond) { pass++; return true; }
  fail++; failures.push(msg);
  return false;
}
function near(actual, expected, tol, msg) {
  const d = Math.abs(Number(actual) - Number(expected));
  if (d <= tol) { pass++; return true; }
  fail++; failures.push(`${msg} (esperado ~${expected}, obtido ${actual}, tol ${tol})`);
  return false;
}
function section(name) {
  console.log(`\n\x1b[33m── ${name} ──\x1b[0m`);
}
function report(title) {
  console.log(`\n${'═'.repeat(64)}`);
  if (failures.length) {
    console.log(`\x1b[31m✗ ${title}: ${fail} falha(s) de ${pass + fail} assercoes\x1b[0m`);
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  } else {
    console.log(`\x1b[32m✓ ${title}: ${pass}/${pass} assercoes aprovadas\x1b[0m`);
  }
  console.log('═'.repeat(64));
  // propaga a falha para o processo (consumido por run-all.js)
  if (fail > 0) process.exitCode = 1;
  return fail === 0;
}
module.exports = { eq, ok, near, section, report, stats: () => ({ pass, fail }) };
