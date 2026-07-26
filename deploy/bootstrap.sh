#!/usr/bin/env bash
# Bootstrap one-shot na VPS (como root, via senha).
# - Instala nginx + certbot
# - Cria web root /var/www/circuit-mapper
# - Cria usuario cmdeploy com chave RESTRITA do Cursor (so desempacota o bundle)
# - Instala chave do usuario (robso@Beth) no root (acesso admin)
# - Configura nginx HTTP (certbot adiciona SSL depois)
set -e

echo "=== Circuit Mapper bootstrap ==="
export DEBIAN_FRONTEND=noninteractive

# 1. Pacotes
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx >/dev/null

# 2. Web root
mkdir -p /var/www/circuit-mapper
echo "<!DOCTYPE html><html><head><meta charset=utf-8><title>Circuit Mapper</title></head><body><h1>Circuit Mapper - aguardando deploy</h1></body></html>" > /var/www/circuit-mapper/index.html

# 3. Usuario de deploy restrito
if ! id cmdeploy >/dev/null 2>&1; then
  useradd -m -s /bin/bash cmdeploy
fi
chown -R cmdeploy:cmdeploy /var/www/circuit-mapper
mkdir -p /home/cmdeploy/.ssh
chmod 700 /home/cmdeploy/.ssh

# 4. Chave RESTRITA do Cursor (so desempacota o bundle no web root)
CURSOR_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICURVqX7mEWDDS3/loW0HyirTZAGpD8aX6lZ1MWnignP cursor-deploy@circuit-mapper"
RESTRICTED='command="rm -rf /var/www/circuit-mapper/* && tar -xz -C /var/www/circuit-mapper",no-pty,no-port-forwarding,no-X11-forwarding,no-agent-forwarding'
touch /home/cmdeploy/.ssh/authorized_keys
chmod 600 /home/cmdeploy/.ssh/authorized_keys
grep -qF "cursor-deploy@circuit-mapper" /home/cmdeploy/.ssh/authorized_keys || echo "$RESTRICTED $CURSOR_KEY" >> /home/cmdeploy/.ssh/authorized_keys
chown -R cmdeploy:cmdeploy /home/cmdeploy/.ssh

# 5. Chave do usuario (robso@Beth) no root (acesso admin por chave)
ROBSO_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKaSxLiKfzolYw9WyQSTI0ebiOUmVJWuD+SWoZ1Tn9HR robso@Beth"
mkdir -p /root/.ssh
chmod 700 /root/.ssh
touch /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
grep -qF "robso@Beth" /root/.ssh/authorized_keys || echo "$ROBSO_KEY" >> /root/.ssh/authorized_keys

# 6. Nginx (HTTP primeiro; certbot adiciona SSL)
cat > /etc/nginx/sites-available/circuit-mapper.conf <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name circuit-mapper.techartsolucoes.com.br;

    root /var/www/circuit-mapper;
    index CIRCUIT-MAPPER.html;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=(self)" always;

    location = / {
        try_files /CIRCUIT-MAPPER.html =404;
    }
    location / {
        try_files $uri $uri/ /CIRCUIT-MAPPER.html;
    }
    location = /sw.js {
        add_header Cache-Control "public, max-age=0, must-revalidate" always;
        add_header Service-Worker-Allowed "/" always;
        default_type application/javascript;
    }
    location = /manifest.webmanifest {
        add_header Cache-Control "public, max-age=3600" always;
        default_type application/manifest+json;
    }
    location ~* \.(png|ico|svg)$ {
        add_header Cache-Control "public, max-age=604800" always;
    }
    location = /CIRCUIT-MAPPER.html {
        add_header Cache-Control "public, max-age=0, must-revalidate" always;
    }

    gzip on;
    gzip_types text/css application/javascript application/manifest+json image/svg+xml;
    gzip_vary on;
}
NGINX
ln -sf /etc/nginx/sites-available/circuit-mapper.conf /etc/nginx/sites-enabled/circuit-mapper.conf
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx || systemctl restart nginx

echo "=== Bootstrap OK ==="
echo "cmdeploy authorized_keys:"
cat /home/cmdeploy/.ssh/authorized_keys
echo "root authorized_keys (robso):"
cat /root/.ssh/authorized_keys
