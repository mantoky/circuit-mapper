#!/usr/bin/env bash
# Emite certificado Let's Encrypt e configura HTTPS + redirect automatico.
set -e
echo "=== Certbot HTTPS ==="
certbot --nginx -d circuit-mapper.techartsolucoes.com.br \
  --non-interactive --agree-tos --register-unsafely-without-email --redirect
echo "=== nginx -t apos certbot ==="
nginx -t
systemctl reload nginx
echo "=== Status certbot ==="
certbot certificates --non-interactive 2>/dev/null | grep -E "Domains|Certificate Path|Expiry" || true
echo "=== HTTPS OK ==="
