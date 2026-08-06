# Job Publishing

**Epic:** Job Recruitment Management  
**Trạng thái:** `To Do`  
**Code ID:** `JOB-02`

## Mục đích chức năng

Chuyển job giữa DRAFT → PUBLISHED/OPEN → CLOSED/ARCHIVED; kiểm soát visibility.

## Actor

- Recruiter, Admin

## Luồng hoạt động

1. `POST /api/v1/jobs/{id}/publish`.
2. `POST /api/v1/jobs/{id}/close`.
3. Event `job.events` → Redis/search/notify.

## Business Rules

- Chỉ PUBLISHED nhận applicant mới.
- Publish cần đủ title, description, skills tối thiểu.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/jobs/{id}/publish` |
| POST | `/api/v1/jobs/{id}/close` |

## Database liên quan

- `jobs.status`, `published_at`, `closed_at`

## UI mockup

- Google Stitch: **Job Recruitment Management / Job Publishing** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

JOB-01
