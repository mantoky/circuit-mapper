#!/usr/bin/env bash
# Deploy Flash Report standalone → falha-ti-lte.techartsolucoes.com.br
# Nao toca em circuit-mapper.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f dist-flash/FLASH-REPORT.html ] || { echo "Bundle ausente. Rode: node tools/bundleFlashReport.js"; exit 1; }

HOST="${VPS_HOST:-187.127.28.74}"
USER_NAME="${FLASH_VPS_USER:-flashdeploy}"
PORT="${VPS_PORT:-22}"

echo "Deploy Flash Report → https://falha-ti-lte.techartsolucoes.com.br/ ..."

if [ -f deploy/.vps/flash-config ]; then
  tar -czf - -C dist-flash . | ssh -F deploy/.vps/flash-config -o StrictHostKeyChecking=accept-new falha-ti-lte-vps
elif [ -n "${FLASH_DEPLOY_SSH_KEY:-}" ]; then
  KEYDIR="$(mktemp -d)"
  trap 'rm -rf "$KEYDIR"' EXIT
  KEYFILE="$KEYDIR/deploy_key"
  printf '%s\n' "$FLASH_DEPLOY_SSH_KEY" > "$KEYFILE"
  if grep -q '\\n' "$KEYFILE"; then
    python3 - "$KEYFILE" <<'PY'
import sys
p = sys.argv[1]
open(p, 'w').write(open(p).read().replace('\\n', '\n'))
PY
  fi
  chmod 600 "$KEYFILE"
  [ -n "$(tail -c1 "$KEYFILE")" ] && echo >> "$KEYFILE"
  tar -czf - -C dist-flash . | ssh -i "$KEYFILE" -p "$PORT" \
    -o IdentitiesOnly=yes \
    -o StrictHostKeyChecking=accept-new \
    "${USER_NAME}@${HOST}"
else
  echo "Sem credenciais."
  echo "Defina FLASH_DEPLOY_SSH_KEY ou deploy/.vps/flash-config"
  echo "Primeira vez: VPS_PASS=... bash tools/setupFlashVps.sh"
  exit 2
fi

echo "[OK] https://falha-ti-lte.techartsolucoes.com.br/"
