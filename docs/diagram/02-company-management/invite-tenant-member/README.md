# COMPANY-02 — Mời thành viên Tenant

- **Mã Feature:** `COMPANY` / `02-company-management`
- **Mã Function:** `invite-tenant-member`
- **Thư mục:** `docs/diagram/02-company-management/invite-tenant-member`
- **Trạng thái Review:** `Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.

---

## 1. Mục đích và phạm vi

Cho phép Tenant Admin gửi lời mời qua email cho nhân sự mới tham gia vào workspace doanh nghiệp với vai trò được định sẵn (Admin, HR, Recruiter). Lời mời sinh ra một token duy nhất có thời hạn (72 giờ). Người được mời nhận email, mở liên kết và thiết lập mật khẩu để hoàn tất tạo tài khoản.

## 2. Nguồn đã đối chiếu

- Feature docs: `docs/features/Authentication/Onboarding.md`
- Entity: `MemberInvitation`, `User`, `InvitationStatus`, `UserRole`
- Service & Controller: `TenantUserController`, `MemberInvitationService`
- Messaging: `RabbitMQ`, `EmailNotificationProducer`

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Tenant Admin | Nhập thông tin thành viên (Họ tên, email, vai trò) và kích hoạt gửi lời mời. |
| Invitee | Người nhận lời mời, mở link kích hoạt và thiết lập mật khẩu cá nhân. |
| Frontend SPA | Giao diện gửi request và form kích hoạt tài khoản. |
| Spring Security | Kiểm tra phân quyền truy cập endpoint lời mời. |
| TenantWebInterceptor | Giải mã subdomain/header thiết lập `TenantContext`. |
| TenantUserController | Tiếp nhận request `POST /invitations` và `POST /invitations/accept`. |
| MemberInvitationService | Xử lý sinh token hash, kiểm tra email trùng, lưu lời mời và tạo user. |
| MemberInvitationRepository | Thao tác CRUD dữ liệu bảng `member_invitations`. |
| UserRepository | Thao tác dữ liệu bảng `users`. |
| RabbitMQ | Queue bất đồng bộ `notify.email.q` gửi email kích hoạt chứa token. |

## 4. Tiền điều kiện và hậu điều kiện

- **Tiền điều kiện:** Tenant đang `ACTIVE`; Người gọi có quyền Admin; Email được mời chưa tồn tại trong Tenant DB này.
- **Thành công:** Bản ghi `MemberInvitation` được khởi tạo với trạng thái `PENDING`; Email chứa link chấp nhận được đẩy vào RabbitMQ; Khi Invitee chấp nhận: Bản ghi `User` được tạo mới với trạng thái `ACTIVE` và lời mời chuyển sang `ACCEPTED`.
- **Thất bại:** `401`/`403` Access Error; `400 Bad Request` (Email invalid, Role invalid/CANDIDATE); `409 Conflict` (Email đã đăng ký); Token hết hạn hoặc không hợp lệ khi accept.

## 5. Luồng chính và lỗi

1. **Luồng gửi lời mời:**
   - Admin nhập email, họ tên, role -> Gọi `POST /api/v1/tenant/users/invitations`.
   - Hệ thống kiểm tra xem email đã tồn tại trong DB chưa. Nếu đã có -> Trả về `409 Conflict`.
   - Hệ thống sinh ngẫu nhiên Token, băm băm bằng SHA-256 (`tokenHash`), lưu bản ghi `MemberInvitation` (hạn 72h).
   - Phát sự kiện qua `RabbitMQ` để gửi email chứa link chấp nhận.

2. **Luồng chấp nhận lời mời:**
   - Người được mời click link từ email -> Mở form thiết lập mật khẩu.
   - Gửi `POST /api/v1/tenant/users/invitations/accept` chứa token băm và mật khẩu.
   - Hệ thống kiểm tra token. Nếu token hết hạn, bị thu hồi hoặc đã chấp nhận -> Trả về `400 Bad Request`.
   - Nếu hợp lệ: Tạo mới bản ghi `User` (`ACTIVE`), mã hóa mật khẩu bằng BCrypt, cập nhật trạng thái `MemberInvitation` thành `ACCEPTED`.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

- `Admin`: Người khởi tạo lời mời.
- `Invitee`: Người nhận và chấp nhận lời mời.
- `UI`: Single Page Application frontend.
- `Security`: Spring Security authorization context.
- `Interceptor`: `TenantWebInterceptor` gán Tenant ID vào luồng request.
- `Controller`: `TenantUserController` tiếp nhận REST API request.
- `Service`: `MemberInvitationService` quản lý vòng đời lời mời.
- `TenantDB`: Cơ sở dữ liệu riêng của Tenant.
- `RabbitMQ`: Message broker gửi email không bất đồng bộ.

### 6.2. Diễn giải chi tiết các bước

1. Admin gửi thông tin lời mời -> `UI` gọi `POST /api/v1/tenant/users/invitations`.
2. `Spring Security` xác thực quyền. `Interceptor` cài đặt `TenantContext`.
3. `Controller` validate dữ liệu: Chặn gán role `CANDIDATE`.
4. `Service` gọi `UserRepository.existsByEmailIgnoreCase`: Nếu đã tồn tại -> Trả về 409 Conflict.
5. Nếu email hợp lệ -> `Service` sinh băm token, đặt hạn 72h, lưu bản ghi `MemberInvitation` PENDING vào `TenantDB`.
6. `Service` gọi `RabbitMQ.publishMemberInvite` đính kèm `X-Tenant-ID` header. Trả về HTTP 201 Created.
7. Khi Invitee mở link và nhập mật khẩu -> `UI` gọi `POST /invitations/accept`.
8. `Service` băm token gửi lên, truy vấn `MemberInvitationRepository.findByTokenHash`.
9. Nếu không hợp lệ hoặc hết hạn -> Trả về 400 Bad Request.
10. Nếu hợp lệ -> `Service` tạo bản ghi `User` mới (ACTIVE, BCrypt password), chuyển `MemberInvitation` sang `ACCEPTED`, trả về HTTP 200 OK.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **Application-design**. Kiến trúc phân tầng Controller -> DTO -> Service -> Repository -> Entity -> Infrastructure.

### 7.1. Vai trò phần tử

| Phần tử | StereoType | Vai trò |
|---|---|---|
| `TenantUserController` | `<<Controller>>` | Controller xử lý request gửi/chấp nhận lời mời. |
| `InviteMemberRequest` | `<<Request>>` | DTO chứa thông tin mời (email, name, role). |
| `AcceptInvitationRequest` | `<<Request>>` | DTO chứa token băm và mật khẩu của invitee. |
| `InvitationResponse` | `<<Response>>` | DTO phản hồi thông tin lời mời vừa tạo. |
| `UserResponse` | `<<Response>>` | DTO phản hồi thông tin user sau khi kích hoạt thành công. |
| `MemberInvitationService` | `<<Service>>` | Interface nghiệp vụ quản lý lời mời. |
| `MemberInvitationServiceImpl` | `<<Service>>` | Implementation thực thi băm token và tạo user. |
| `MemberInvitationRepository` | `<<Repository>>` | Repository quản lý entity `MemberInvitation`. |
| `UserRepository` | `<<Repository>>` | Repository quản lý entity `User`. |
| `MemberInvitation` | `<<Entity>>` | Thực thể lưu thông tin lời mời. |
| `User` | `<<Entity>>` | Thực thể người dùng tenant. |
| `EmailNotificationProducer` | `<<Messaging Port>>` | Port phát tin nhắn gửi email qua RabbitMQ. |
| `DedicatedTenantMySQL` | `<<Database>>` | Cơ sở dữ liệu riêng của Tenant. |
| `RabbitMQBroker` | `<<Queue>>` | Message broker RabbitMQ queue `notify.email.q`. |

### 7.2. Quan hệ giữa các lớp

- `TenantUserController --> MemberInvitationService`: Ủy quyền nghiệp vụ (`delegates >`).
- `TenantUserController ..> InviteMemberRequest`: Nhận dữ liệu đầu vào (`consumes >`).
- `TenantUserController ..> AcceptInvitationRequest`: Nhận dữ liệu chấp nhận (`consumes >`).
- `MemberInvitationServiceImpl ..|> MemberInvitationService`: Hiện thực hóa interface (`implements`).
- `MemberInvitationServiceImpl --> MemberInvitationRepository`: Lưu trữ bản ghi lời mời (`persists invitations >`).
- `MemberInvitationServiceImpl --> UserRepository`: Tạo và quản lý tài khoản (`manages users >`).
- `MemberInvitationServiceImpl --> EmailNotificationProducer`: Phát sự kiện email (`publishes email event >`).
- `EmailNotificationProducer --> RabbitMQBroker`: Đẩy thông điệp vào queue (`publishes message >`).
- `MemberInvitationRepository --> DedicatedTenantMySQL`: Quản lý lưu trữ (`persists to >`).
- `MemberInvitation "0..1" --> "0..1" User`: Chuyển đổi thành tài khoản user khi chấp nhận (`accepted as >`).

## 8. Quyết định kiến trúc và bảo mật

- **Token Security:** Token ngẫu nhiên chỉ xuất hiện trong email link gửi tới người dùng. CSDL chỉ lưu bản băm SHA-256 (`tokenHash`) để tránh lộ token nếu DB bị chiếm quyền đọc.
- **Asynchronous Emailing:** Gửi email thông qua RabbitMQ để tránh làm chậm HTTP response time của Admin.
- **Isolation:** Quá trình kích hoạt tài khoản sử dụng Tenant ID truyền qua Header/Subdomain để đảm bảo User được tạo đúng trong Tenant DB tương ứng.

## 9. Giả định

- Thời gian hết hạn mặc định của lời mời là 72 giờ.
- Không hỗ trợ mời vai trò `CANDIDATE` qua luồng lời mời làm việc của công ty.

## 10. Hướng dẫn Render sơ đồ

Khi có yêu cầu xuất ảnh PNG từ người dùng:
```powershell
pwsh .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/02-company-management/invite-tenant-member -Format Png -PngDpi 300
```

## 11. Trạng thái Review

`Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.
