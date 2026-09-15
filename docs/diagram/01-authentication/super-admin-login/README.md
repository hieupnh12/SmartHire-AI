# AUTH-02 — Đăng nhập Quản trị viên Nền tảng (Platform Super Admin Login)

## Mục đích và phạm vi

Chức năng này mô tả quy trình xác thực danh tính cho Quản trị viên Nền tảng (Platform Super Admin / Workspace Admin) trên hệ thống SmartHire-AI SaaS. Khác với quy trình đăng nhập của doanh nghiệp (Tenant Auth) vốn chạy trên cơ sở dữ liệu riêng của từng khách hàng, việc đăng nhập Quản trị viên Nền tảng hoàn toàn diễn ra trên **Master Database (PostgreSQL)**, quản lý thông qua thực thể `PlatformUser` và giao dịch `masterTransactionManager`.

Sơ đồ thể hiện quy trình tiếp nhận request, kiểm tra định dạng dữ liệu, đối chiếu thông tin trong bảng `platform_users`, kiểm tra trạng thái kích hoạt tài khoản, xác thực mật khẩu qua thuật toán BCrypt và cấp phát token JWT có claim thẩm quyền `WORKSPACE_ADMIN` hoặc `SUPER_ADMIN`.

Class diagram sử dụng **góc nhìn thiết kế ứng dụng (application-design view)** ở mức phù hợp cho đồ án tốt nghiệp, làm nổi bật chuỗi `MasterAuthRoute → MasterAuthController → MasterLoginRequest/Response → MasterAuthService → PlatformUserRepository → PlatformUser → Master PostgreSQL`. Sequence diagram ẩn hàng participant lặp lại ở đáy (`hide footbox`) và sử dụng thanh kích hoạt (`activate/deactivate`) rõ ràng cho từng nhánh.

---

## Nguồn đã đối chiếu

- `AGENTS.md`, `DESIGN.md`
- `docs/features/Authentication/Login-JWT.md`
- `docs/features/Authentication/RBAC.md`
- `docs/features/Authentication/Tenant-Onboarding.md`
- `backend/src/main/java/com/smarthire/config/SecurityConfig.java`
- `backend/src/main/java/com/smarthire/master/admin/controller/MasterAuthController.java`
- `backend/src/main/java/com/smarthire/master/admin/service/MasterAuthService.java`
- `backend/src/main/java/com/smarthire/master/admin/dto/MasterLoginRequest.java`
- `backend/src/main/java/com/smarthire/master/admin/dto/MasterLoginResponse.java`
- `backend/src/main/java/com/smarthire/master/admin/dto/PlatformUserResponse.java`
- `backend/src/main/java/com/smarthire/domain/master/entity/PlatformUser.java`
- `backend/src/main/java/com/smarthire/domain/master/repository/PlatformUserRepository.java`
- `backend/src/main/java/com/smarthire/security/JwtTokenProvider.java`
- `backend/src/main/resources/db/migration/master/V1__init_master_schema.sql`
- `frontend/src/features/master/auth/pages/MasterLoginPage.tsx`, `frontend/src/api/master/masterAuthApi.ts`

---

## Actor và thành phần tham gia

Actor chính là **Platform Super Admin** (Quản trị viên nền tảng SaaS). Giao diện người dùng `Master Login UI` (React) thu thập thông tin đăng nhập và gọi API quản trị. `Spring Security` hoạt động như gateway bảo vệ; đối với endpoint này, nó cho phép truy cập công khai (permit all) mà không đòi hỏi Bearer token hay header tenant. `MasterAuthController` tiếp nhận REST request và chuyển giao cho `MasterAuthService`. `MasterAuthService` thực hiện nghiệp vụ tìm kiếm người dùng trong PostgreSQL, kiểm tra trạng thái hoạt động, đối chiếu băm mật khẩu và sinh mã JWT thông qua `JwtTokenProvider`. `Master PostgreSQL` lưu trữ bảng dữ liệu nền tảng `platform_users`.

