/** npm test — gera o bundle web e executa todas as suites. */
const { execFileSync } = require('child_process');
const path = require('path');
const run = (f, cwd) => execFileSync(process.execPath, [f], { encoding: 'utf8', cwd, stdio: 'inherit' });
run(path.join(__dirname, '..', 'tools', 'bundleWeb.js'));
run(path.join(__dirname, 'run-all.js'));
