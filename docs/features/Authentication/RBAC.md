# Role-Based Access Control (RBAC)

**Epic:** Authentication & User Management  
**Trạng thái:** `Done`
**Code ID:** `AUTH-04`

## Mục đích chức năng

Company admin tạo vai trò tùy ý, tick **tính năng** workspace nhà tuyển dụng cho từng vai trò. Khi tạo/mời nhân viên chỉ gán vai trò. User đăng nhập chỉ thấy và gọi được các tính năng đã cấp. `TENANT_ADMIN` / `ADMIN` luôn full quyền quản trị. Quyền chi tiết từng **chức năng trong tính năng** chưa làm (sẽ phân sau).

## Actor

- `TENANT_ADMIN` / `ADMIN`: tạo/sửa/xóa vai trò tùy biến và tick tính năng
- Vai trò workspace nhà tuyển dụng (`HR`, `RECRUITER`, role custom): bị enforce trên menu, route và API
- `CANDIDATE`: ngoài phạm vi (workspace riêng)

## Luồng hoạt động

1. Company admin mở `/internal/admin/roles`, tạo vai trò (ví dụ “Sàng lọc CV”), tick tính năng, lưu.
2. Hệ thống ghi bảng tenant `roles` + `role_permissions`.
3. Admin mời nhân viên tại `/internal/admin/users` và chọn vai trò, hoặc gắn/đổi vai trò trên nhân viên đã có.
4. `POST /api/v1/tenant/auth/login` và `GET /api/v1/tenant/auth/me` trả `role`, `workspace`, `permissions: string[]`.
5. FE ẩn mục nav không có trong `permissions`; vào URL lậu thì chuyển về tính năng còn quyền.
6. Staff gọi API module chưa cấp → `403 FORBIDDEN`.

## Business Rules

- Role hệ thống (không bao giờ xóa): `TENANT_ADMIN`, `ADMIN`, `HR`, `RECRUITER`, `CANDIDATE`. Chỉ xóa được role custom khi chưa gán cho nhân viên / lời mời PENDING.
- Role custom luôn thuộc workspace `RECRUITER`. Tên tự đặt; `code` sinh từ tên (uppercase, unique).
- Sau login: workspace `ADMIN` → `/internal/admin`; `RECRUITER` → tính năng đầu tiên còn quyền trong `/recruiter`; `CANDIDATE` → `/candidate`.
- Chỉ role workspace `RECRUITER` bị cắt tính năng. Không cấu hình `TENANT_ADMIN` / `ADMIN` / `CANDIDATE`.
- Chỉ `TENANT_ADMIN` và `ADMIN` được CRUD vai trò.
- Catalog **tính năng** cố định trong code:
  `DASHBOARD`, `JOBS`, `APPLICANTS`, `CV_SCREENING`, `RANKING`, `PIPELINE`, `ANALYTICS`, `ASSESSMENTS`, `INTERVIEWS`, `SCHEDULES`, `NOTIFICATIONS`.
- Tenant mới: seed 5 role hệ thống; `HR` / `RECRUITER` mặc định bật hết 11 tính năng.
- JWT chứa `role` (code). Permission đọc từ DB mỗi lần login/`/me`/API. Staff custom được thêm authority `ROLE_STAFF`.
- Đổi vai trò nhân viên đã có: `PUT /api/v1/tenant/users/{id}/role`. Không gắn role cho tài khoản `CANDIDATE`. Nhân viên cần đăng nhập lại vì JWT còn role cũ.
- Bảng quản lý nhân viên không liệt kê tài khoản `CANDIDATE`.
- Chưa phân quyền theo chức năng (nút/hành động) trong từng tính năng.

## API liên quan

| Method | Path | Role |
|---|---|---|
| GET | `/api/v1/tenant/roles` | `TENANT_ADMIN`, `ADMIN` |
| POST | `/api/v1/tenant/roles` | `TENANT_ADMIN`, `ADMIN` |
| PUT | `/api/v1/tenant/roles/{id}` | `TENANT_ADMIN`, `ADMIN` |
| DELETE | `/api/v1/tenant/roles/{id}` | `TENANT_ADMIN`, `ADMIN` |
| GET | `/api/v1/tenant/role-permissions` | `TENANT_ADMIN`, `ADMIN` |
| PUT | `/api/v1/tenant/role-permissions` | `TENANT_ADMIN`, `ADMIN` |
| PUT | `/api/v1/tenant/users/{id}/role` | `TENANT_ADMIN`, `ADMIN` |
| POST | `/api/v1/tenant/auth/login` | public (`user.permissions`, `user.workspace`) |
| GET | `/api/v1/tenant/auth/me` | authenticated |

API recruiter (`/api/v1/jobs`, `/applications`, `/cvs`, `/rankings`, …) bị `RecruiterFeatureFilter` chặn theo `feature_code` đối với staff workspace nhà tuyển dụng.

## Database liên quan

- `roles` (Tenant MySQL): `(code, name, workspace, is_system)`
- `users.role` / `member_invitations.role`: VARCHAR(64), lưu `roles.code`
- `role_permissions`: `(role, feature_code)` unique. Không có dòng cho `TENANT_ADMIN`.

## UI mockup

- Company admin: `/internal/admin/roles` — danh sách vai trò + tick 11 tính năng
- Company admin: `/internal/admin/users` — dropdown vai trò khi mời
- Recruiter/HR/custom: thanh nav workspace chỉ còn mục đã tick
- Icons: xem `DESIGN.md`

## Phụ thuộc

AUTH-02, COMPANY-02

## Cập nhật triển khai multi-tenant

- API quản trị master yêu cầu `WORKSPACE_ADMIN`, tách biệt với `ADMIN`/`TENANT_ADMIN` của doanh nghiệp.
- API quản lý người dùng tenant yêu cầu `TENANT_ADMIN` hoặc `ADMIN`.
- Frontend chuyển `TENANT_ADMIN` và `ADMIN` của doanh nghiệp về `/internal/admin`; route này không dùng cho `WORKSPACE_ADMIN` của nền tảng. Đường dẫn cũ `/tenant/admin` chỉ giữ để chuyển hướng tương thích.
- API nghiệp vụ yêu cầu tenant role và tenant đang `ACTIVE`; JWT, header và subdomain phải cùng tenant.
- Endpoint công khai giới hạn ở login và kiểm tra tenant đang hoạt động; Swagger/health phục vụ vận hành.
- CORS chỉ nhận các origin cụ thể từ `CORS_ORIGINS`, không cho wildcard kèm credential.
- Chi tiết: [Khởi tạo doanh nghiệp](Tenant-Onboarding.md).
