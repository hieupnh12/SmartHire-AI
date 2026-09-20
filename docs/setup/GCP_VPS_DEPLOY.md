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
| DNS | A record `smarthire.top` → static IP |

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

PostgreSQL được publish trên cổng `5432` của VPS. Chỉ cho phép IP quản trị tin cậy truy cập cổng này; không mở `5432` cho `0.0.0.0/0`:

```bash
gcloud compute firewall-rules create smarthire-allow-postgres-admin \
  --allow=tcp:5432 \
  --source-ranges=YOUR_PUBLIC_IP/32 \
  --target-tags=smarthire-web \
  --description="PostgreSQL access from trusted admin IP"

# Chạy trên VPS nếu UFW đang bật
sudo ufw allow from YOUR_PUBLIC_IP to any port 5432 proto tcp
```

**Không** mở 3306 / 6379 / 5672 / 15672 / 8080 ra `0.0.0.0/0`.

## Bước 1 — Bootstrap VPS

SSH vào VM:

```bash
gcloud compute ssh smarthire-vps --zone=asia-southeast1-a
# hoặc: ssh USER@EXTERNAL_IP
```

Tải bộ manifest deploy lần đầu (không cần clone source), rồi chạy script bootstrap:

```bash
sudo bash deploy/scripts/bootstrap-gcp-vps.sh
# logout / newgrp docker
```

Script cài: Docker, Compose plugin, Nginx, Certbot, UFW (22/80/443), fail2ban, thư mục `/opt/smarthire`.

## Bước 2 — Đặt manifest & secrets

```bash
sudo mkdir -p /opt/smarthire
sudo chown "$USER:$USER" /opt/smarthire
cd /opt/smarthire

cp deploy/.env.production.example deploy/.env.production
nano deploy/.env.production   # đổi toàn bộ CHANGE_ME_*
```

Tạo secret mạnh:

```bash
openssl rand -base64 48   # JWT_SECRET, passwords…
```

Cập nhật:

