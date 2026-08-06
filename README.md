# SmartHire-AI

Nền tảng quản lý tuyển dụng web với sàng lọc CV và phỏng vấn AI.

## Cấu trúc monorepo

```
SmartHire-AI/
├── AGENTS.md                 # Quy tắc làm việc cho AI coding agents
├── DESIGN.md                 # Design tokens & icons (Google Stitch)
├── docker-compose.yml        # Local: MySQL, Redis, RabbitMQ (+ apps profile)
├── docker-compose.prod.yml   # Production stack (GCP VPS)
├── deploy/                   # Scripts + Nginx + env production template
├── .github/workflows/        # CI + Deploy GCP
├── backend/                  # Java Spring Boot API
├── frontend/                 # React 19 + Vite SPA
└── docs/
    ├── architecture/         # Kiến trúc tổng quan
    ├── setup/                # Setup local + GCP VPS
    ├── api/                  # API Guide + Postman
    └── features/             # Đặc tả chức năng theo trang
```

## Tech stack

### Backend

| Nhóm | Công nghệ |
|---|---|
| Language / Framework | Java 21, Spring Boot 3.x |
| Database | MySQL + Spring Data JPA (Hibernate) + Flyway |
| Cache / Session / OTP | Redis |
| Messaging | **RabbitMQ** (AI jobs, scoring, notifications) |
| API | REST + springdoc-openapi (Swagger UI) |
| Validation | jakarta.validation |
| Errors | `@ControllerAdvice` Global Exception Handler |
| Test | JUnit 5, Mockito, Spring Boot Test, Postman |
| Logging | SLF4J + Logback |
| Optional | ELK Stack |
| DevOps | Docker, Docker Compose, GitHub Actions, **Google Cloud VPS (Compute Engine)** |

### Frontend

| Nhóm | Công nghệ |
|---|---|
| Language | TypeScript |
| Framework | React 19 |
| Build | Vite |
| UI | Shadcn UI + Tailwind CSS |
| Routing | React Router DOM |
| Client state | Zustand |
| Server state | TanStack React Query |
| Form | React Hook Form + Zod |
| HTTP | Axios |

### Documentation & quality

Git + GitHub, GitHub Actions, Docker, Swagger/OpenAPI, SonarQube, Postman, Markdown (README, API Guide, Setup Guide).

## Quick start

Chi tiết: [docs/setup/SETUP_GUIDE.md](docs/setup/SETUP_GUIDE.md)

```bash
# 1. Infrastructure
docker compose up -d mysql redis rabbitmq

# 2. Backend
cd backend && ./mvnw spring-boot:run

### Frontend (kết nối Backend)

```bash
cd frontend && npm install && npm run dev
```

Axios → `VITE_API_BASE_URL` (mặc định `http://localhost:8080/api/v1`).  
Dashboard ping `GET /auth/health`, `/jobs/health`, `/dashboard/health`.  
Chi tiết: [frontend/README.md](frontend/README.md)

## Tài liệu quan trọng

| File | Mục đích |
|---|---|
| [AGENTS.md](AGENTS.md) | Hướng dẫn AI khi code |
| [DESIGN.md](DESIGN.md) | Màu, typography, icon button (Google Stitch) |
| [docs/architecture/OVERVIEW.md](docs/architecture/OVERVIEW.md) | Kiến trúc hệ thống |
| [docs/setup/SETUP_GUIDE.md](docs/setup/SETUP_GUIDE.md) | Setup local |
| [docs/setup/GCP_VPS_DEPLOY.md](docs/setup/GCP_VPS_DEPLOY.md) | Deploy Google Cloud VPS |
| [docs/features/](docs/features/) | Đặc tả từng chức năng + status |

## Modules / Features (40)

Xem index đầy đủ + status: **[docs/features/README.md](docs/features/README.md)**

1. Authentication & User Management (Register, JWT, Google, RBAC, Profile)
2. Job Recruitment (CRUD, Publish, Skills, Stages, Applicants)
3. AI CV Screening (Upload, Parse, Extract, Skill Analysis, Match Score)
4. Matching & Ranking (Ranking, Recommendations, Overall Score)
5. Online Technical Assessment / FE-05 (MCQ, Coding, Auto-grade, Timer, Anti-cheat)
6. AI Interview (Questions, STT, NLP, Scoring, Feedback)
7. Recruitment Workflow (Pipeline, Status, Hiring Decision)
8. Analytics Dashboard (Stats, Charts, Trends)
9. Scheduling & Notifications (Schedule, WebSocket, Email)
10. AI Practice Interview (Session, Feedback, History)
