# Google Cloud VPS (Compute Engine) — Deploy Guide

Hướng dẫn đưa SmartHire-AI lên **VM Compute Engine** (VPS) trên Google Cloud: Docker Compose production, Nginx TLS, firewall, backup, CI/CD.

## Kiến trúc trên VPS

```
Internet
   │
   ├─ GCP Firewall: 22, 80, 443
   │
   ▼
┌─────────────────────────────────────────────┐
│  Ubuntu VM (Compute Engine)                 │
│  ┌─────────────┐      ┌──────────────────┐  │
│  │ Host Nginx  │─────▶│ frontend:8080→80 │  │
│  │ Let's Encrypt│     │  (SPA + /api     │  │
│  │ :443 / :80  │      │   proxy→backend) │  │
│  └─────────────┘      └────────┬─────────┘  │
│                                │ Docker net │
│         mysql · redis · rabbitmq · backend  │
│         (không publish port ra Internet)    │
└─────────────────────────────────────────────┘
```

## Checklist máy ảo GCP

| Hạng mục | Gợi ý |
|---|---|
| Machine type | `e2-medium` (2 vCPU / 4GB) tối thiểu; `e2-standard-2` nếu AI workers nặng |
| Disk | 40–50 GB SSD |
| OS | Ubuntu 22.04 LTS hoặc 24.04 LTS |
| Region | gần user (vd. `asia-southeast1`) |
| Static IP | Reserve external IP + gắn VM |
| DNS | A record `DOMAIN` → static IP |

### Tạo VM nhanh (gcloud)

```bash
gcloud config set project YOUR_PROJECT_ID

gcloud compute addresses create smarthire-ip --region=asia-southeast1

gcloud compute instances create smarthire-vps \
  --zone=asia-southeast1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2404-lts-amd64 \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB \
  --boot-disk-type=pd-balanced \
  --address=smarthire-ip \
  --tags=smarthire-web \
  --metadata=enable-oslogin=TRUE
```

### Firewall GCP (VPC)

```bash
gcloud compute firewall-rules create smarthire-allow-web \
  --allow=tcp:80,tcp:443 \
  --target-tags=smarthire-web \
  --description="HTTP/HTTPS for SmartHire"

gcloud compute firewall-rules create smarthire-allow-ssh \
  --allow=tcp:22 \
  --target-tags=smarthire-web \
  --description="SSH"
```

**Không** mở 3306 / 6379 / 5672 / 15672 / 8080 ra `0.0.0.0/0`.

## Bước 1 — Bootstrap VPS

SSH vào VM:

```bash
gcloud compute ssh smarthire-vps --zone=asia-southeast1-a
# hoặc: ssh USER@EXTERNAL_IP
```

Clone repo (hoặc scp), rồi:

```bash
cd /path/to/SmartHire-AI
sudo bash deploy/scripts/bootstrap-gcp-vps.sh
# logout / newgrp docker
```

Script cài: Docker, Compose plugin, Nginx, Certbot, UFW (22/80/443), fail2ban, thư mục `/opt/smarthire`.

## Bước 2 — Đặt code & secrets

```bash
sudo mkdir -p /opt/smarthire
sudo chown "$USER:$USER" /opt/smarthire
git clone <YOUR_REPO_URL> /opt/smarthire
cd /opt/smarthire

cp deploy/.env.production.example deploy/.env.production
nano deploy/.env.production   # đổi toàn bộ CHANGE_ME_*
```

Tạo secret mạnh:

```bash
openssl rand -base64 48   # JWT_SECRET, passwords…
```

Cập nhật:

- `DOMAIN`, `PUBLIC_URL`, `CORS_ORIGINS`
- `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `REDIS_PASSWORD`, `RABBITMQ_*`
- `JWT_SECRET`, Google OAuth nếu dùng

`deploy/.env.production` **không** commit (đã ignore).

## Bước 3 — Deploy stack

```bash
chmod +x deploy/scripts/*.sh
bash deploy/scripts/deploy.sh
```

Kiểm tra:

```bash
docker compose -f docker-compose.prod.yml --env-file deploy/.env.production ps
curl -s http://127.0.0.1:8080/actuator/health
curl -s http://127.0.0.1:8080/   # frontend
```

## Bước 4 — DNS + TLS

1. Trỏ A record `DOMAIN` → static IP VM (đợi propagate).
2. Chạy:

```bash
DOMAIN=your.domain.com TLS_EMAIL=you@email.com bash deploy/scripts/setup-tls.sh
```

3. Mở `https://your.domain.com` — API cùng origin qua `/api/v1`.

Swagger (nếu bật): `https://your.domain.com/swagger-ui/index.html`

## Bước 5 — CI/CD (GitHub Actions)

Workflow: `.github/workflows/deploy-gcp.yml`

Tạo GitHub Secrets:

| Secret | Giá trị |
|---|---|
| `GCP_VPS_HOST` | IP hoặc domain |
| `GCP_VPS_USER` | user SSH có quyền docker |
| `GCP_VPS_SSH_KEY` | private key PEM |
| `GCP_VPS_DEPLOY_PATH` | `/opt/smarthire` (optional) |

Trên VPS, user deploy cần:

- Clone sẵn repo tại `DEPLOY_PATH`
- File `deploy/.env.production` sẵn
- Thuộc group `docker`
- Deploy key / read access `git pull`

Push `main` (đổi backend/frontend/deploy) hoặc **Actions → Deploy GCP VPS → Run workflow**.

## Backup & bảo trì

```bash
# Backup DB hàng ngày (cron)
sudo crontab -e
# 0 2 * * * /opt/smarthire/deploy/scripts/backup-mysql.sh >> /var/log/smarthire-backup.log 2>&1
```

Logs:

```bash
docker compose -f docker-compose.prod.yml --env-file deploy/.env.production logs -f backend
```

RabbitMQ Management (không public):

```bash
ssh -L 15672:127.0.0.1:15672 USER@VM_IP
# rồi mở http://localhost:15672 — cần map port tạm:
# docker compose ... port publish chỉ khi debug (không để production)
```

Để xem Management UI an toàn hơn, tạm thời:

```bash
docker compose -f docker-compose.prod.yml --env-file deploy/.env.production exec rabbitmq rabbitmq-diagnostics status
```

Hoặc thêm profile debug publish `127.0.0.1:15672:15672` khi cần.

## Update phiên bản thủ công

```bash
cd /opt/smarthire
git pull --ff-only
bash deploy/scripts/deploy.sh
```

## Rollback nhanh

```bash
git log --oneline -5
git checkout <previous-commit>
bash deploy/scripts/deploy.sh
```

Restore MySQL:

```bash
gunzip -c /var/backups/smarthire/smarthire_YYYYMMDD_HHMMSS.sql.gz \
  | docker exec -i smarthire-mysql mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"
```

## Bảo mật checklist

- [ ] Static IP + DNS + HTTPS
- [ ] GCP firewall chỉ 22/80/443
- [ ] UFW bật; fail2ban bật
- [ ] DB/Redis/RabbitMQ không expose public
- [ ] Secrets mạnh trong `.env.production`
- [ ] SSH key only (tắt password auth nếu có thể)
- [ ] Backup cron + kiểm tra restore
- [ ] (Tuỳ chọn) tắt Swagger: `SWAGGER_ENABLED=false`
- [ ] (Tuỳ chọn) Cloud Armor / IAP cho admin sau này

## File liên quan

| Path | Vai trò |
|---|---|
| `docker-compose.prod.yml` | Stack production |
| `deploy/.env.production.example` | Template secrets |
| `deploy/nginx/smarthire.conf` | Host Nginx + TLS |
| `deploy/scripts/bootstrap-gcp-vps.sh` | Cài đặt VM lần đầu |
| `deploy/scripts/deploy.sh` | Build & up |
| `deploy/scripts/setup-tls.sh` | Let's Encrypt |
| `deploy/scripts/backup-mysql.sh` | Backup DB |
| `.github/workflows/deploy-gcp.yml` | CD qua SSH |

## Ước lượng chi phí (tham khảo)

e2-medium + 50GB disk + static IP ~ vài chục USD/tháng tùy region/discount. Theo dõi Billing alerts trên GCP.
