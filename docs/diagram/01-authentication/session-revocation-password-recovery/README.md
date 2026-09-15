# AUTH-02 — Thu hồi Phiên & Khôi phục Mật khẩu (Session Revocation & Password Recovery)

## Mục đích và phạm vi

Chức năng này mô tả chi tiết 2 quy trình bảo mật cốt lõi trong vòng đời tài khoản người dùng:
1. **Đăng xuất & Thu hồi phiên (Logout / Session Revocation):** Vô hiệu hóa cặp token JWT đang sử dụng. Do JWT là Stateless, hệ thống kết hợp cơ chế **Redis Token Blacklist** và thu hồi Refresh Token để đảm bảo token bị chấm dứt hiệu lực tức thì.
2. **Quên & Đặt lại mật khẩu (Password Reset via OTP):** Cho phép người dùng khôi phục quyền truy cập thông qua mã xác thực một lần (OTP 6 chữ số) được tạo ngẫu nhiên, lưu tạm thời trên Redis và gửi qua hàng đợi RabbitMQ Email Queue.

Sơ đồ tuân thủ chặt chẽ tài liệu Software Design Document (SDD), phân đoạn rõ ràng hai luồng với các khối kích hoạt `activate/deactivate` chi tiết.

---

## Nguồn đã đối chiếu

- `AGENTS.md`, `DESIGN.md`
- `docs/features/Authentication/Login-JWT.md`
- Cơ chế Redis Blacklist & Refresh Token Storage
- Hàng đợi RabbitMQ `smarthire.notification.email`
- Bảng `users` trong Tenant Database

---

## Actor và thành phần tham gia

- **User (Staff / Candidate):** Người dùng có tài khoản mật khẩu cần đăng xuất hoặc khôi phục quyền truy cập.
- **Web Portal UI (Frontend SPA):** Giao diện gửi request kèm header `X-Tenant-ID`.
- **Security & Gateway (`TenantWebInterceptor` / Filter):** Kiểm tra trạng thái blacklist của token trước khi cho phép đi qua.
- **`SessionRecoveryController`:** Điểm tiếp nhận các endpoint `/logout`, `/forgot-password`, `/reset-password`.
- **`SessionRecoveryService`:** Quản lý quy trình hủy token, kiểm tra blacklist, sinh mã OTP và cập nhật mật khẩu băm.
- **`Dedicated Tenant MySQL`:** Lưu trữ và cập nhật `password_hash` mới của người dùng.
- **`Redis Cache`:** Quản lý danh sách đen `blacklist:token:{hash}`, Refresh Token `tenant:{id}:refresh:{userId}` và mã OTP `tenant:{id}:otp:{email}`.
- **`RabbitMQ Exchange`:** Tiếp nhận tác vụ gửi email bất đồng bộ.

---

## Tiền điều kiện và hậu điều kiện

### Tiền điều kiện:
- Với Đăng xuất: Request mang theo Access Token hợp lệ trong header `Authorization: Bearer`.
- Với Đặt lại mật khẩu: Người dùng cung cấp đúng mã OTP còn hạn (trong vòng 15 phút).

### Hậu điều kiện khi thành công:
- **Đăng xuất:** Refresh Token bị xóa; Access Token được đưa vào Redis Blacklist với TTL bằng thời gian sống còn lại của token.
- **Đặt lại mật khẩu:** Mật khẩu mới được băm BCrypt lưu vào Tenant DB; mã OTP bị xóa; toàn bộ Refresh Token của các phiên đăng nhập cũ bị hủy bỏ trên Redis.

### Hậu điều kiện khi thất bại:
- Mã OTP sai hoặc quá hạn: Trả về HTTP `400 Bad Request`.
- Token bị đưa vào blacklist: Gateway chặn ngay với HTTP `401 Unauthorized`.

---

## Luồng hoạt động tuần tự (Sequence Walkthrough)

### 1. Luồng Đăng xuất & Thu hồi Phiên (Session Revocation)
1. **Bước 1-5:** Người dùng bấm "Đăng xuất". UI gửi `POST /api/v1/tenant/auth/logout`. Gateway kiểm tra token không nằm trong blacklist và chuyển tiếp tới Controller.
2. **Bước 6-10:** Controller gọi Service. Service xóa Refresh Token trên Redis và ghi Access Token vào `blacklist:token:{hash}` với TTL bằng thời gian hết hạn còn lại của token.
3. **Bước 11-13:** Trả về HTTP `200 OK`. Frontend dọn sạch token trong LocalStorage và điều hướng về trang Login.