- `DOMAIN=smarthire.top`, `PUBLIC_URL=https://smarthire.top`, `CORS_ORIGINS=https://smarthire.top`
- `MASTER_DB_PASSWORD`, `TENANT_PROVISIONING_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `REDIS_PASSWORD`, `RABBITMQ_*`
- `JWT_SECRET`, Google OAuth nếu dùng

`deploy/.env.production` **không** commit (đã ignore).

## Bước 3 — Deploy stack

PostgreSQL và MySQL dùng cố định hai Docker volume external `smarthire-postgres-data` và `smarthire-mysql-data`. Các volume này phải tồn tại trước khi deploy; Compose sẽ dừng thay vì tự tạo volume database rỗng. Việc recreate container hoặc chạy lại GitHub Actions vẫn gắn lại các volume này; không dùng `docker compose down -v` hoặc `docker volume prune` trên VPS production.

Image database phải giữ tương thích với data directory hiện hữu: PostgreSQL `17.11` và MySQL `8.4.11`. Không hạ PostgreSQL xuống major version thấp hơn khi dùng lại volume cũ.

Host Nginx chuyển frontend tới `127.0.0.1:8080` và API tới `127.0.0.1:8081`. Hai cổng này chỉ bind loopback trên VPS; backend vẫn lắng nghe cổng `8080` bên trong container.

```bash
chmod +x deploy/scripts/*.sh
IMAGE_TAG=latest bash deploy/scripts/deploy.sh
```

Kiểm tra:

```bash
docker compose -f docker-compose.prod.yml --env-file deploy/.env.production ps
curl -s http://127.0.0.1:8080/actuator/health
curl -s http://127.0.0.1:8080/   # frontend
```

## Bước 4 — DNS + TLS

1. Trỏ A record `smarthire.top` → static IP VM (đợi propagate).
2. Chạy:

```bash
DOMAIN=smarthire.top TLS_EMAIL=you@email.com bash deploy/scripts/setup-tls.sh
```

3. Mở `https://smarthire.top` — API cùng origin qua `/api/v1`.

Swagger (nếu bật): `https://smarthire.top/swagger-ui/index.html`

## Bước 5 — CI/CD (GitHub Actions)

Workflow: `.github/workflows/deploy-gcp.yml`

Tạo GitHub Secrets:

| Secret | Giá trị |
|---|---|
| `GCP_VPS_HOST` | IP hoặc domain |
| `GCP_VPS_USER` | user SSH có quyền docker |
| `GCP_VPS_SSH_KEY` | private key PEM |
| `GCP_VPS_DEPLOY_PATH` | `/opt/smarthire` (optional) |
| `DOCKERHUB_USERNAME` | `hieupnh12` |
| `DOCKERHUB_TOKEN` | Docker Hub access token có quyền Read & Write |

Trên VPS, user deploy cần:

- Có thư mục `DEPLOY_PATH`; workflow tự tải manifest deploy qua SCP
- File `deploy/.env.production` sẵn
- Thuộc group `docker`
- Có quyền ghi vào `DEPLOY_PATH`

Push nhánh `production` hoặc **Actions → Build images and deploy VPS → Run workflow**. GitHub Actions build hai image, push lên Docker Hub bằng tag commit SHA và `latest`, tải manifest qua SCP, rồi yêu cầu VPS pull đúng tag SHA. VPS không clone/pull source và không build ứng dụng.

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

## Deploy phiên bản thủ công

```bash
cd /opt/smarthire
echo "$DOCKERHUB_TOKEN" | docker login -u hieupnh12 --password-stdin
IMAGE_TAG=<commit-sha-or-latest> bash deploy/scripts/deploy.sh
```

## Rollback nhanh

```bash
# Dùng SHA của image đã push thành công trước đó lên Docker Hub
IMAGE_TAG=<previous-commit-sha> bash deploy/scripts/deploy.sh
```

Restore MySQL:

```bash
gunzip -c /var/backups/smarthire/mysql_YYYYMMDD_HHMMSS.sql.gz \
  | docker exec -i smarthire-mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot'
```

## Bảo mật checklist

- [ ] Static IP + DNS + HTTPS
- [ ] GCP firewall mở 22/80/443; cổng 5432 chỉ cho IP quản trị tin cậy
- [ ] UFW bật; fail2ban bật
- [ ] MySQL/Redis/RabbitMQ không expose public
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

## PostgreSQL master và MySQL theo tenant

Stack chạy PostgreSQL 16 cho master, MySQL 8.4 chứa các database tenant, Redis, RabbitMQ, backend và frontend. Database production chỉ mở trong mạng Docker; một tenant không cần một VPS riêng.

### Cấu hình và khởi động mới

1. Sao chép `deploy/.env.production.example` thành `deploy/.env.production`.
2. Điền `MASTER_DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`, JWT và credential Redis/RabbitMQ.
3. Tạo `TENANT_PROVISIONING_PASSWORD` bằng `openssl rand -hex 24`.
4. Tạo `TENANT_CREDENTIALS_KEY` bằng `openssl rand -base64 32`. Giữ khóa ổn định và backup riêng; mất khóa sẽ không giải mã được credential tenant trong registry.
5. Lần đầu, đặt `BOOTSTRAP_ADMIN_ENABLED=true` và cung cấp email/password riêng cho Workspace Admin.
6. Đăng nhập Docker Hub, sau đó chạy `IMAGE_TAG=latest bash deploy/scripts/deploy.sh`; CI/CD dùng tag commit SHA thay cho `latest`.
7. Đăng nhập `/admin/login` và tạo tenant. Sau bootstrap, tắt cờ bootstrap và bỏ password bootstrap khỏi env.

`.env` không chứa URL/password của từng tenant. Registry PostgreSQL lưu thông tin kết nối và ciphertext. Spring Boot không tự đọc file `.env`; khi chạy trực tiếp cần export biến qua shell/IDE, còn Compose dùng `--env-file`.

Local: sao chép `backend/.env.example` thành `backend/.env`, điền secret rồi chạy `docker compose --env-file backend/.env --profile apps up -d --build`.

Script `deploy/mysql/init-provisioner.sh` chỉ chạy khi MySQL volume mới. Với volume đã có dữ liệu, chạy script bằng tài khoản quản trị sau khi cấp biến môi trường; không xóa volume để chạy lại init. Provisioner có quyền tạo user toàn cục và quản lý DB theo prefix `smarthire_tenant_`; pool tenant chỉ dùng tài khoản riêng.

### Dữ liệu hiện hữu

Migration master mới dành cho PostgreSQL mới. Không chạy migration này vào MySQL master cũ và không sửa checksum để ép chạy. Việc chuyển dữ liệu master cũ cần một đợt migration riêng, giữ ID/quan hệ và mã hóa lại credential bằng cùng khóa AES-GCM.

Nếu DB tenant hiện hữu có bảng nhưng chưa có Flyway history, hãy kiểm tra schema và baseline thủ công đúng phiên bản. Backend cố ý không tự baseline database không rõ cấu trúc.

### Subdomain và nhiều máy

Đặt `TENANT_BASE_DOMAIN` trùng domain triển khai. DNS và TLS phải bao phủ từng subdomain hoặc wildcard. Cấu hình Nginx mẫu phục vụ domain chính; bổ sung wildcard `server_name` và chứng chỉ trước khi dùng subdomain production.

Khi MySQL ở VPS khác, dùng IP/DNS mạng riêng. `TENANT_MYSQL_BASE_URL` áp dụng cho tenant tự động tạo mới; tenant đã tồn tại tiếp tục dùng URL trong registry. Khi chuyển DB tenant, phải chuyển dữ liệu, cập nhật registry và thu hồi pool.

### Backup và khôi phục

Chạy cả `deploy/scripts/backup-postgres.sh` và `deploy/scripts/backup-mysql.sh`, rồi lưu bản sao ngoài VPS. Giữ master dump, MySQL dump và khóa mã hóa cùng một đợt backup. Tạm dừng onboarding khi lấy backup phối hợp và kiểm tra restore ở môi trường tách biệt.

### Kiểm thử trước deploy

- `mvn test` cần Docker và JDK 21; test tự tạo PostgreSQL/MySQL container, không dùng database production.
- `npm run build` xác minh TypeScript và frontend.
- Giới hạn connection mỗi backend process xấp xỉ `TENANT_MAX_POOLS × TENANT_DB_POOL_SIZE`, cộng pool master và connection provisioning.
