# Recruitment Stage Management

**Epic:** Job Recruitment Management  
**Trạng thái:** `To Do`  
**Code ID:** `JOB-04`

## Mục đích chức năng

Định nghĩa pipeline stages cho từng job (Applied → Screening → Assessment → Interview → Offer → Hired).

## Actor

- Recruiter, Admin

## Luồng hoạt động

1. Template stages mặc định khi tạo job.
2. Recruiter tùy chỉnh order/name.
3. Applicant chuyển stage theo workflow.

## Business Rules

- Ít nhất 1 stage đầu/cuối.
- Không xóa stage đang có candidate (archive).

## API liên quan

| Method | Path |
|---|---|
| GET/PUT | `/api/v1/jobs/{id}/stages` |

## Database liên quan

- `recruitment_stages`

## UI mockup

- Google Stitch: **Job Recruitment Management / Recruitment Stage Management** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

JOB-01
