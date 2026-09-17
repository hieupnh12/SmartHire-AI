# Create / Update / Delete Job

**Epic:** Job Recruitment Management  
**Trạng thái:** `Done`  
**Code ID:** `JOB-01`

## Mục đích chức năng

Recruiter quản lý vòng đời tin tuyển dụng: tạo nháp, sửa, clone, xóa (soft delete).

## Actor

- Recruiter, Admin, HR

## Luồng hoạt động

1. CRUD qua `/api/v1/jobs`.
2. Tạo mặc định `DRAFT`, skill mẫu (nếu bỏ trống) và pipeline Applied → Hired.
3. Clone copy nội dung/skill/stage, không copy application.
4. Soft delete `deleted_at` + `ARCHIVED`.

## Business Rules

- Staff trong tenant mới được quản lý.
- Không hard-delete khi đã có applicants.

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/jobs` |
| POST | `/api/v1/jobs` |
| GET/PUT/DELETE | `/api/v1/jobs/{id}` |
| POST | `/api/v1/jobs/{id}/clone` |
| POST | `/api/v1/jobs/quick` |

## Database liên quan

- `jobs` (V6: department, work_mode, headcount, deadline, salary_*, responsibilities, benefits, experience, education)

## UI mockup

- Recruiter: `/recruiter/jobs`, `/recruiter/jobs/new`, `/recruiter/jobs/:id`

## Phụ thuộc

AUTH-04
