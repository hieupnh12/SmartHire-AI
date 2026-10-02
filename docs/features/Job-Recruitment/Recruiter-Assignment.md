# Phân quyền truy cập và chỉnh sửa Tin tuyển dụng (Job Access & Permissions)

**Epic:** Job Recruitment Management  
**Trạng thái:** `Done`  
**Code ID:** `JOB-06`

## Mục đích chức năng

Thay thế hoàn toàn cơ chế "Phân công" tách rời bằng hệ thống **Phân quyền truy cập tin tuyển dụng** (Job Permissions) linh hoạt và chặt chẽ:
1. **Phân quyền cấp Vai trò (Role level):** Cho phép Admin cấp quyền xem **Tất cả tin tuyển dụng** (`JOBS_ALL`) cho một vai trò. Người có quyền này hoặc `TENANT_ADMIN` / `ADMIN` có thể xem mọi tin tuyển dụng của công ty.
2. **Phạm vi mặc định của nhân viên:** Nhân viên chỉ xem được các tin tuyển dụng do chính mình tạo hoặc được Admin/Người tạo cấp quyền xem.
3. **Phân quyền chi tiết trên từng Tin (Job level):** Trên mỗi job, Admin hoặc Người tạo tin có thể chỉ định cụ thể từng nhân viên:
   - **Quyền Xem (`canView`):** Được xem chi tiết job, danh sách ứng viên, CV và kết quả phỏng vấn.
   - **Quyền Chỉnh sửa (`canEdit`):** Được chỉnh sửa thông tin mô tả, kỹ năng, lương, các vòng tuyển dụng (pipeline) và xuất bản/đóng tin.
4. **Bảo vệ quyền Người tạo (`isCreator`):** Người tạo tin luôn có toàn quyền Xem/Sửa trên tin của mình và không thể bị tước quyền.

## Actor & Quyền hạn

- `TENANT_ADMIN` / `ADMIN`: Toàn quyền hệ thống — xem, sửa, xóa mọi job; quản lý phân quyền trên mọi job.
- Nhân viên có quyền `JOBS_ALL`: Xem được danh sách và chi tiết tất cả các tin tuyển dụng (có tab chuyển đổi "Việc làm của tôi" / "Tất cả").
- `Creator` (Người tạo tin): Toàn quyền xem, sửa, quản lý phân quyền nhân viên trên tin mình tạo.
- `Staff được cấp canView`: Xem thông tin job và pipeline ứng viên. Không được sửa thông tin job.
- `Staff được cấp canEdit`: Được sửa thông tin job, quy trình tuyển dụng và cập nhật trạng thái tin.
- `Staff không có quyền`: Bị chặn truy cập (`403 FORBIDDEN` / `JOB_NOT_ASSIGNED`).

## Luồng hoạt động

### 1. Phân quyền cấp vai trò (Admin)
- Admin vào **Quản lý phân quyền** (`/internal/admin/roles`).
- Tại phần **Phạm vi tuyển dụng**, bật/tắt quyền **Xem tất cả tin tuyển dụng (`JOBS_ALL`)** cho từng vai trò tùy theo nhu cầu doanh nghiệp.

### 2. Xem danh sách tin tuyển dụng (Recruiter)
- Nếu người dùng có quyền Admin hoặc `JOBS_ALL`, giao diện hiển thị 2 tab:
  - **Việc làm của tôi:** Các tin do người dùng tạo hoặc được phân quyền phụ trách.
  - **Tất cả:** Toàn bộ tin tuyển dụng trong workspace của doanh nghiệp.
- Nếu không có `JOBS_ALL`, chỉ thấy danh sách tin của mình / được cấp quyền xem.

### 3. Phân quyền chi tiết trên từng Job
- Tại trang chi tiết tin tuyển dụng (`/recruiter/jobs/{id}`), Admin hoặc Người tạo bấm nút **"Phân quyền"** (icon Shield).
- Modal phân quyền (`JobPermissionsModal`) hiển thị:
  - Thông tin người tạo (Creator badge: Toàn quyền, không thể gỡ).
  - Danh sách nhân viên được cấp quyền kèm checkbox: **Xem (`canView`)** và **Chỉnh sửa (`canEdit`)**.
  - Dropdown chọn nhân viên khác trong công ty để thêm vào với quyền Xem/Sửa tùy chọn.
  - Nút **Lưu thay đổi** gọi API `PATCH /api/v1/jobs/{jobId}/assignments/{userId}`.
  - Nút **Xóa** gỡ bỏ hoàn toàn quyền của nhân viên khỏi tin tuyển dụng.

