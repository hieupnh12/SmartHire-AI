# AGENTS.md — Hướng dẫn AI khi làm việc trên SmartHire-AI

Tài liệu này bắt buộc tuân thủ khi code bằng AI (Cursor, Copilot, Codex, v.v.).

## 1. Tổng quan dự án

SmartHire-AI là nền tảng tuyển dụng web tích hợp AI: auth/RBAC, job & pipeline, CV screening, matching/ranking, technical assessment, AI interview, scheduling/notifications, analytics, practice interview.

| Thành phần | Đường dẫn | Stack chính |
|---|---|---|
| Backend | `backend/` | Java 21, Spring Boot 3.x, MySQL, Redis, RabbitMQ, Flyway, WebSocket |
| Frontend | `frontend/` | TypeScript, React 19, Vite, Shadcn UI, Tailwind, Zustand, TanStack Query |
| Docs | `docs/features/` | **40 features** (AUTH→PRACT) — mục đích, actor, flow, rules, API, DB, mockup, status |
| Design | `DESIGN.md` | Tokens, UX, i18n EN/VI/JA, shortcuts |

## 2. Nguyên tắc chung

1. **Đọc trước, sửa sau** — Đọc `DESIGN.md`, feature doc tương ứng trong `docs/features/`, và code liên quan trước khi viết.
2. **Không mở rộng scope** — Chỉ làm đúng yêu cầu. Không refactor rộng, không thêm dependency/docs không được hỏi.
3. **Một nguồn sự thật** — API contract lấy từ Swagger/`docs/api`. UI token lấy từ `DESIGN.md`. Business rules lấy từ feature docs.
4. **Cập nhật docs khi đổi hành vi** — Thay đổi flow/API/DB/status thì cập nhật file `.md` feature tương ứng (status: To Do / Doing / Done).
5. **Bảo mật** — Không commit secret (`.env`, key, password). Dùng biến môi trường / secrets CI.

## 3. Backend (Java / Spring Boot)

### Cấu trúc package (bắt buộc)

```
com.smarthire
├── config          # Security, Redis, RabbitMQ, OpenAPI, CORS, WebSocket
├── common          # ApiResponse, exceptions, GlobalExceptionHandler
├── domain          # shared entity/enum/repository khi cần
├── module
│   ├── auth              # AUTH-01..05
│   ├── job               # JOB-01..04
│   ├── applicant         # JOB-05, hỗ trợ WF
│   ├── cv                # CV-01..05
│   ├── matching          # RANK-01..03
│   ├── assessment        # ASSESS-01..05 (FE-05)
│   ├── interview         # INT-01..05
│   ├── practice          # PRACT-01..03
│   ├── workflow          # WF-01..03
│   ├── schedule          # SCHED-01
│   ├── notification      # SCHED-02..03
│   └── dashboard         # DASH-01..03
│       ├── controller
│       ├── dto
│       ├── service
│       └── mapper
├── messaging       # RabbitMQ producers/consumers
└── security        # JWT, filters, RBAC
```

### Quy ước code

- Controller mỏng: validate input → gọi service → trả `ApiResponse`.
- Business logic nằm ở Service; không để logic trong Controller/Entity.
- Dùng DTO + MapStruct (hoặc manual mapper); **không** expose Entity ra API.
- Validation: `jakarta.validation` trên request DTO.
- Exception: ném domain exception; `GlobalExceptionHandler` (`@ControllerAdvice`) map sang HTTP status.
- Migration DB: **chỉ** qua Flyway (`backend/src/main/resources/db/migration`). Không dùng `ddl-auto=update` ở môi trường ngoài local prototype.
- Entity `@Table(name = "...")` **bắt buộc chữ thường** (snake_case), khớp tên bảng Flyway — ví dụ `@Table(name = "users")`, `@Table(name = "interview_answers")`, `@Table(name = "attempt_answers")`. Không dùng PascalCase/camelCase trong `name`.
- Cache/OTP/session/rate-limit: **Redis** (`RedisKeys`, `RedisService`). Job bất đồng bộ (CV AI, grading, STT/NLP, email): **RabbitMQ** Queue + Worker Pool (`JobPublisher`, `@RabbitListener`, concurrency 3→10). Realtime: **WebSocket**.
- Connection pool: **HikariCP** (bắt buộc) — `spring.datasource.hikari.*`.
- Reverse proxy: **Nginx** (`frontend/nginx.conf`, `deploy/nginx/`).
- Chi tiết: `docs/architecture/INFRA_CHECKLIST.md`, `docs/architecture/ASYNC_AND_CACHE.md`.
- Logging: SLF4J + Logback; không `System.out`; không log PII/token.
- API docs: springdoc-openapi; mọi endpoint public đều có annotation mô tả.
- Test: JUnit 5 + Mockito + `@SpringBootTest` / `@WebMvcTest` / `@DataJpaTest` tùy tầng.

