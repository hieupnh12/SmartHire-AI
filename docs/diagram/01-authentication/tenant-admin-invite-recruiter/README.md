# AUTH-01 / AUTH-04 — Mời và Cấp tài khoản Nhân sự Tuyển dụng (Tenant Admin Invite Recruiter)

## Mục đích và phạm vi

Chức năng này mô tả quy trình dành riêng cho Quản trị viên Doanh nghiệp (`TENANT_ADMIN` / `ADMIN`) chủ động mời và khởi tạo tài khoản cho chuyên viên tuyển dụng (`RECRUITER`) hoặc thành viên hội đồng phỏng vấn vào không gian làm việc (Workspace Tenant).
Do hệ thống SmartHire-AI áp dụng cơ chế xác thực hiện đại:
1. Ứng viên (`CANDIDATE`) tự động đăng nhập 1-click qua Google OAuth và được khởi tạo tài khoản tức thì (JIT Provisioning).
2. Người dùng nội bộ doanh nghiệp không được đăng ký tự do từ bên ngoài mà bắt buộc phải được Quản trị viên workspace mời/khởi tạo để đảm bảo bảo mật và cô lập dữ liệu.

Class diagram sử dụng **góc nhìn thiết kế ứng dụng (application-design view)** tinh gọn, tập trung vào chuỗi phụ thuộc `Route → Controller → Request/Response DTO → Service → Repository → Entity` và kho lưu trữ. Sequence diagram sử dụng `hide footbox` và thanh kích hoạt (`activate/deactivate`) chuẩn xác theo từng nhánh.

---

## Nguồn đã đối chiếu

- `AGENTS.md`, `DESIGN.md`
- `docs/features/Authentication/User-Registration.md` (`AUTH-01`)
- `docs/features/Authentication/RBAC.md` (`AUTH-04`)
- `docs/features/Authentication/Tenant-Onboarding.md`
- Entity `User`, `UserProfile`, Enums `UserRole`, `UserStatus`
- Tenant migration `V1__init_tenant_schema.sql`, `V2__product_backlog_schema.sql`

---

## Actor và thành phần tham gia

- **Tenant Admin (HR Lead / Org Admin):** Quản trị viên của tenant, người có thẩm quyền quản lý thành viên và cấp quyền.
- **Tenant Admin UI (Frontend SPA):** Giao diện quản trị thành viên workspace, gửi request kèm header `X-Tenant-ID` và JWT Bearer.
- **Security & Gateway (`TenantWebInterceptor` / Filter):** Xác thực định danh tenant, giải mã JWT và kiểm tra quyền `ADMIN`/`TENANT_ADMIN`.
- **`TenantUserController`:** Tiếp nhận yêu cầu REST API tại endpoint `/api/v1/tenant/users/invite`.
- **`TenantUserService`:** Thực hiện logic nghiệp vụ kiểm tra email trùng, lưu user với trạng thái `INVITED`, khởi tạo profile trống, sinh token kích hoạt và gửi task email.
- **`Dedicated Tenant MySQL`:** Cơ sở dữ liệu riêng biệt của doanh nghiệp, lưu trữ bảng `users` và `user_profiles`.
- **`Redis Cache`:** Lưu trữ invitation token kèm TTL 48 giờ để phục vụ luồng kích hoạt tài khoản / đặt mật khẩu lần đầu.
- **`RabbitMQ Exchange`:** Hàng đợi nhận message sự kiện mời thành viên để worker xử lý gửi email bất đồng bộ.

---

## Tiền điều kiện và hậu điều kiện

### Tiền điều kiện:
- Tenant đã được khởi tạo và ở trạng thái `ACTIVE`.
- Người thực hiện đã đăng nhập với vai trò `ADMIN` hoặc `TENANT_ADMIN` trong tenant đó.
- Request đính kèm header `X-Tenant-ID` và `Authorization: Bearer <Admin_JWT>`.

