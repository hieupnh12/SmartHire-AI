# Role-Based Access Control (RBAC)

**Epic:** Authentication & User Management  
**Trạng thái:** `To Do`  
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
