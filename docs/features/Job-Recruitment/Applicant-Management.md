# Applicant Management

**Epic:** Job Recruitment Management  
**Trạng thái:** `Doing`  
**Code ID:** `JOB-05`

## Mục đích chức năng

Quản lý danh sách ứng viên apply vào job: xem, lọc, gán stage, ghi chú.

## Actor

- Recruiter, Admin
- Candidate (apply)

## Luồng hoạt động

1. Candidate apply → `POST /api/v1/jobs/{id}/applications` (career page hoặc `/candidate/jobs`).
2. Recruiter xem `GET /api/v1/jobs/{id}/applications` (số lượng trên job list).
3. Update stage/status/notes (chưa làm PATCH đầy đủ).

## Business Rules

- 1 application / (job, candidate) trừ khi reopen policy.
- Recruiter chỉ job của mình.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/jobs/{id}/applications` |
| GET | `/api/v1/jobs/{id}/applications` |
| PATCH | `/api/v1/applications/{id}` |

## Database liên quan

- `applications`

## UI mockup

- Google Stitch: **Job Recruitment Management / Applicant Management** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

JOB-02, JOB-04
