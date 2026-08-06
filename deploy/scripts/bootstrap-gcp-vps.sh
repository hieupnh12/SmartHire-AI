#!/usr/bin/env bash
# Bootstrap a fresh Google Cloud Compute Engine VM (Ubuntu 22.04/24.04)
# Run ONCE as a sudo-capable user:
#   curl -fsSL ... | bash
#   OR: bash deploy/scripts/bootstrap-gcp-vps.sh
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/smarthire}"
APP_USER="${APP_USER:-smarthire}"

echo "==> Updating apt packages"
sudo apt-get update -y
sudo apt-get upgrade -y

echo "==> Installing base packages"
sudo apt-get install -y \
  ca-certificates curl gnupg lsb-release \
  git ufw fail2ban nginx certbot python3-certbot-nginx \
  unzip jq

echo "==> Installing Docker Engine"
if ! command -v docker >/dev/null 2>&1; then
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

echo "==> Creating app user ${APP_USER}"
if ! id "${APP_USER}" >/dev/null 2>&1; then
  sudo useradd --create-home --shell /bin/bash "${APP_USER}"
fi
sudo usermod -aG docker "${APP_USER}"
sudo usermod -aG docker "${USER}"

echo "==> Creating deploy path ${DEPLOY_PATH}"
sudo mkdir -p "${DEPLOY_PATH}"
sudo mkdir -p /var/www/certbot
sudo chown -R "${APP_USER}:${APP_USER}" "${DEPLOY_PATH}"

echo "==> Configuring UFW (SSH + HTTP + HTTPS only)"
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable || true

echo "==> Enabling fail2ban"
sudo systemctl enable --now fail2ban

echo "==> Enabling nginx"
sudo systemctl enable --now nginx

echo "==> Bootstrap complete"
echo "Next:"
echo "  1. Clone repo into ${DEPLOY_PATH}"
echo "  2. cp deploy/.env.production.example deploy/.env.production && edit secrets"
echo "  3. bash deploy/scripts/deploy.sh"
echo "  4. Configure DNS A record → this VM external IP"
echo "  5. bash deploy/scripts/setup-tls.sh"
echo "Re-login (or newgrp docker) so docker group applies."
