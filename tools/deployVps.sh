#!/usr/bin/env bash
# Deploy VPS — Circuit Mapper (Linux/macOS/Git-Bash / Cloud Agent)
# Empacota dist/ em tar e envia via SSH. A chave da VPS so aceita desempacotar no web root.
#
# Fontes de autenticacao (primeira que existir):
#   1. deploy/.vps/config  (alias circuit-mapper-vps)
#   2. env VPS_DEPLOY_SSH_KEY (+ VPS_HOST opcional, default 187.127.28.74)
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f dist/CIRCUIT-MAPPER.html ] || { echo "Bundle ausente. Rode 'npm run build:web' antes."; exit 1; }

HOST="${VPS_HOST:-187.127.28.74}"
USER_NAME="${VPS_USER:-cmdeploy}"
PORT="${VPS_PORT:-22}"

echo "Enviando bundle para a VPS (circuit-mapper.techartsolucoes.com.br)..."

if [ -f deploy/.vps/config ]; then
  tar -czf - -C dist . | ssh -F deploy/.vps/config -o StrictHostKeyChecking=accept-new circuit-mapper-vps
elif [ -n "${VPS_DEPLOY_SSH_KEY:-}" ]; then
  KEYDIR="$(mktemp -d)"
  trap 'rm -rf "$KEYDIR"' EXIT
  KEYFILE="$KEYDIR/deploy_key"
  printf '%s\n' "$VPS_DEPLOY_SSH_KEY" > "$KEYFILE"
  # Aceita chave colada com \n literais
  if grep -q '\\n' "$KEYFILE"; then
    python3 - "$KEYFILE" <<'PY'
import sys
p = sys.argv[1]
open(p, 'w').write(open(p).read().replace('\\n', '\n'))
PY
  fi
  chmod 600 "$KEYFILE"
  # Garante newline final (OpenSSH exige)
  [ -n "$(tail -c1 "$KEYFILE")" ] && echo >> "$KEYFILE"
  tar -czf - -C dist . | ssh -i "$KEYFILE" -p "$PORT" \
    -o IdentitiesOnly=yes \
    -o StrictHostKeyChecking=accept-new \
    "${USER_NAME}@${HOST}"
else
  echo "Sem credenciais de deploy."
  echo "Defina VPS_DEPLOY_SSH_KEY (chave privada cmdeploy) ou preencha deploy/.vps/config."
  echo "Alternativa: VPS_PASS + VPS_HOST para bootstrap via tools/vpsExec.js."
  exit 2
fi

echo "[OK] Deploy concluido: https://circuit-mapper.techartsolucoes.com.br/"
