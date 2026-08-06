# Setup Guide — SmartHire-AI

## Prerequisites

- JDK 21+
- Maven Wrapper (`backend/mvnw`) hoặc Maven 3.9+
- Node.js 20+ và npm
- Docker + Docker Compose
- Git

## 1. Clone & cấu hình môi trường

```bash
git clone <repo-url>
cd SmartHire-AI
cp backend/.env.example backend/.env   # nếu dùng
cp frontend/.env.example frontend/.env
```

### Biến môi trường Backend (gợi ý)

| Key | Ví dụ | Mô tả |
|---|---|---|
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_NAME` | `smarthire` | Database name |
| `DB_USER` | `smarthire` | User |
| `DB_PASSWORD` | `smarthire` | Password |
| `REDIS_HOST` | `localhost` | Redis |
| `REDIS_PORT` | `6379` | Redis port |
| `RABBITMQ_HOST` | `localhost` | RabbitMQ |
| `RABBITMQ_PORT` | `5672` | AMQP port |
| `RABBITMQ_USER` | `guest` | Local only |
| `RABBITMQ_PASSWORD` | `guest` | Local only |
| `JWT_SECRET` | _(random 256-bit)_ | Signing key |
| `GOOGLE_CLIENT_ID` | … | OAuth |
| `GOOGLE_CLIENT_SECRET` | … | OAuth |

### Biến môi trường Frontend

| Key | Ví dụ |
|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080/api/v1` |

## 2. Chạy infrastructure

```bash
docker compose up -d mysql redis rabbitmq
```

Services:

| Service | Port |
|---|---|
| MySQL | 3306 |
| Redis | 6379 |
| RabbitMQ AMQP | 5672 |
| RabbitMQ Management UI | 15672 |

## 3. Backend

```bash
cd backend
./mvnw flyway:info          # optional check
./mvnw spring-boot:run
```

- Health: `GET http://localhost:8080/actuator/health` (nếu bật actuator)
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

Flyway chạy migration khi app start (`classpath:db/migration`).

## 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Mở `http://localhost:5173`.

## 5. Chạy full stack bằng Compose (optional)

```bash
docker compose --profile apps up --build
```

## 6. Tests

```bash
# Backend
cd backend && ./mvnw test

# Frontend
cd frontend && npm run test
```

## 7. Postman

Import collection: `docs/api/SmartHire.postman_collection.json` (khi đã xuất từ Swagger).

## 8. SonarQube (optional)

Cấu hình trong GitHub Actions / local Sonar server. Không commit token Sonar vào repo.

## 9. Deploy — Google Cloud VPS (chính)

Xem hướng dẫn đầy đủ: **[GCP_VPS_DEPLOY.md](GCP_VPS_DEPLOY.md)**

Tóm tắt:

```bash
# Trên VM Ubuntu (Compute Engine)
sudo bash deploy/scripts/bootstrap-gcp-vps.sh
cp deploy/.env.production.example deploy/.env.production  # điền secrets
bash deploy/scripts/deploy.sh
DOMAIN=your.domain.com bash deploy/scripts/setup-tls.sh
```

File chính: `docker-compose.prod.yml`, `deploy/`, `.github/workflows/deploy-gcp.yml`.

### Phương án khác (optional)

- **Render / Railway:** managed PaaS + add-ons MySQL/Redis/CloudAMQP.
- **AWS EC2:** tương tự Docker Compose; siết Security Group 22/80/443.

## Troubleshooting

| Triệu chứng | Hướng xử lý |
|---|---|
| Flyway fail | Kiểm tra `DB_*`, xem `flyway_schema_history` |
| Redis connection | `docker compose ps redis` |
| RabbitMQ refused | Port 5672, user/pass; mở Management UI |
| CORS FE→BE | Cấu hình CORS trong `backend/.../config/CorsConfig` |
| Google Login | Redirect URI khớp Google Cloud Console |
