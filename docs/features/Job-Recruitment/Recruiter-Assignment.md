# Phân công Recruiter phụ trách Job

**Epic:** Job Recruitment Management  
**Trạng thái:** `Done`  
**Code ID:** `JOB-06`

## Mục đích chức năng

Company admin gán nhân viên workspace nhà tuyển dụng vào từng tin tuyển dụng. Recruiter/HR/role custom chỉ xem và xử lý job được phân công. `TENANT_ADMIN` / `ADMIN` luôn thấy mọi job.

Khác **Phân quyền** (module theo role) và khác `applications.assignee_id` (phụ trách một hồ sơ).

## Actor

- `TENANT_ADMIN` / `ADMIN`: gán, đổi vai trò phân công, gỡ
- Staff workspace `RECRUITER` (`HR`, `RECRUITER`, role custom): được gán; sau đó bị giới hạn theo job
- `CANDIDATE`: ngoài phạm vi

## Luồng hoạt động

1. Admin mở `/internal/admin/recruiter-assignments`, chọn job.
2. Thêm nhân viên với `PRIMARY_RECRUITER` hoặc `CO_RECRUITER`.
3. `POST /api/v1/jobs/{jobId}/assignments`.
4. Recruiter vào `/recruiter/jobs` chỉ còn job được phân công.

## Business Rules

- Chỉ admin tenant được gán/gỡ. Đối tượng gán: user ACTIVE, workspace recruiter, không phải `CANDIDATE` / admin.
- Unique `(job_id, user_id)`. Một job tối đa một PRIMARY; gán PRIMARY mới thì PRIMARY cũ hạ thành CO.
- Tạo job bởi recruiter staff → auto PRIMARY. Admin tạo job thì chưa gán ai.
- Gỡ được PRIMARY; job không còn ai phụ trách thì chỉ admin thấy.
- Staff không được phân công → `403 JOB_NOT_ASSIGNED` khi mở job đó.
- Backfill: `jobs.created_by` là recruiter staff → PRIMARY.

## API liên quan

| Method | Path | Quyền |
|---|---|---|
| GET | `/api/v1/jobs/{jobId}/assignments` | Admin; staff nếu đã được gán job |
| POST | `/api/v1/jobs/{jobId}/assignments` | `TENANT_ADMIN`, `ADMIN` |
| PATCH | `/api/v1/jobs/{jobId}/assignments/{userId}` | `TENANT_ADMIN`, `ADMIN` |
| DELETE | `/api/v1/jobs/{jobId}/assignments/{userId}` | `TENANT_ADMIN`, `ADMIN` |

`GET /api/v1/jobs`, `options`, `published` (staff) lọc theo phân công.

## Database liên quan

- `job_assignments` (Tenant MySQL): `(job_id, user_id, assignment_role, assigned_by)`
- Migration: `backend/src/main/resources/db/migration/tenant/V9__job_assignments.sql`

## UI mockup

- Company admin: `/internal/admin/recruiter-assignments`
- Icons: xem `DESIGN.md`

## Phụ thuộc

AUTH-04, COMPANY-02, JOB-01

## UML

- `docs/diagram/10-recruitment-pipeline-management/assign-recruiter/`
