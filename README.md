# SmartHire-AI

[![CI](https://github.com/hieupnh12/SmartHire-AI/actions/workflows/ci.yml/badge.svg)](https://github.com/hieupnh12/SmartHire-AI/actions/workflows/ci.yml)
[![Build images and deploy VPS](https://github.com/hieupnh12/SmartHire-AI/actions/workflows/deploy-gcp.yml/badge.svg)](https://github.com/hieupnh12/SmartHire-AI/actions/workflows/deploy-gcp.yml)

Nền tảng tuyển dụng SaaS đa tenant tích hợp AI, hỗ trợ doanh nghiệp quản lý toàn bộ hành trình từ đăng tin, tiếp nhận và sàng lọc CV đến đánh giá kỹ thuật, phỏng vấn, xếp hạng ứng viên và phân tích tuyển dụng.

## Điểm nổi bật

- **SaaS multi-tenant:** Master DB quản lý nền tảng; mỗi doanh nghiệp sử dụng một MySQL database riêng để cô lập dữ liệu.
- **Quản lý tuyển dụng:** Job, pipeline, applicant, lịch phỏng vấn và thông báo theo thời gian thực.
- **AI CV screening:** Parse CV, trích xuất thông tin, phân tích kỹ năng và tính điểm phù hợp.
- **Assessment và AI Interview:** Ngân hàng câu hỏi, bài kiểm tra, chấm điểm, phỏng vấn AI và phản hồi.
- **Matching & Ranking:** Tổng hợp CV, kinh nghiệm, assessment và interview để xếp hạng ứng viên.
- **Master Portal:** Quản lý tenant, subscription, billing, hợp đồng và vận hành nền tảng.
- **Đa ngôn ngữ:** Tiếng Việt, English và 日本語.

## Kiến trúc tổng quan

```text
Client / Tenant subdomain
          │
       Nginx
          │
   React 19 + Vite
          │ REST / WebSocket
   Spring Boot 3.3 + Java 21
      ┌───┼───────────────┐
      │   │               │
 PostgreSQL          MySQL databases
  Master DB          one per tenant
      │                   │
    Redis          RabbitMQ workers
```

Chi tiết kiến trúc: [docs/architecture/OVERVIEW.md](docs/architecture/OVERVIEW.md).

## Tech stack

| Layer | Công nghệ |
|---|---|
| Backend | Java 21, Spring Boot 3.3, Spring Security, Hibernate, Flyway, MapStruct |
| Master database | PostgreSQL |
| Tenant databases | MySQL 8.4, separate database per tenant, HikariCP pool per tenant |
| Async & realtime | RabbitMQ, Redis, WebSocket |
| Frontend | React 19, TypeScript, Vite, React Router, TanStack Query, Zustand |
| UI & forms | Tailwind CSS, React Hook Form, Zod, Lucide Icons, Recharts |
| API | REST, Axios, springdoc-openapi / Swagger UI |
| Testing | JUnit 5, Mockito, Spring Boot Test, TypeScript build |
| DevOps | Docker Compose, Nginx, GitHub Actions, Google Cloud VPS |

## Cấu trúc repository

```text
SmartHire-AI/
├── backend/                  # Spring Boot API, migrations và tests
├── frontend/                 # React SPA
├── docs/
│   ├── architecture/         # Kiến trúc và hạ tầng
│   ├── database/             # ERD, data dictionary và migration index
│   ├── features/             # Đặc tả 42 feature thuộc 11 nhóm nghiệp vụ
│   └── setup/                # Hướng dẫn local và production
├── deploy/                   # Nginx, scripts và production templates
├── .github/workflows/        # CI và deploy GCP VPS
├── docker-compose.yml        # Local infrastructure và app profile
├── docker-compose.prod.yml   # Production stack
├── DESIGN.md                 # Design system và UI tokens
└── AGENTS.md                 # Quy ước phát triển dự án
```

## Khởi chạy local

### Yêu cầu

- Java 21 và Maven 3.9+
- Node.js 20+ và npm
- Docker cùng Docker Compose

### 1. Chuẩn bị biến môi trường

Sao chép file mẫu và điền giá trị phù hợp. Không commit secret lên repository.

```bash
cp backend/.env.example backend/.env
```

Trên Windows PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

### 2. Khởi động hạ tầng

Thiết lập các biến bắt buộc được dùng trong `docker-compose.yml`, sau đó chạy:

```bash
docker compose up -d postgres mysql redis rabbitmq
```

### 3. Chạy backend

```bash
cd backend
mvn spring-boot:run
```

Trên Windows:

```powershell
cd backend
./mvnw.cmd spring-boot:run
```

Backend mặc định: `http://localhost:8080`.

Swagger UI: `http://localhost:8080/swagger-ui.html`.

### 4. Chạy frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend mặc định: `http://localhost:5173`. Axios sử dụng `VITE_API_BASE_URL`, mặc định là `http://localhost:8080/api/v1`.

Hướng dẫn đầy đủ: [docs/setup/SETUP_GUIDE.md](docs/setup/SETUP_GUIDE.md).

## Kiểm tra dự án

```bash
# Backend
cd backend
mvn test

# Frontend
cd frontend
npm run build
```

## Nhóm chức năng

1. Authentication & User Management
2. Company Management
3. Job Recruitment Management
4. AI-Powered CV Screening & Analysis
5. Candidate–Job Matching & Ranking
6. Online Technical Assessment
7. AI Interview System
8. Recruitment Workflow Management
9. Recruitment Analytics Dashboard
10. Interview Scheduling & Notifications
11. AI Practice Interview for Candidates

Danh sách feature và trạng thái triển khai: [docs/features/README.md](docs/features/README.md).

## Tài liệu quan trọng

| Tài liệu | Nội dung |
|---|---|
| [AGENTS.md](AGENTS.md) | Quy ước phát triển và làm việc với AI coding agents |
| [DESIGN.md](DESIGN.md) | Design system, typography, màu sắc và UI tokens |
| [Database documentation](docs/database/README.md) | Kiến trúc database, ERD, data dictionary và migrations |
| [Architecture overview](docs/architecture/OVERVIEW.md) | Kiến trúc hệ thống tổng quan |
| [Local setup](docs/setup/SETUP_GUIDE.md) | Hướng dẫn cài đặt môi trường local |
| [GCP VPS deployment](docs/setup/GCP_VPS_DEPLOY.md) | Hướng dẫn triển khai production |
| [Feature specifications](docs/features/README.md) | Danh sách chức năng và trạng thái triển khai |

## Triển khai

Workflow [Build images and deploy VPS](.github/workflows/deploy-gcp.yml) build Docker images, đẩy lên Docker Hub và triển khai lên Google Cloud VPS khi có thay đổi phù hợp trên branch `production`. Các secret production phải được cấu hình trong GitHub Actions và không được lưu trong repository.

## License

Dự án được phân phối theo [MIT License](LICENSE).
