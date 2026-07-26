#!/usr/bin/env bash
# Corrige formatacao do authorized_keys do root (preserva chave Hostinger + robso@Beth)
set -e
AK=/root/.ssh/authorized_keys
cp "$AK" "$AK.bak.$(date +%s)"
# Quebra a linha concatenada "hostinger...robso@Beth" em duas
sed -i 's/#hostinger-managed-keyssh-ed25519/\nssh-ed25519/' "$AK"
# Dedupa linhas identicas mantendo a ordem
awk '!seen[$0]++' "$AK" > "$AK.tmp" && mv "$AK.tmp" "$AK"
chmod 600 "$AK"
echo "=== authorized_keys do root (corrigido) ==="
nl -ba "$AK"
