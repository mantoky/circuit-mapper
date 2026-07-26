/**
 * vpsExec - executa um script shell na VPS via SSH usando senha (bootstrap one-shot).
 * Depois do bootstrap, deploys usam chave restrita (tools/deployVps.*), nao este helper.
 *
 * Uso: VPS_HOST=.. VPS_USER=.. VPS_PASS=.. node tools/vpsExec.js <arquivoScript>
 * Le o conteudo do arquivo e executa como um unico comando bash na VPS.
 */
const fs = require('fs');
const { Client } = require('ssh2');

const host = process.env.VPS_HOST;
const user = process.env.VPS_USER || 'root';
const pass = process.env.VPS_PASS;
const port = parseInt(process.env.VPS_PORT || '22', 10);
const scriptFile = process.argv[2];

if (!host || !pass || !scriptFile) {
  console.error('Uso: VPS_HOST=.. VPS_USER=.. VPS_PASS=.. node tools/vpsExec.js <script>');
  process.exit(2);
}

const script = fs.readFileSync(scriptFile, 'utf8');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('bash -s', (err, stream) => {
    if (err) { console.error('exec err:', err); conn.end(); process.exit(1); }
    let out = '', errOut = '';
    stream.on('close', (code) => {
      process.stdout.write(out);
      process.stderr.write(errOut);
      conn.end();
      process.exit(code === 0 ? 0 : 1);
    });
    stream.on('data', (d) => { out += d.toString(); });
    stream.stderr.on('data', (d) => { errOut += d.toString(); });
    stream.stdin.end(script);
  });
});
conn.on('error', (e) => { console.error('SSH error:', e.message); process.exit(1); });
conn.on('keyboard-interactive', (_name, _instr, _lang, _prompts, finish) => { finish([pass]); });

conn.connect({
  host, port, username: user,
  tryKeyboard: true,
  password: pass,
  readyTimeout: 30000,
  algorithms: { serverHostKey: ['ssh-ed25519', 'rsa-sha2-256', 'ecdsa-sha2-nistp256', 'ssh-rsa'] },
});
