# Mời nhân viên nội bộ

**Epic:** Company Management  
**Trạng thái:** `Done`  
**Code ID:** `COMPANY-02`

## Mục đích chức năng

Company admin mời nhân viên qua email. Người được mời mở link, đặt mật khẩu; tài khoản `ACTIVE` được tạo với role đã gán.

## Actor

- `TENANT_ADMIN` / `ADMIN`: gửi lời mời
- Invitee: đặt mật khẩu (chưa có JWT)

## Luồng hoạt động

1. Admin mở `/tenant/admin/users`, nhập họ tên, email, role.
2. FE gọi `POST /api/v1/tenant/users/invitations` (JWT + `X-Tenant-ID`).
3. BE lưu `member_invitations` (PENDING, token SHA-256, hạn 72h) và gửi SMTP nếu đã cấu hình.
4. Invitee mở `{tenant}.localhost:5173/invite/accept?token=...`, đặt mật khẩu.
5. BE tạo `users` ACTIVE, đánh dấu lời mời ACCEPTED. Invitee đăng nhập `/internal/login`.

## Business Rules

- Chỉ admin tenant được mời. Role mời: `TENANT_ADMIN`, `ADMIN`, `HR`, `RECRUITER`. Không mời `CANDIDATE`.
- Email đã có user hoặc đang PENDING thì `409`.
- User chỉ tạo khi accept. Token hết hạn / đã dùng → `400`.
- SMTP tùy chọn: thiếu `MAIL_*` thì API vẫn trả `acceptUrl` để copy.

## API liên quan

| Method | Path | Quyền |
|---|---|---|
| POST | `/api/v1/tenant/users/invitations` | `TENANT_ADMIN`, `ADMIN` |
| POST | `/api/v1/tenant/users/invitations/accept` | Public + tenant context |

## Database liên quan

Tenant MySQL: `member_invitations`  
Migration: `backend/src/main/resources/db/migration/tenant/V4__member_invitations.sql`

## UI mockup

- Admin: `/tenant/admin/users` — form mời bên trái, bảng nhân viên bên phải
- Accept: `/invite/accept?token=`
- Nav: `nav.users`

## Phụ thuộc

AUTH-02, AUTH-04, Tenant Onboarding

## UML

- `docs/diagram/02-company-management/invite-tenant-member/`
