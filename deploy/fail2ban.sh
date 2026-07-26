#!/usr/bin/env bash
# Instala fail2ban e cria jail para SSH (blindagem contra brute-force de senha).
# Voce continua entrando com sua senha normalmente; so robos sao banidos.
set -e
echo "=== fail2ban: blindagem SSH ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq fail2ban >/dev/null

# Jail local (nao sobrescreve pacote)
cat > /etc/fail2ban/jail.local <<'JAIL'
[DEFAULT]
# Bane por 1 hora apos 5 tentativas falhas
bantime  = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port    = 22
JAIL

systemctl enable fail2ban >/dev/null 2>&1 || true
systemctl restart fail2ban
sleep 2

echo "=== Status fail2ban ==="
systemctl is-active fail2ban
echo "--- Jails ativas ---"
fail2ban-client status 2>/dev/null || true
echo "--- Detalhe sshd ---"
fail2ban-client status sshd 2>/dev/null || true
echo "=== Blindagem OK ==="