### 2. Luồng Quên & Đặt lại Mật khẩu (Password Recovery)
1. **Bước 14-19 (Gửi yêu cầu):** Người dùng nhập email. UI gửi `POST /api/v1/tenant/auth/forgot-password`. Service kiểm tra email trong Tenant DB.
2. **Bước 20-24:** Nếu tài khoản tồn tại, sinh OTP 6 số lưu Redis (TTL 15m) và đẩy sự kiện `PasswordResetEmailEvent` sang RabbitMQ gửi email.
3. **Bước 25-26 (Anti-Enumeration):** Dù tài khoản có tồn tại hay không, hệ thống luôn trả về thông điệp chung `If account exists, OTP was sent` để bảo vệ quyền riêng tư.
4. **Bước 27-32 (Xác thực OTP):** Người dùng nhập OTP + Mật khẩu mới gửi tới `/api/v1/tenant/auth/reset-password`. Service đọc OTP từ Redis.
5. **Bước 33-35:** Nếu OTP sai hoặc quá hạn, trả về HTTP `400 Bad Request`.
6. **Bước 36-45:** Nếu OTP chính xác, băm mật khẩu mới bằng BCrypt và cập nhật vào Tenant DB; xóa OTP và hủy các phiên đăng nhập cũ trên Redis; trả về thông báo thành công.

---

## Chi tiết Class Diagram

### Vai trò các thành phần

| Thành phần | Loại | Vai trò |
|---|---|---|
| `SessionRecoveryRoute` | `<<REST API>>` conceptual | Định tuyến API đăng xuất, quên mật khẩu và đặt lại mật khẩu. |
| `SessionRecoveryController` | `<<Controller>>` | Tiếp nhận và điều phối các yêu cầu quản lý phiên & mật khẩu. |
| `ForgotPasswordRequest` | `<<Request>>` | DTO yêu cầu gửi mã OTP qua email. |
| `ResetPasswordRequest` | `<<Request>>` | DTO chứa email, OTP và mật khẩu mới `{write-only}`. |
| `PasswordResetEmailEvent` | `<<Domain Event>>` | DTO sự kiện gửi email qua RabbitMQ. |
| `SessionRecoveryService` / `Impl` | `<<Service>>` | Quản lý hủy phiên, blacklist, sinh/kiểm tra OTP và đổi mật khẩu. |
| `UserRepository` | `<<Repository>>` | Thao tác JPA cập nhật bảng `users`. |
| `User` | `<<Entity>>` | Thực thể người dùng trong Tenant DB. |
| `DedicatedTenantMySQL` | `<<Database>>` | Cơ sở dữ liệu riêng của Tenant. |
| `RedisCache` | `<<Cache>>` | Lưu trữ Blacklist token, Refresh Token và OTP. |
| `RabbitMQExchange` | `<<Queue>>` | Hàng đợi gửi email bất đồng bộ. |

### Giải thích các đường nối UML

| Nguồn → đích | Ký pháp | Loại quan hệ và lý do sử dụng |
|---|---|---|
| `SessionRecoveryRoute → SessionRecoveryController` | `..>` | **Dependency**: Route ánh xạ tới Controller. |
| `SessionRecoveryController → ForgotPasswordRequest` | `..>` | **Dependency**: Controller nhận DTO quên mật khẩu. |
| `SessionRecoveryController → ResetPasswordRequest` | `..>` | **Dependency**: Controller nhận DTO đổi mật khẩu. |
| `SessionRecoveryController → SessionRecoveryService` | `-->` | **Directed association**: Controller gọi Service xử lý. |
| `SessionRecoveryService <\|.. SessionRecoveryServiceImpl` | `<\|..` | **Realization**: Lớp triển khai thực hiện Interface Service. |
| `SessionRecoveryServiceImpl → UserRepository` | `-->` | **Directed association**: Cập nhật mật khẩu băm mới. |
| `SessionRecoveryServiceImpl → RedisCache` | `-->` | **Directed association**: Quản lý Blacklist và kiểm tra OTP. |
| `SessionRecoveryServiceImpl → RabbitMQExchange` | `-->` | **Directed association**: Phát sự kiện gửi email OTP. |
| `UserRepository → User` | `-->` | **Navigable association**: Quản lý thực thể User. |
| `UserRepository → DedicatedTenantMySQL` | `-->` | **Directed association**: Thao tác trực tiếp trên Tenant MySQL. |

---

## Quyết định kiến trúc & Bảo mật

1. **Stateful Logout trên Stateless JWT:** Kết hợp Redis Blacklist với thời gian sống (TTL) tương ứng với thời hạn còn lại của token giúp hệ thống vừa giữ được ưu điểm Stateless của JWT, vừa cho phép thu hồi token ngay lập tức khi đăng xuất.
2. **Bảo vệ chống vét cạn tài khoản (Anti-Enumeration):** Endpoint `/forgot-password` luôn trả về HTTP 200 kèm thông điệp chung bất kể email có tồn tại hay không.
3. **Bảo mật Multi-Tenant:** Header `X-Tenant-ID` được đính kèm trong message RabbitMQ để worker sử dụng đúng template email và thương hiệu của doanh nghiệp.

---

## Render và file được tạo

- `class-diagram.puml`: Mã nguồn PlantUML Class Diagram
- `sequence-diagram.puml`: Mã nguồn PlantUML Sequence Diagram
- `class-diagram.png`: Ảnh PNG độ phân giải cao 300 DPI (chuẩn SDD đồ án tốt nghiệp)
- `sequence-diagram.png`: Ảnh PNG độ phân giải cao 300 DPI (chuẩn SDD đồ án tốt nghiệp)

---

## Trạng thái review

**Complete** — Đã hoàn tất mã nguồn, tài liệu SDD chi tiết và render toàn bộ ảnh PNG 300 DPI verified.