---

## Tiền điều kiện và hậu điều kiện

### Tiền điều kiện:
- Tài khoản quản trị viên nền tảng đã được khởi tạo sẵn trong cơ sở dữ liệu Master PostgreSQL (thông qua migration hoặc bootstrap môi trường).
- Endpoint `POST /api/v1/master/auth/login` được cấu hình mở công khai trong `SecurityConfig`.
- Không yêu cầu header `X-Tenant-ID` hay subdomain vì use case thuộc phạm vi quản trị đa khách hàng.

### Hậu điều kiện khi thành công:
- Trả về mã phản hồi HTTP `200 OK` kèm JWT Access Token có thời hạn hợp lệ, gắn kèm claim `role = WORKSPACE_ADMIN` và `tenantId = smarthire_master`.
- Giao diện người dùng lưu token vào `localStorage` (khóa `master_access_token`) và điều hướng tới bảng điều khiển quản trị nền tảng `/admin/dashboard`.

### Hậu điều kiện khi thất bại:
- Request rỗng hoặc sai định dạng email trả về `400 Bad Request`.
- Email không tồn tại hoặc mật khẩu không khớp trả về `401 Unauthorized` kèm thông điệp chung `Invalid email or password`.
- Tài khoản ở trạng thái khác `ACTIVE` (ví dụ `SUSPENDED` hoặc `LOCKED`) trả về `403 Forbidden` kèm thông điệp `Platform admin account is disabled`.

---

## Luồng chính

1. Quản trị viên nhập email và mật khẩu tại trang `MasterLoginPage` và nhấn Đăng nhập.
2. Giao diện gửi yêu cầu HTTP `POST /api/v1/master/auth/login`.
3. `Spring Security` xác nhận endpoint nằm trong danh sách được phép truy cập tự do và chuyển tiếp tới `MasterAuthController`.
4. `MasterAuthController` kiểm tra tính hợp lệ về cấu trúc dữ liệu (`@Valid`).
5. `MasterAuthService` mở transaction chỉ đọc trên `masterTransactionManager` và truy vấn bảng `platform_users` qua `PlatformUserRepository`.
6. Hệ thống xác nhận tài khoản tồn tại và đang ở trạng thái `ACTIVE`.
7. `MasterAuthService` dùng `PasswordEncoder` (BCrypt) đối chiếu mật khẩu người dùng nhập với `password_hash` được lưu trữ.
8. Mật khẩu khớp, `JwtTokenProvider` tạo JWT token chứa các claim nền tảng.
9. Controller trả về `200 OK` cùng payload `MasterLoginResponse`.
10. Giao diện lưu token và điều hướng vào trang quản trị `/admin/dashboard`.

---

## Luồng thay thế và lỗi

- **Dữ liệu đầu vào không hợp lệ:** Trả về `400 Bad Request` ngay tại tầng Controller, không truy vấn database.
- **Tài khoản không tồn tại:** Ném ngoại lệ nghiệp vụ và trả về `401 Unauthorized`.
- **Tài khoản bị khóa / ngưng hoạt động:** Trả về `403 Forbidden` (`Platform admin account is disabled`).
- **Mật khẩu không chính xác:** Trả về `401 Unauthorized`. Cả hai trường hợp sai email hoặc sai mật khẩu đều dùng chung một thông điệp lỗi nhằm ngăn chặn kỹ thuật tấn công đoán tài khoản (User Enumeration).

---

## Giải thích sơ đồ

### Sequence diagram

#### Vai trò các thành phần

| Thành phần | Trách nhiệm trong luồng |
|---|---|
| `Platform Super Admin` | Khởi tạo thao tác nhập email, mật khẩu quản trị và nhận phiên làm việc. |
| `Master Login UI` | Giao diện thu thập dữ liệu, gửi HTTP POST và lưu trữ `master_access_token`. |
| `Spring Security` | Kiểm tra quyền truy cập công khai cho endpoint đăng nhập quản trị nền tảng. |
| `MasterAuthController` | Biên REST API tiếp nhận request, kiểm tra validation DTO và ánh xạ response. |
| `MasterAuthService` | Thực thi nghiệp vụ xác thực tài khoản quản trị nền tảng, băm mật khẩu và sinh token. |
| `Master PostgreSQL` | Cơ sở dữ liệu nền tảng lưu trữ bảng `platform_users`. |

