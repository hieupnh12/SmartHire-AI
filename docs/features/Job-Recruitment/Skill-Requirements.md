# Skill Requirement Management

**Epic:** Job Recruitment Management  
**Trạng thái:** `To Do`  
**Code ID:** `JOB-03`

## Mục đích chức năng

Gắn skill bắt buộc/ưu tiên + weight cho job để matching/assessment.

## Actor

- Recruiter

## Luồng hoạt động

1. CRUD `job_skills`.
2. Weight dùng cho matching score.

## Business Rules

- Skill name normalize.
- Tổng weight = 100 hoặc normalize khi chấm.

## API liên quan

| Method | Path |
|---|---|
| PUT | `/api/v1/jobs/{id}/skills` |
| GET | `/api/v1/jobs/{id}/skills` |

## Database liên quan

- `skills`, `job_skills` (required, weight, level)

## UI mockup

- Google Stitch: **Job Recruitment Management / Skill Requirement Management** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

JOB-01
