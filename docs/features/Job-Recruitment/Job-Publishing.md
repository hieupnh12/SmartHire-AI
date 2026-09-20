# Job Publishing

**Epic:** Job Recruitment Management  
**Trạng thái:** `Done`  
**Code ID:** `JOB-02`

## Mục đích chức năng

Chuyển job giữa DRAFT → PUBLISHED → PAUSED/CLOSED; kiểm soát visibility public.

## Actor

- Recruiter, Admin, HR

## Luồng hoạt động

1. Recruiter lưu nháp, hoặc bấm **Đăng tuyển** trên form (create/update rồi publish).
2. `POST /api/v1/jobs/{id}/publish` (từ DRAFT hoặc PAUSED).
3. `unpublish` → DRAFT; `pause` → PAUSED; `close` → CLOSED; `reopen` → PUBLISHED.
4. Public list chỉ job `PUBLISHED` chưa quá deadline.

## Business Rules

- Publish cần title, description và ít nhất 1 skill.
- Chỉ PUBLISHED (và chưa deadline) nhận application / CV candidate.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/jobs/{id}/publish` |
| POST | `/api/v1/jobs/{id}/unpublish` |
| POST | `/api/v1/jobs/{id}/pause` |
| POST | `/api/v1/jobs/{id}/close` |
| POST | `/api/v1/jobs/{id}/reopen` |
| GET | `/api/v1/jobs/published` |
| GET | `/api/v1/public/jobs` |
| GET | `/api/v1/public/jobs/{id}` |

## Database liên quan

- `jobs.status`, `published_at`, `paused_at`, `closed_at`

## UI mockup

- Job detail: Publish / Pause / Close / Reopen
- Career page `/career` đọc public jobs

## Phụ thuộc

JOB-01