#### Diễn giải từng bước

Các hình chữ nhật hẹp trên lifeline là **activation bar**, biểu thị khoảng thời gian participant đang trực tiếp xử lý một lời gọi:

1. `Platform Super Admin → Master Login UI`: Quản trị viên nhập email/mật khẩu và nhấn "Sign In".
2. `Master Login UI → Spring Security`: Gửi `POST /api/v1/master/auth/login`.
3. `Spring Security`: Kiểm tra whitelist và chuyển tiếp request.
4. `Spring Security → MasterAuthController`: Chuyển giao request cho Controller xử lý.
5. `MasterAuthController`: Kiểm tra tính hợp lệ dữ liệu DTO.
6. Nhánh `Invalid request`: Trả về `400 Bad Request` và dừng luồng.
7. Nhánh `Structurally valid request`: Controller gọi `MasterAuthService.login(request)`.
8. `MasterAuthService → Master PostgreSQL`: Truy vấn `findByEmailIgnoreCase(email)`.
9. Nhánh `User not found`: Database trả về rỗng, Service ném ngoại lệ và trả về `401 Unauthorized`.
10. Nhánh `User found`: Kiểm tra trạng thái tài khoản.
11. Nhánh `User status != 'ACTIVE'`: Trả về `403 Forbidden` thông báo tài khoản bị khóa.
12. Nhánh `User is ACTIVE`: Service tiến hành đối chiếu `BCrypt.matches()`.
13. Nhánh `Password mismatch`: Mật khẩu sai, trả về `401 Unauthorized` với thông điệp chung.
14. Nhánh `Password verified`: Mật khẩu chính xác, sinh Access Token JWT nền tảng (`role = WORKSPACE_ADMIN`, `tenantId = smarthire_master`).
15. `MasterAuthService --> MasterAuthController`: Trả về `MasterLoginResponse`.
16. `MasterAuthController --> Master Login UI`: Trả về HTTP `200 OK` kèm token.
17. `Master Login UI`: Lưu `master_access_token` vào `localStorage` và điều hướng quản trị viên vào `/admin/dashboard`.

---

### Class diagram

#### Vai trò các thành phần

| Thành phần | Loại | Vai trò |
|---|---|---|
| `MasterAuthRoute` | `<<REST API>>` conceptual | Khai báo các đường dẫn API thuộc phân vùng xác thực quản trị viên nền tảng. |
| `MasterAuthController` | `<<Controller>>` | Tiếp nhận HTTP request, validate và gọi service xử lý đăng nhập super admin. |
| `MasterLoginRequest` | `<<Request>>` | DTO chứa email và mật khẩu (đánh dấu `{write-only}`). |
| `MasterLoginResponse` | `<<Response>>` | DTO trả về Access Token, tokenType và thông tin người dùng quản trị. |
| `PlatformUserResponse` | `<<Response>>` | DTO thể hiện thông tin tóm tắt an toàn của quản trị viên nền tảng (không chứa password). |
| `MasterAuthService` | `<<Service>>` | Service ứng dụng quản lý quy tắc đăng nhập và kiểm tra mật khẩu trên Master DB. |
| `PlatformUserRepository` | `<<Repository>>` | Interface Spring Data JPA thao tác với bảng `platform_users`. |
| `PlatformUser` | `<<Entity>>` | Thực thể người dùng quản trị nền tảng lưu trong Master PostgreSQL. |
| `MasterDB` | `<<Database>>` | Cơ sở dữ liệu trung tâm PostgreSQL lưu trữ thông tin nền tảng SaaS. |

