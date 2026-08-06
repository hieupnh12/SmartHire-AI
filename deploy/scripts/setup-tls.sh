#!/usr/bin/env bash
# Issue Let's Encrypt cert and install host Nginx site
# Prerequisites: DOMAIN DNS A record points to this VM; ports 80/443 open in GCP firewall + UFW
# Usage:
#   DOMAIN=example.com bash deploy/scripts/setup-tls.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT_DIR}/deploy/.env.production}"

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "${ENV_FILE}"
  set +a
fi

DOMAIN="${DOMAIN:?Set DOMAIN env or in deploy/.env.production}"
EMAIL="${TLS_EMAIL:-admin@${DOMAIN}}"

echo "==> Preparing nginx site for ${DOMAIN}"
sudo mkdir -p /var/www/certbot
TMP_CONF="$(mktemp)"
sed "s/DOMAIN/${DOMAIN}/g" "${ROOT_DIR}/deploy/nginx/smarthire.conf" > "${TMP_CONF}"

# First boot without SSL block — certbot --nginx can manage SSL; we use certonly + final conf
sudo tee /etc/nginx/sites-available/smarthire >/dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 20m;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/smarthire /etc/nginx/sites-enabled/smarthire
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "==> Requesting certificate"
sudo certbot certonly --webroot -w /var/www/certbot \
  -d "${DOMAIN}" \
  --email "${EMAIL}" \
  --agree-tos \
  --non-interactive \
  --keep-until-expiry

echo "==> Installing TLS nginx config"
sudo cp "${TMP_CONF}" /etc/nginx/sites-available/smarthire
rm -f "${TMP_CONF}"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Enabling certbot renew timer"
sudo systemctl enable --now certbot.timer || true

echo "TLS ready: https://${DOMAIN}"
