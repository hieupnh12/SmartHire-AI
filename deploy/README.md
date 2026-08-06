# Deploy toolkit

Production deploy lên **Google Cloud Compute Engine (VPS)**.

| Path | Mô tả |
|---|---|
| `.env.production.example` | Template biến môi trường (copy → `.env.production`) |
| `nginx/smarthire.conf` | Nginx host + TLS |
| `scripts/bootstrap-gcp-vps.sh` | Cài Docker, Nginx, UFW trên VM mới |
| `scripts/deploy.sh` | `docker compose` build & up |
| `scripts/setup-tls.sh` | Certbot Let's Encrypt |
| `scripts/backup-mysql.sh` | Dump MySQL định kỳ |

Hướng dẫn đầy đủ: [docs/setup/GCP_VPS_DEPLOY.md](../docs/setup/GCP_VPS_DEPLOY.md)

Khi lên server
Tạo VM Ubuntu + static IP + firewall 22/80/443 (lệnh gcloud trong doc)
bash deploy/scripts/bootstrap-gcp-vps.sh
Clone repo → copy & điền deploy/.env.production
bash deploy/scripts/deploy.sh
Trỏ DNS → bash deploy/scripts/setup-tls.sh
(Tuỳ chọn) Thêm GitHub Secrets GCP_VPS_HOST / USER / SSH_KEY để CD
Chi tiết từng bước: docs/setup/GCP_VPS_DEPLOY.md