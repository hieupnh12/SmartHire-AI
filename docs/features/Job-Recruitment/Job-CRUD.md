# Create / Update / Delete Job

**Epic:** Job Recruitment Management  
**Trạng thái:** `To Do`  
**Code ID:** `JOB-01`

## Mục đích chức năng

Recruiter quản lý vòng đời tin tuyển dụng: tạo, sửa, xóa (soft delete).

## Actor

- Recruiter, Admin

## Luồng hoạt động

1. CRUD qua `/api/v1/jobs`.
2. Soft delete khi có applicants.
3. Invalidate cache listing.

## Business Rules

- Ownership/org check.
- Không hard-delete nếu có applications (soft delete).

## API liên quan

| Method | Path |
|---|---|
| POST/GET/PUT/DELETE | `/api/v1/jobs`, `/api/v1/jobs/{id}` |

## Database liên quan

- `jobs`

## UI mockup

- Google Stitch: **Job Recruitment Management / Create / Update / Delete Job** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

AUTH-04