#### Giải thích các đường nối

| Nguồn → đích | Ký pháp | Loại quan hệ và lý do sử dụng |
|---|---|---|
| `MasterAuthRoute → MasterAuthController` | `..>` | **Dependency**: route định tuyến request tới controller (quan hệ sử dụng conceptual). |
| `MasterAuthController → MasterLoginRequest` | `..>` | **Dependency**: controller nhận DTO request làm tham số đầu vào. |
| `MasterAuthController → MasterAuthService` | `-->` | **Directed association**: controller phụ thuộc trực tiếp vào service được tiêm (inject). |
| `MasterAuthController → MasterLoginResponse` | `..>` | **Dependency**: controller trả về response DTO cho client. |
| `MasterLoginResponse → PlatformUserResponse` | `*--` | **Composition**: `PlatformUserResponse` là thành phần con không thể thiếu cấu thành `MasterLoginResponse`. |
| `MasterAuthService → MasterLoginRequest` | `..>` | **Dependency**: service nhận request DTO làm dữ liệu xử lý. |
| `MasterAuthService → PlatformUserRepository` | `-->` | **Directed association**: service gọi repository để truy vấn thông tin trong Master DB. |
| `PlatformUserRepository → PlatformUser` | `-->` | **Navigable association**: repository quản lý và trả về đối tượng thực thể `PlatformUser`. |
| `PlatformUserRepository → MasterDB` | `-->` | **Directed association tới data store**: repository thực hiện truy vấn trực tiếp vào Master PostgreSQL. |
| `MasterDB → PlatformUser` | `*--` | **Composition**: thực thể `PlatformUser` thuộc quyền sở hữu dữ liệu duy nhất của Master DB, không tồn tại trong Tenant DB. |

---

## Quyết định kiến trúc, bảo mật và vận hành

- **Master vs Tenant Isolation:** Quản trị viên nền tảng xác thực trên Master PostgreSQL, hoàn toàn tách biệt với database MySQL của các doanh nghiệp. Không yêu cầu `X-Tenant-ID` hay thiết lập `TenantContext`.
- **Bảo mật thông tin:** Mật khẩu lưu dưới dạng hash BCrypt. DTO trả về không bao giờ để lộ `passwordHash`.
- **Chống rà quét tài khoản (Anti-Enumeration):** Thông báo lỗi đăng nhập được chuẩn hóa thành `Invalid email or password` cho cả hai trường hợp không tìm thấy người dùng hoặc sai mật khẩu.
- **Transaction Isolation:** Phương thức đăng nhập sử dụng `masterTransactionManager` với cờ `readOnly = true` để tối ưu hóa hiệu năng truy vấn và đảm bảo tính toàn vẹn dữ liệu.

---

## Giả định và quyết định chưa hoàn tất

- Sử dụng mã tính năng `AUTH-02` theo bảng đặc tả tại `docs/features/README.md`.
- Hiện tại phiên đăng nhập Super Admin dùng Access Token 24h cơ bản; việc tích hợp Refresh Token và xác thực 2 yếu tố (2FA/MFA) cho Super Admin có thể mở rộng trong các phiên bản tiếp theo.

---

## Render và file được tạo

- `class-diagram.puml`: Mã nguồn PlantUML Class Diagram
- `sequence-diagram.puml`: Mã nguồn PlantUML Sequence Diagram
- `class-diagram.png`: Ảnh PNG độ phân giải cao 300 DPI (đạt chuẩn in ấn/báo cáo đồ án tốt nghiệp)
- `sequence-diagram.png`: Ảnh PNG độ phân giải cao 300 DPI (đạt chuẩn in ấn/báo cáo đồ án tốt nghiệp)

---

## Trạng thái review

**Complete** — Mã nguồn PlantUML, tài liệu giải thích chi tiết và toàn bộ ảnh PNG (300 DPI verified, không xuất SVG) đã được biên dịch thành công, kiểm tra trực quan đạt chuẩn đồ án tốt nghiệp.
