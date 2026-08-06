# API Guide — SmartHire-AI

Base: `/api/v1` · Auth: `Authorization: Bearer <access_token>` · Spec: `/v3/api-docs` · UI: `/swagger-ui.html`

Async AI/grading/email: **RabbitMQ** (ghi chú queue trong OpenAPI description).  
Realtime: WebSocket `/ws` (JWT).

Envelope chuẩn: xem phiên bản trước — `success`, `message`, `data`, `errors`, `timestamp`.

---

## Auth & users

| Method | Path | Feature |
|---|---|---|
| POST | `/auth/register` | AUTH-01 |
| POST | `/auth/login` | AUTH-02 |
| POST | `/auth/refresh` | AUTH-02 |
| POST | `/auth/logout` | AUTH-02 |
| POST | `/auth/google` | AUTH-03 |
| GET/PUT | `/users/me` | AUTH-05 |
| POST | `/users/me/avatar` | AUTH-05 |

## Jobs & applicants

| Method | Path | Feature |
|---|---|---|
| CRUD | `/jobs` | JOB-01 |
| POST | `/jobs/{id}/publish` · `/close` | JOB-02 |
| GET/PUT | `/jobs/{id}/skills` | JOB-03 |
| GET/PUT | `/jobs/{id}/stages` | JOB-04 |
| POST/GET | `/jobs/{id}/applications` | JOB-05 |
| PATCH | `/applications/{id}` | JOB-05 |

## CV screening

| Method | Path | Feature |
|---|---|---|
| POST | `/cvs` | CV-01 |
| POST | `/cvs/{id}/parse` | CV-02 |
| POST | `/cvs/{id}/extract` | CV-03 |
| POST | `/cvs/{id}/analyze` | CV-04 |
| GET/POST | `/jobs/{jobId}/cvs/{cvId}/match` | CV-05 |

## Matching & ranking

| Method | Path | Feature |
|---|---|---|
| GET/POST | `/jobs/{id}/rankings` · `/recompute` | RANK-01 |
| GET | `/recommendations/jobs` | RANK-02 |
| GET | `/jobs/{id}/recommendations/candidates` | RANK-02 |
| GET | `/applications/{id}/overall-score` | RANK-03 |

## Technical assessment (FE-05)

| Method | Path | Feature |
|---|---|---|
| POST/GET | `/assessments` | ASSESS-01 |
| POST | `/assessments/{id}/attempts` | ASSESS-01 |
| POST | `/attempts/{id}/answers` | ASSESS-01 |
| POST | `/attempts/{id}/coding-submissions` | ASSESS-02 |
| POST | `/attempts/{id}/grade` | ASSESS-03 |
| GET | `/attempts/{id}/timer` | ASSESS-04 |
| POST | `/attempts/{id}/submit` | ASSESS-04 |
| POST/GET | `/attempts/{id}/proctor-events` · `/proctor-report` | ASSESS-05 |

## AI interview

| Method | Path | Feature |
|---|---|---|
| POST | `/interviews` | INT-* |
| POST | `/interviews/{id}/questions/generate` | INT-01 |
| POST | `/interviews/{id}/voice` | INT-02 |
| POST | `/interviews/{id}/score` | INT-04 |
| GET/POST | `/interviews/{id}/feedback` · `/share` | INT-05 |

## Workflow

| Method | Path | Feature |
|---|---|---|
| GET | `/jobs/{id}/pipeline` | WF-01 |
| POST | `/applications/{id}/move` | WF-01 |
| PATCH | `/applications/{id}/status` | WF-02 |
| GET | `/applications/{id}/status-history` | WF-02 |
| POST/GET | `/applications/{id}/decisions` | WF-03 |

## Dashboard

| Method | Path | Feature |
|---|---|---|
| GET | `/dashboard/summary` | DASH-01 |
| GET | `/dashboard/charts` | DASH-02 |
| GET | `/dashboard/trends` | DASH-03 |

## Scheduling & notifications

| Method | Path | Feature |
|---|---|---|
| CRUD/confirm | `/schedules` | SCHED-01 |
| GET/PATCH | `/notifications` | SCHED-02 |
| WS | `/ws` → `/user/queue/notifications` | SCHED-02 |

## Practice interview

| Method | Path | Feature |
|---|---|---|
| POST/GET/DELETE | `/practice/sessions` | PRACT-01, PRACT-03 |
| POST | `/practice/sessions/{id}/answers` | PRACT-01 |
| POST/GET | `/practice/sessions/{id}/feedback` | PRACT-02 |

---

Chi tiết request/response: Swagger + từng file trong `docs/features/**`.  
Postman skeleton: `docs/api/SmartHire.postman_collection.json` (regenerate từ OpenAPI khi BE sẵn sàng).
