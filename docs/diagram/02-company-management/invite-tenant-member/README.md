# COMPANY-02 — Mời thành viên doanh nghiệp

- **Mã Feature:** `COMPANY` / `02-company-management`
- **Mã Function:** `invite-tenant-member`
- **Thư mục:** `docs/diagram/02-company-management/invite-tenant-member`
- **Trạng thái Review:** `Source complete — awaiting rendering decision`

---

## 1. Mục đích và phạm vi

Tenant Admin mời nhân sự nội bộ bằng email và role. Người được mời mở link, đặt mật khẩu, trở thành `User` `ACTIVE` trong **đúng Tenant DB**. Không gồm đổi role (`COMPANY-03`) hay khóa/xóa (`COMPANY-04`). Không mời `CANDIDATE` (ứng viên tự đăng ký/OAuth).

## 2. Nguồn đã đối chiếu

- `TenantUserController` (`POST /api/v1/tenant/users`, `GET /api/v1/tenant/users`)
- `TenantUserService.createEmployee` (tạo user kèm password, `ACTIVE` ngay)
- `CreateEmployeeRequest`, `UserResponse`, `User`, `UserRole`, `UserStatus`
- `SecurityConfig`: `/api/v1/tenant/users/**` cần `TENANT_ADMIN` hoặc `ADMIN`
- `RabbitMqConfig` exchange `notify-email`
- `docs/features/Scheduling-Notifications/Email-Notifications.md`
- UI invite trong `TenantAdminDashboardPage.tsx` (email, tên, role — không password)

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Tenant Admin | Gửi lời mời. |
| Invitee | Nhận email, đặt mật khẩu. |
| Frontend SPA | Form mời và trang accept. |
| Spring Security | Mời: JWT admin. Accept: token mời, không dùng session invitee. |
| TenantWebInterceptor | Tenant context cho cả hai bước. |
| TenantUserController | Biên REST; method invite/accept là thiết kế mở rộng. |
| MemberInvitationService | Tạo invitation, accept thành user. |
| Tenant DB | `member_invitations` (thiết kế) + `users` (có thật). |
| RabbitMQ notify-email | Gửi mail kèm link; header `X-Tenant-ID`. |

## 4. Tiền điều kiện và hậu điều kiện

**Tiền điều kiện gửi:** tenant `ACTIVE`; caller `TENANT_ADMIN`/`ADMIN`; email chưa có trong `users`.

**Thành công gửi:** invitation `PENDING`, token hash, hết hạn 72 giờ; email đã publish; response **không** chứa raw token.

**Thành công accept:** `User` `ACTIVE` với role đã gán; invitation `ACCEPTED`; invitee vào trang login.

**Thất bại:** `401`/`403`; `400` role/token; `409` email trùng; invitation hết hạn/revoked.

## 5. Luồng chính và lỗi

Gửi: validate → unique email → hash token → insert PENDING → publish email.

Accept: hash token → tải invitation → kiểm hạn/status → insert user → đóng invitation.

Lỗi: email trùng, role `CANDIDATE`, token không hợp lệ.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

Interceptor có mặt vì invite ghi Tenant DB. RabbitMQ có mặt vì mail không đồng bộ trong HTTP. Invitee chỉ xuất hiện ở nhóm accept.

### 6.2. Diễn giải bước

**Gửi**

1. Admin nhập tên, email, role — trigger.
2. `POST /api/v1/tenant/users/invitations`.
3. 401/403: không tạo invitation.
4. Security → interceptor, `setCurrentTenant`.
5. Controller nhận request.
6. Validate email/tên/role.
7. `CANDIDATE` hoặc payload sai: `400`, chưa ghi.
8. `invite(request)`.
9. `existsByEmailIgnoreCase` trên `users`.
10. Email đã có: `409 EMAIL_EXISTS`.
11. Sinh token, hash, TTL 72h — raw token không persist.
12. Insert `MemberInvitation` `PENDING`.
13. Publish `notify-email` với `X-Tenant-ID` và URL accept (token trên URL, không trong log).
14. Queue accept.
15. `201` + `InvitationResponse` không raw token.
16. UI xác nhận; `clear()`.

**Accept**

17. Invitee mở link, đặt mật khẩu.
18. `POST .../invitations/accept`.
19. Tenant từ link/header; interceptor đặt context (endpoint public theo tenant, không JWT invitee).
20. Controller → `accept`.
21. Hash token submit.
22. `findByTokenHash`.
23. Thiếu/hết hạn/revoked/accepted: `400 INVALID_INVITATION` — cùng thông điệp để hạn chế dò token.
24. Insert `User` `ACTIVE`, BCrypt password, role từ invitation.
25. Invitation `ACCEPTED` + `acceptedUserId`.
26. `200 UserResponse`.
27. Redirect login.
28. `clear()` trên success và failure.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

