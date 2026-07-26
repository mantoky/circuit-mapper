#!/usr/bin/env bash
# Deploy VPS — Circuit Mapper (Linux/macOS/Git-Bash)
# Empacota dist/ em tar e envia via SSH. A chave da VPS so aceita desempacotar no web root.
set -e
cd "$(dirname "$0")/.."
[ -f dist/CIRCUIT-MAPPER.html ] || { echo "Bundle ausente. Rode 'npm run build:web' antes."; exit 1; }
echo "Enviando bundle para a VPS (circuit-mapper.techartsolucoes.com.br)..."
tar -czf - -C dist . | ssh -F deploy/.vps/config -o StrictHostKeyChecking=accept-new circuit-mapper-vps
echo "[OK] Deploy concluido."