## Bảng Ma trận Quyền hạn (Job Access Matrix)

| Quyền / Vai trò | Admin | Có `JOBS_ALL` | Người tạo (Creator) | Được cấp `canEdit` | Chỉ cấp `canView` | Không có quyền |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Xem danh sách all job | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Xem chi tiết job & ứng viên | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (403) |
| Sửa thông tin job & pipeline | ✅ | ❌ (trừ khi có canEdit) | ✅ | ✅ | ❌ | ❌ |
| Đổi trạng thái tin (Publish/Close) | ✅ | ❌ (trừ khi có canEdit) | ✅ | ✅ | ❌ | ❌ |
| Quản lý phân quyền trên job | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Xóa / Lưu trữ tin | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |

## API liên quan

| Method | Path | Quyền truy cập | Mục đích |
|---|---|---|---|
| GET | `/api/v1/jobs?scope=my|all` | Staff (my); Admin hoặc `JOBS_ALL` (all) | Lọc danh sách job theo phạm vi |
| GET | `/api/v1/jobs/{jobId}` | Admin; `JOBS_ALL`; Creator; hoặc có `canView = true` | Lấy chi tiết job kèm cờ `canEdit`, `canManagePermissions` |
| GET | `/api/v1/jobs/{jobId}/assignments` | Admin; Creator; hoặc nhân viên có quyền trên job | Lấy danh sách nhân viên được phân quyền kèm cờ `canView`, `canEdit`, `isCreator` |
| POST | `/api/v1/jobs/{jobId}/assignments` | Admin; Creator | Thêm nhân viên vào danh sách phân quyền của job |
| PATCH | `/api/v1/jobs/{jobId}/assignments/{userId}` | Admin; Creator | Cập nhật quyền Xem (`canView`) và Chỉnh sửa (`canEdit`) của nhân viên |
| DELETE | `/api/v1/jobs/{jobId}/assignments/{userId}` | Admin; Creator | Thu hồi quyền truy cập job của nhân viên |

## Database liên quan

- Bảng `job_assignments` (Tenant MySQL):
  - `id`: BIGINT (PK)
  - `job_id`: BIGINT (FK → `jobs.id`)
  - `user_id`: BIGINT (FK → `users.id`)
  - `assignment_role`: VARCHAR(32) — Giữ tương thích (`COLLABORATOR`, `VIEWER`, `OWNER`)
  - `can_view`: BOOLEAN NOT NULL DEFAULT TRUE — Quyền xem job và ứng viên (V37)
  - `can_edit`: BOOLEAN NOT NULL DEFAULT FALSE — Quyền chỉnh sửa nội dung job (V37)
  - `assigned_by`: BIGINT (FK → `users.id`)
  - `created_at`, `updated_at`: TIMESTAMP
- Migrations:
  - `V9__job_assignments.sql`: Khởi tạo bảng.
  - `V37__job_role_matrix.sql`: Thêm cột `can_view`, `can_edit` và backfill dữ liệu.

## UI Components liên quan

- `RolesPage.tsx` (`/internal/admin/roles`): Cấu hình quyền `JOBS_ALL` (Phạm vi tuyển dụng) cho từng vai trò.
- `JobsPage.tsx` (`/recruiter/jobs`): Tab "Việc làm của tôi / Tất cả" khi có quyền `JOBS_ALL` hoặc Admin.
- `JobDetailPage.tsx` (`/recruiter/jobs/:id`): Nút "Phân quyền" (mở modal) cho Admin hoặc Creator; kiểm soát hiển thị nút Sửa/Đổi trạng thái dựa theo `job.canEdit`.
- `JobPermissionsModal.tsx`: Modal quản lý và cập nhật quyền Xem/Sửa của từng nhân viên trên Job.