### Hậu điều kiện khi thành công:
- Bản ghi `User` mới được tạo trong MySQL riêng của Tenant với `role = RECRUITER`, `status = INVITED`, `password_hash = NULL`.
- Bản ghi `UserProfile` mặc định được khởi tạo liên kết 1-1 với user mới.
- Một invitation token ngẫu nhiên bảo mật cao được lưu vào Redis theo key `tenant:{id}:invite:{token}` có hạn sử dụng 48 giờ.
- Sự kiện `RecruiterInvitationEvent` được đẩy vào RabbitMQ kèm header `X-Tenant-ID` để gửi email chứa link kích hoạt tài khoản cho nhân sự.
- Trả về HTTP `201 Created` kèm thông tin tóm tắt `UserResponse`.

### Hậu điều kiện khi thất bại:
- Token không hợp lệ hoặc không phải Admin: Trả về HTTP `403 Forbidden`.
- Email nhân sự đã tồn tại trong tenant: Trả về HTTP `409 Conflict`.
- Dữ liệu request không hợp lệ: Trả về HTTP `400 Bad Request`.

---

## Luồng hoạt động tuần tự (Sequence Walkthrough)

1. **Bước 1-2:** Admin nhập thông tin nhân sự (email, họ tên, vai trò) trên UI và nhấn "Gửi lời mời". UI gửi request `POST /api/v1/tenant/users/invite` kèm `X-Tenant-ID` và Access Token.
2. **Bước 3-5:** Gateway giải mã header, nạp `TenantContext`, xác thực JWT. Nếu không có quyền Admin, từ chối ngay với HTTP `403 Forbidden`.
3. **Bước 6-7:** Gateway chuyển tiếp request tới `TenantUserController`, controller ủy thác cho `TenantUserService.inviteRecruiter()`.
4. **Bước 8-12:** Service truy vấn `Dedicated Tenant MySQL` để kiểm tra email. Nếu email đã tồn tại, ném `EmailAlreadyExistsException`, trả về HTTP `409 Conflict`.
5. **Bước 13-18:** Nếu email chưa tồn tại, service tạo đối tượng `User` (`status: INVITED`, `passwordHash: null`), lưu vào DB để lấy `generated id`. Tiếp tục khởi tạo `UserProfile` gắn kèm và lưu vào bảng `user_profiles`.
6. **Bước 19-21:** Service sinh mã kích hoạt (invitation token secure UUID) và lưu vào Redis Cache `tenant:{id}:invite:{token}` với TTL 48h.
7. **Bước 22-23:** Service phát sự kiện `RecruiterInvitationEvent` sang RabbitMQ Exchange qua topic `smarthire.notification.email`, đính kèm header `X-Tenant-ID`.
8. **Bước 24-26:** Service trả về `UserResponse`, controller trả về HTTP `201 Created`. UI cập nhật danh sách nhân sự ở trạng thái "Đã gửi lời mời" (`INVITED`).

---

## Chi tiết Class Diagram

### Vai trò các thành phần

| Thành phần | Loại | Vai trò |
|---|---|---|
| `TenantUserRoute` | `<<REST API>>` conceptual | Khai báo endpoint mời người dùng trong không gian làm việc tenant. |
| `TenantUserController` | `<<Controller>>` | Tiếp nhận request REST, validate dữ liệu đầu vào và gọi service. |
| `InviteRecruiterRequest` | `<<Request>>` | DTO chứa thông tin mời (`email`, `fullName`, `role`). |
| `UserResponse` | `<<Response>>` | DTO trả về thông tin người dùng được tạo. |
| `RecruiterInvitationEvent` | `<<Domain Event>>` | DTO thông điệp đẩy sang RabbitMQ để worker gửi email kích hoạt. |
| `TenantUserService` / `Impl` | `<<Service>>` | Quản lý nghiệp vụ thêm/mời thành viên, tạo profile, sinh token và bắn event. |
| `UserRepository` | `<<Repository>>` | Thao tác dữ liệu JPA trên bảng `users` của Tenant DB. |
| `UserProfileRepository` | `<<Repository>>` | Thao tác dữ liệu JPA trên bảng `user_profiles` của Tenant DB. |
| `User` | `<<Entity>>` | Thực thể người dùng trong cơ sở dữ liệu tenant. |
| `UserProfile` | `<<Entity>>` | Thực thể hồ sơ người dùng trong cơ sở dữ liệu tenant. |
| `DedicatedTenantMySQL` | `<<Database>>` | Cơ sở dữ liệu MySQL riêng biệt của từng tenant. |
| `RedisCache` | `<<Cache>>` | Quản lý token lời mời tạm thời có thời hạn. |
| `RabbitMQExchange` | `<<Queue>>` | Hàng đợi tin nhắn gửi email bất đồng bộ. |

