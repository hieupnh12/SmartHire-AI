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

1. Admin mở `/internal/admin/users`, nhập họ tên, email, chọn vai trò (role hệ thống hoặc role custom đã tạo ở Phân quyền).
2. FE gọi `POST /api/v1/tenant/users/invitations` (JWT + `X-Tenant-ID`).
3. BE lưu `member_invitations` (PENDING, token SHA-256, hạn 72h). Gửi mail qua Gmail công ty nếu đã cấu hình (render template HTML Thymeleaf `emails/member-invitation.html` chuẩn responsive với logo thương hiệu, badge lời mời, chi tiết vai trò, nút CTA Kích hoạt tài khoản và hướng dẫn 3 bước bảo mật); Gmail lỗi hoặc chưa cấu hình thì gửi bằng SMTP nền tảng. Lỗi gửi mail không hủy lời mời; API vẫn trả `acceptUrl`.
4. Invitee mở `{tenant}.localhost:5173/invite/accept?token=...`, đặt mật khẩu.
5. BE tạo `users` ACTIVE, đánh dấu lời mời ACCEPTED. Invitee đăng nhập `/internal/login`.

## Business Rules

- Chỉ admin tenant được mời. Role mời: mọi role trong bảng `roles` trừ `CANDIDATE` (gồm `TENANT_ADMIN`, `ADMIN`, `HR`, `RECRUITER` và role custom). Không mời `CANDIDATE`.
- Bảng quản lý nhân viên (`GET /api/v1/tenant/users`) không gồm tài khoản `CANDIDATE`.
- Email đã có user thì `409`. Email đang PENDING thì cấp lại token, gia hạn 72 giờ và gửi lại mail, không trả `409`.
- User chỉ tạo khi accept. Token hết hạn / đã dùng / đã thu hồi (`REVOKED`) → `400`.
- SMTP tùy chọn: Gmail công ty và SMTP nền tảng đều lỗi thì API vẫn trả `acceptUrl` để copy. Lời mời PENDING được giữ.
- Khóa / vô hiệu hóa nhân viên (`PATCH /api/v1/tenant/users/{id}/status`):
  - Không thể tự khóa/vô hiệu hóa chính mình (`400 CANNOT_LOCK_SELF`).
  - Không thể khóa/vô hiệu hóa `TENANT_ADMIN` đang `ACTIVE` cuối cùng (`409 LAST_TENANT_ADMIN`).
  - Nếu nhân viên đang là chủ sở hữu (`OWNER` / `createdBy`) của job chưa xóa, phải truyền `transferToUserId` để chuyển giao quyền chủ sở hữu nguyên tử trong cùng transaction; nếu thiếu trả `409 OWNER_TRANSFER_REQUIRED`.
  - Khi chuyển trạng thái sang `LOCKED` hoặc `DISABLED`, các refresh session trong Redis bị xóa và `JwtAuthenticationFilter` từ chối ngay access token còn hạn.

## API liên quan

| Method | Path | Quyền |
|---|---|---|
| GET | `/api/v1/tenant/users` | `TENANT_ADMIN`, `ADMIN` (không gồm `CANDIDATE`) |
| GET | `/api/v1/tenant/users/{id}/assignments` | `TENANT_ADMIN`, `ADMIN` — job chưa xóa mà nhân viên đang được phân công |
| PUT | `/api/v1/tenant/users/{id}/role` | `TENANT_ADMIN`, `ADMIN` |
| PATCH | `/api/v1/tenant/users/{id}/status` | `TENANT_ADMIN`, `ADMIN` — cập nhật `ACTIVE`/`LOCKED`/`DISABLED` (kèm `transferToUserId` nếu đang sở hữu job) |
| GET | `/api/v1/tenant/users/invitations` | `TENANT_ADMIN`, `ADMIN` — danh sách lời mời (lọc tùy chọn theo `status`) |
| POST | `/api/v1/tenant/users/invitations` | `TENANT_ADMIN`, `ADMIN` — gửi lời mời |
| POST | `/api/v1/tenant/users/invitations/{id}/resend` | `TENANT_ADMIN`, `ADMIN` — cấp token mới, gia hạn 72h và gửi lại mail |
| DELETE | `/api/v1/tenant/users/invitations/{id}` | `TENANT_ADMIN`, `ADMIN` — thu hồi lời mời (`REVOKED`) |
| POST | `/api/v1/tenant/users/invitations/accept` | Public + tenant context |

## Database liên quan

Tenant MySQL: `member_invitations`  
Migration: `backend/src/main/resources/db/migration/tenant/V4__member_invitations.sql`

## UI mockup

- Admin: `/internal/admin/users` — form mời bên trái có nút xem trước mẫu thư Gmail (Email Preview Modal), badge trạng thái tài khoản Gmail công ty, kết quả gửi kèm nút chép liên kết kích hoạt một chạm. Bên phải gồm 2 tab: tab **Nhân viên** (tìm kiếm theo tên/email, lọc vai trò/trạng thái mặc định ẩn `DISABLED`, phân trang 20 dòng, dropdown gắn vai trò, thao tác Khóa / Mở khóa / Vô hiệu và modal chuyển giao job khi cần, nút Xem chi tiết) và tab **Lời mời đang chờ** (xem hạn kích hoạt, badge Hết hạn, nút Gửi lại / Thu hồi).
- Accept: `/invite/accept?token=`
- Nav: `nav.users`

## Phụ thuộc

AUTH-02, AUTH-04, Tenant Onboarding

## UML

- `docs/diagram/02-company-management/invite-tenant-member/`
