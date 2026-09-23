#!/usr/bin/env bash
# Primeira vez: gera chave, bootstrap nginx/certbot e publica o bundle.
# Uso: VPS_PASS='...' bash tools/setupFlashVps.sh
set -euo pipefail
cd "$(dirname "$0")/.."

HOST="${VPS_HOST:-187.127.28.74}"
PASS="${VPS_PASS:-}"
[ -n "$PASS" ] || { echo "Defina VPS_PASS (senha root da VPS)."; exit 2; }

mkdir -p deploy/.vps
KEY=deploy/.vps/flash_deploy_ed25519
if [ ! -f "$KEY" ]; then
  ssh-keygen -t ed25519 -f "$KEY" -N '' -C 'flash-deploy@falha-ti-lte'
fi
PUB=$(cat "${KEY}.pub")

# Injeta pubkey no bootstrap
BOOT=$(mktemp)
sed "s|__FLASH_DEPLOY_PUBKEY__|$PUB|" deploy/bootstrap-flash.sh > "$BOOT"

echo "=== Bootstrap na VPS ($HOST) ==="
VPS_HOST="$HOST" VPS_USER=root VPS_PASS="$PASS" node tools/vpsExec.js "$BOOT"
rm -f "$BOOT"

cat > deploy/.vps/flash-config <<EOF
Host falha-ti-lte-vps
  HostName $HOST
  User flashdeploy
  IdentityFile $(pwd)/deploy/.vps/flash_deploy_ed25519
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
EOF

echo "=== Build + deploy ==="
node tools/bundleFlashReport.js
FLASH_DEPLOY_SSH_KEY="$(cat "$KEY")" bash tools/deployFlashVps.sh

echo "=== Pronto ==="
echo "https://falha-ti-lte.techartsolucoes.com.br/"
