# Recruitment Pipeline

**Epic:** Recruitment Workflow Management  
**Trạng thái:** `To Do`  
**Code ID:** `WF-01`

## Mục đích chức năng

Kanban/pipeline theo stages của job; kéo thả chuyển ứng viên.

## Actor

- Recruiter

## Luồng hoạt động

1. `GET /jobs/{id}/pipeline`.
2. Move application → stage.
3. Emit notification + analytics invalidate.

## Business Rules

- Transition rules (optional gates: cần assessment pass).

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/jobs/{id}/pipeline` |
| POST | `/api/v1/applications/{id}/move` |

## Database liên quan

- `applications.stage_id`, `recruitment_stages`

## UI mockup

- Google Stitch: **Recruitment Workflow Management / Recruitment Pipeline** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

JOB-04, JOB-05
