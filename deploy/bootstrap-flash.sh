#!/usr/bin/env bash
# Bootstrap one-shot: site Flash Report em falha-ti-lte.techartsolucoes.com.br
# Roda como root via: VPS_HOST=.. VPS_PASS=.. node tools/vpsExec.js deploy/bootstrap-flash.sh
set -e
echo "=== Flash Report TI/LTE bootstrap ==="
export DEBIAN_FRONTEND=noninteractive

mkdir -p /var/www/falha-ti-lte
echo "<!DOCTYPE html><html><head><meta charset=utf-8><title>Flash Report</title></head><body><h1>Flash Report TI/LTE — aguardando deploy</h1></body></html>" > /var/www/falha-ti-lte/index.html

if ! id flashdeploy >/dev/null 2>&1; then
  useradd -m -s /bin/bash flashdeploy
fi
chown -R flashdeploy:flashdeploy /var/www/falha-ti-lte
mkdir -p /home/flashdeploy/.ssh
chmod 700 /home/flashdeploy/.ssh

# Chave sera injetada pelo script de setup local (PLACEHOLDER_PUBKEY)
PUBKEY="__FLASH_DEPLOY_PUBKEY__"
RESTRICTED='command="rm -rf /var/www/falha-ti-lte/* && tar -xz -C /var/www/falha-ti-lte",no-pty,no-port-forwarding,no-X11-forwarding,no-agent-forwarding'
touch /home/flashdeploy/.ssh/authorized_keys
chmod 600 /home/flashdeploy/.ssh/authorized_keys
if [ "$PUBKEY" != "__FLASH_DEPLOY_PUBKEY__" ]; then
  grep -qF "flash-deploy@falha-ti-lte" /home/flashdeploy/.ssh/authorized_keys \
    || echo "$RESTRICTED $PUBKEY" >> /home/flashdeploy/.ssh/authorized_keys
fi
chown -R flashdeploy:flashdeploy /home/flashdeploy/.ssh

cat > /etc/nginx/sites-available/falha-ti-lte.conf <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name falha-ti-lte.techartsolucoes.com.br;

    root /var/www/falha-ti-lte;
    index FLASH-REPORT.html index.html;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location = / {
        try_files /FLASH-REPORT.html /index.html =404;
    }
    location / {
        try_files $uri $uri/ /FLASH-REPORT.html /index.html;
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
}
NGINX
ln -sf /etc/nginx/sites-available/falha-ti-lte.conf /etc/nginx/sites-enabled/falha-ti-lte.conf

nginx -t
systemctl reload nginx || systemctl restart nginx

if command -v certbot >/dev/null 2>&1; then
  certbot --nginx -d falha-ti-lte.techartsolucoes.com.br \
    --non-interactive --agree-tos --register-unsafely-without-email --redirect || true
  nginx -t && systemctl reload nginx
fi

echo "=== Bootstrap Flash Report OK ==="
echo "Site: https://falha-ti-lte.techartsolucoes.com.br/"
cat /home/flashdeploy/.ssh/authorized_keys