### Khi thêm API mới

1. Viết/ cập nhật feature doc trong `docs/features/`.
2. Flyway migration nếu đổi schema.
3. Entity → Repository → Service → Controller → DTO.
4. Unit/integration test tối thiểu cho happy path + 1 error path.
5. Cập nhật Postman collection nếu có trong `docs/api/`.

## 4. Frontend (React / TypeScript)

### Cấu trúc thư mục

```
frontend/src
├── app             # providers, router, RoleShell, RoleRoute
├── api             # shared Axios clients ↔ BE modules
├── components
│   ├── ui
│   └── shared
├── features        # BY ROLE (not by domain CRUD)
│   ├── welcome     # public landing /
│   ├── auth        # login, register, zustand
│   ├── candidate   # /candidate/*
│   ├── recruiter   # /recruiter/*
│   └── admin       # /admin/*
├── lib
├── hooks
└── styles
```

Login redirect theo `role`: Candidate → `/candidate`, Recruiter → `/recruiter`, Admin → `/admin`.

### Quy ước code

- TypeScript strict; không `any` trừ khi có lý do rõ và comment ngắn.
- Server state: TanStack Query. Client/UI state: Zustand. Không nhồi server data vào Zustand.
- Form: React Hook Form + Zod. Schema Zod đồng bộ validation FE với message BE khi có thể.
- HTTP: Axios instance trong `lib/axios.ts` (baseURL, interceptor auth/refresh, error normalize).
- UI: Shadcn + Tailwind; **chỉ** dùng token/màu/icon từ `DESIGN.md` (Google Stitch).
- Routing: React Router DOM; bảo vệ route theo role (Recruiter / Candidate / Admin).
- Không inline style tùy tiện; ưu tiên utility Tailwind theo design tokens.

## 5. Docs & trạng thái

Mỗi feature page trong `docs/features/**` phải có các mục:

- Mục đích chức năng
- Actor
- Luồng hoạt động
- Business Rules
- API liên quan
- Database liên quan
- UI mockup (link Stitch / mô tả)
- Trạng thái: `To Do` | `Doing` | `Done`

Khi AI implement xong một phần: đổi status tương ứng và ghi chú commit/PR nếu cần.

## 6. DevOps

- Local stack: `docker-compose.yml` (MySQL, Redis, RabbitMQ, backend, frontend tùy profile).
- Production (Google Cloud VPS): `docker-compose.prod.yml` + `deploy/scripts/*` + host Nginx/TLS.
- Hướng dẫn: `docs/setup/GCP_VPS_DEPLOY.md`.
- CI: GitHub Actions — build BE + FE, test.
- CD: `.github/workflows/deploy-gcp.yml` (SSH vào Compute Engine) — secrets `GCP_VPS_*`.
- Không commit `deploy/.env.production` hoặc secret lên repo.

## 7. Checklist trước khi kết thúc task

- [ ] Đúng layer / package / folder convention
- [ ] Validation + exception handling (BE) hoặc Zod + error UI (FE)
- [ ] Không phá DESIGN tokens / icon set
- [ ] Cập nhật feature doc + status nếu đổi hành vi
- [ ] Test hoặc bước verify thủ công đã nêu rõ
- [ ] Không commit file nhạy cảm

## 8. Việc AI không được làm trừ khi được yêu cầu rõ

- Đổi stack (Redux thay Zustand, Liquibase thay Flyway, v.v.)
- Force push, amend commit đã push, skip hooks
- Viết malware/exploit
- Sinh tài liệu markdown lan man ngoài phạm vi task
- Thêm ELK / multi-cloud phức tạp khi chưa được chỉ định trong sprint
- Đổi target deploy mặc định khỏi Google Cloud VPS trừ khi được yêu cầu

## 9. Ngôn ngữ giao tiếp

- Code, identifier, commit message: **English**
- Tài liệu sản phẩm trong `docs/`: **Tiếng Việt** (trừ khi team quy định khác)
- Comment trong code: English, ngắn gọn, chỉ khi cần
