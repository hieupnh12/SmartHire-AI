# Kiến trúc tổng quan — SmartHire-AI

## 1. Sơ đồ hệ thống

```
┌──────────────────┐  HTTPS/REST   ┌─────────────────────┐
│ Frontend         │──────────────▶│ Backend API         │
│ React 19         │  WebSocket    │ Spring Boot         │
└──────────────────┘◀─────────────▶└──────────┬──────────┘
                                              │
        ┌───────────────┬─────────────────────┼─────────────────────┐
        ▼               ▼                     ▼                     ▼
   ┌─────────┐    ┌─────────┐          ┌───────────┐         ┌────────────┐
   │ MySQL   │    │ Redis   │          │ RabbitMQ  │         │ Object     │
   │ JPA+    │    │ cache,  │          │ AI/email/ │         │ Storage    │
   │ Flyway  │    │ OTP,    │          │ grading/  │         │ (CV/audio) │
   └─────────┘    │ session,│          │ notify    │         └────────────┘
                  │ WS sess │          └─────┬─────┘
                  └─────────┘                │
                                             ▼
                                      ┌────────────┐
                                      │ Workers    │
                                      │ parse/AI/  │
                                      │ STT/grade  │
                                      └────────────┘
```

## 2. Backend modules (bounded contexts)

| Module | Features (Code) | RabbitMQ / realtime |
|---|---|---|
| `auth` | AUTH-01..05 | `auth.email.otp` |
| `job` | JOB-01..04 | `job.events` |
| `applicant` | JOB-05, WF-* | — |
| `cv` | CV-01..05 | `cv.parse`, `cv.extract`, `cv.analysis`, `cv.matching` |
| `matching` | RANK-01..03 | `recommend.*` |
| `assessment` | ASSESS-01..05 | `assessment.code.grade` |
| `interview` | INT-01..05 | `interview.questions`, `interview.stt`, `interview.nlp`, `interview.score` |
| `practice` | PRACT-01..03 | `practice.feedback` |
| `workflow` | WF-01..03 | events → notify |
| `schedule` | SCHED-01 | reminders |
| `notification` | SCHED-02..03 | WebSocket + `notify.email` |
| `dashboard` | DASH-01..03 | consume events → Redis |

Chi tiết từng feature: [`docs/features/README.md`](../features/README.md).

## 3. Layering

```
Controller → Service → Repository → MySQL
                │
                ├── Redis (cache / OTP / session / ranking cache)
                ├── RabbitMQ (async AI, grading, email)
                └── WebSocket broker (notifications)
```

Cross-cutting: JWT + RBAC, Validation, `@ControllerAdvice`, OpenAPI, SLF4J/Logback.

## 4. Frontend feature folders

```
features/
  auth | job | applicant | cv | matching
  assessment | interview | practice
  workflow | schedule | notifications | dashboard
```

Server state: TanStack Query · Client: Zustand · Forms: RHF+Zod · Realtime: WebSocket client.

## 5. End-to-end hiring flow

```
Register/Login → Publish Job (+skills, stages)
     → Apply + Upload CV → Parse → Extract → AI Skills → Match Score
     → Rank / Recommend
     → Technical Assessment (MCQ/Coding, timer, anti-cheat)
     → AI Interview (questions → STT → NLP → score → feedback)
     → Pipeline / Status / Hiring Decision
     → Schedule + Notify (WS + Email)
     → Dashboard analytics
Candidate parallel: Practice Interview (không ảnh hưởng ranking)
```

## 6. Deployment

Local: `docker-compose.yml`  
Prod GCP VPS: `docker-compose.prod.yml` + [`GCP_VPS_DEPLOY.md`](../setup/GCP_VPS_DEPLOY.md)

## 7. Docs map

| Doc | Nội dung |
|---|---|
| `docs/features/**` | Đặc tả 40 features + status |
| `docs/architecture/DOMAIN_MODEL.md` | Entity / quan hệ chính |
| `docs/architecture/INFRA_CHECKLIST.md` | HikariCP · Nginx · Redis · RabbitMQ |
| `docs/architecture/ASYNC_AND_CACHE.md` | Redis use-cases · Queue + Worker Pool |
| `docs/api/API_GUIDE.md` | API overview |
| `AGENTS.md` | Quy tắc AI coding |
| `DESIGN.md` | UI tokens (Google Stitch) |