### 7.1. Vai trò phần tử

| Phần tử | Loại | Vai trò |
|---|---|---|
| `MemberInvitationRoute` | conceptual API | Hai endpoint invite/accept. |
| `TenantUserController` | controller hiện có | Mở rộng từ create/list employee. |
| `InviteMemberRequest` | conceptual DTO | Không có password — khác `CreateEmployeeRequest`. |
| `AcceptInvitationRequest` | conceptual DTO | `token`/`password` write-only. |
| `InvitationResponse` | conceptual DTO | Metadata invitation. |
| `UserResponse` | DTO hiện có | Kết quả accept. |
| `MemberInvitationService` | conceptual | Tách khỏi `createEmployee` vì vòng đời token khác. |
| `EmailNotificationProducer` | conceptual | Bọc `notify-email`. |
| `MemberInvitation` | conceptual entity | Token hash, role, hạn, status. |
| `User` | entity hiện có | Tài khoản sau accept. |
| `UserRole` / `UserStatus` | enum hiện có | Role workspace; status `ACTIVE` khi accept. |
| `InvitationStatus` | conceptual enum | PENDING/ACCEPTED/EXPIRED/REVOKED. |
| Repositories | mix | Invitation conceptual; `UserRepository` hiện có. |
| RabbitMQ notify-email | queue hiện có topology | Worker mail. |

### 7.2. Quan hệ

| Nguồn → đích | Ký pháp | Loại và lý do |
|---|---|---|
| Route → Controller | `..>` | Dependency định tuyến. |
| Controller → Invite/Accept DTO | `..>` | Dependency input. |
| Controller → InvitationResponse / UserResponse | `..>` | Dependency output. |
| Controller → MemberInvitationService | `-->` | Association inject. |
| Service → MemberInvitationRepository | `-->` | Association persist invitation. |
| Service → UserRepository | `-->` | Association tạo user lúc accept. |
| Service → EmailNotificationProducer | `-->` | Association gửi mail. |
| Service → InviteMemberRequest | `..>` | Dependency input. |
| Producer → Queue | `..>` | Dependency publish, kèm tenant header. |
| User → UserRole / UserStatus | `-->` | Association typed-by. |
| MemberInvitation → UserRole | `-->` | Role sẽ copy sang User. |
| MemberInvitation → InvitationStatus | `-->` | Vòng đời invitation. |
| MemberInvitation → User | `-->` `0..1` | Association sau accept; không composition vì User sống độc lập. |
| Repositories → entities | `..>` | Dependency manage. |

## 8. Quyết định kiến trúc và bảo mật

- **Multi-tenant:** invitation và user cùng Tenant DB; mail worker restore/clear `TenantContext` từ `X-Tenant-ID`.
- **Authorization:** gửi lời mời cần admin tenant; accept dùng secret token, không dùng JWT invitee.
- **Transaction:** insert user + cập nhật invitation một transaction tenant; publish mail sau commit (hoặc outbox). Fail mail không xóa invitation — admin có thể resend (ngoài sơ đồ).
- **Secret:** raw token/password write-only, không log.
- **Khác code hiện tại:** `createEmployee` vẫn tạo user + password ngay; sơ đồ mô tả luồng Invite đúng UI.

## 9. Giả định

- `MemberInvitation` và endpoint invitations chưa có Flyway/API.
- TTL 72 giờ.
- `CANDIDATE` không mời qua function này.
- `UserRole` theo backend (`TENANT_ADMIN`, `ADMIN`, `HR`, `RECRUITER`), không theo nhãn mock UI.
- Accept không cấp JWT ngay — đồng bộ với AUTH login.

## 10. Render và file được tạo

| File | Metadata |
|---|---|
| [class-diagram.png](class-diagram.png) | PNG, ít nhất 300 DPI |
| [sequence-diagram.png](sequence-diagram.png) | PNG, ít nhất 300 DPI |

Đã kiểm tra trực quan. Không tạo SVG.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ./.agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/02-company-management/invite-tenant-member `
  -PlantUmlJar "$env:LOCALAPPDATA\PlantUML\plantuml-1.2026.7.jar" `
  -Format Png `
  -PngDpi 300
```

PlantUML 1.2026.7. Script xác minh DPI PNG ≥ 300 cho cả hai chiều.

## 11. Trạng thái review

`Complete with assumptions` — nguồn và PNG 300 DPI đã xong.