### Giải thích các đường nối UML

| Nguồn → đích | Ký pháp | Loại quan hệ và lý do sử dụng |
|---|---|---|
| `TenantUserController → InviteRecruiterRequest` | `..>` | **Dependency**: Controller nhận DTO request làm tham số (`consumes >`). |
| `TenantUserController → TenantUserService` | `-->` | **Directed association**: Controller phụ thuộc và gọi Service xử lý. |
| `TenantUserController → UserResponse` | `..>` | **Dependency**: Controller trả về response DTO. |
| `TenantUserServiceImpl ..|> TenantUserService` | `<\|..` | **Realization**: Lớp triển khai hiện thực hóa Interface service. |
| `TenantUserServiceImpl → UserRepository` | `-->` | **Directed association**: Service tiêm (inject) và gọi UserRepository. |
| `TenantUserServiceImpl → UserProfileRepository` | `-->` | **Directed association**: Service tiêm và gọi UserProfileRepository. |
| `TenantUserServiceImpl → RedisCache` | `-->` | **Directed association**: Service lưu trữ token kích hoạt vào Redis. |
| `TenantUserServiceImpl → RabbitMQExchange` | `-->` | **Directed association**: Service phát thông điệp sự kiện sang RabbitMQ. |
| `UserProfile → User` | `*--` | **Composition**: Mỗi Profile gắn liền và thuộc quyền sở hữu duy nhất của 1 User (`user_id`). |
| `UserRepository → User` | `-->` | **Navigable association**: Repository quản lý và trả về thực thể User. |
| `UserProfileRepository → UserProfile` | `-->` | **Navigable association**: Repository quản lý và trả về thực thể UserProfile. |
| `UserRepository → DedicatedTenantMySQL` | `-->` | **Directed association**: Repository thao tác trực tiếp trên Tenant MySQL. |
| `UserProfileRepository → DedicatedTenantMySQL` | `-->` | **Directed association**: Repository thao tác trực tiếp trên Tenant MySQL. |

---

## Quyết định kiến trúc & Bảo mật

1. **Không mở API đăng ký công khai:** Loại bỏ nguy cơ người ngoài tự do đăng ký tài khoản nội bộ vào tenant database.
2. **Quyền hạn tuyệt đối:** Chỉ tài khoản mang vai trò `ADMIN` hoặc `TENANT_ADMIN` mới được phép truy cập endpoint `/api/v1/tenant/users/invite`.
3. **Mật khẩu an toàn:** Khi tạo lời mời, trường `password_hash` được để `NULL`. Nhân sự sau khi nhận email sẽ bấm link kích hoạt (chứa token Redis) để tự đặt mật khẩu riêng của mình.
4. **Bảo toàn Multi-Tenant:** Luôn truyền `X-Tenant-ID` trong RabbitMQ header để worker email biết xử lý gửi thư theo đúng mẫu thương hiệu của tenant.

---

## Render và file được tạo

- `class-diagram.puml`: Mã nguồn PlantUML Class Diagram
- `sequence-diagram.puml`: Mã nguồn PlantUML Sequence Diagram
- `class-diagram.png`: Ảnh PNG độ phân giải cao 300 DPI (đạt chuẩn in ấn/báo cáo đồ án tốt nghiệp)
- `sequence-diagram.png`: Ảnh PNG độ phân giải cao 300 DPI (đạt chuẩn in ấn/báo cáo đồ án tốt nghiệp)

---

## Trạng thái review

**Complete** — Mã nguồn PlantUML, tài liệu giải thích chi tiết và toàn bộ ảnh PNG (300 DPI verified, không xuất SVG) đã được biên dịch thành công, kiểm tra trực quan đạt chuẩn đồ án tốt nghiệp.
