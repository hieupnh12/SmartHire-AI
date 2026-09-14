# Role-Based Access Control (RBAC)

**Epic:** Authentication & User Management  
**Trạng thái:** `Doing`
**Code ID:** `AUTH-04`

## Mục đích chức năng

Phân quyền theo role (và permission nếu cần) cho mọi API/UI route.

## Actor

- Admin (cấu hình)
- Mọi authenticated user (bị enforce)

## Luồng hoạt động

1. JWT chứa `role` (và optional permissions).
2. Spring Security `@PreAuthorize` / method security.
3. FE route guard theo role.
4. 403 khi vượt quyền.

## Business Rules

- Roles: `ADMIN`, `RECRUITER`, `CANDIDATE`.
- Recruiter chỉ data thuộc org/job của mình.
- Admin full (audit log khuyến nghị).

## API liên quan

Áp dụng cross-cutting trên mọi `/api/v1/**` protected endpoints.

## Database liên quan

- `users.role`
- Optional: `roles`, `permissions`, `role_permissions`

## UI mockup

- Google Stitch: **Authentication & User Management / Role-Based Access Control (RBAC)** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

AUTH-02

## Cập nhật triển khai multi-tenant

- API quản trị master yêu cầu `WORKSPACE_ADMIN`, tách biệt với `ADMIN`/`TENANT_ADMIN` của doanh nghiệp.
- API quản lý người dùng tenant yêu cầu `TENANT_ADMIN` hoặc `ADMIN`.
- API nghiệp vụ yêu cầu tenant role và tenant đang `ACTIVE`; JWT, header và subdomain phải cùng tenant.
- Endpoint công khai giới hạn ở login và kiểm tra tenant đang hoạt động; Swagger/health phục vụ vận hành.
- CORS chỉ nhận các origin cụ thể từ `CORS_ORIGINS`, không cho wildcard kèm credential.
- Phân quyền chi tiết của từng nghiệp vụ tiếp tục theo feature tương ứng.
- Chi tiết: [Khởi tạo doanh nghiệp](Tenant-Onboarding.md).
