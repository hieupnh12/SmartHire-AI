# AUTH-02 — Xác thực Nhân sự Doanh nghiệp (Tenant Staff Authentication)

## Mục đích và phạm vi

Chức năng này mô tả quy trình xác thực bằng Email và Mật khẩu dành riêng cho đội ngũ nhân sự nội bộ doanh nghiệp (`ADMIN`, `HR`, `RECRUITER`) trong kiến trúc SaaS Multi-Tenant (Separate Database per Tenant).
Khác với ứng viên đăng nhập tự do qua mạng xã hội, nhân sự nội bộ được cấp phát tài khoản trong hệ thống và phải trải qua quy trình xác thực mật khẩu nghiêm ngặt được lưu trữ cô lập trong cơ sở dữ liệu riêng của Tenant.

Sơ đồ sử dụng góc nhìn thiết kế ứng dụng (application-design view) tinh gọn, tuân thủ đúng quy chuẩn tài liệu Software Design Document (SDD).

---

## Nguồn đã đối chiếu

- `AGENTS.md`, `DESIGN.md`
- `docs/features/Authentication/Login-JWT.md` (`AUTH-02`)
- `docs/features/Authentication/Tenant-Onboarding.md`
- Entity `User`, Enums `UserRole`, `UserStatus`
- Tenant migration `V1__init_tenant_schema.sql` (`users`)
- `TenantAuthController`, `TenantAuthService`, `JwtAuthenticationFilter`

---

## Actor và thành phần tham gia

- **Tenant Staff:** Nhân sự nội bộ thuộc tổ chức (`HR`, `RECRUITER`, `TENANT_ADMIN`).
- **Recruiter Portal UI (Frontend SPA):** Giao diện cổng quản trị tuyển dụng, tự động đính kèm header `X-Tenant-ID`.
- **Security & Gateway (`TenantWebInterceptor` / Filter):** Phân giải `TenantContext` từ header/subdomain, kiểm tra tính hợp lệ của Tenant trên Master Registry.
- **`TenantAuthController`:** Endpoint `/api/v1/tenant/auth/login`.
- **`TenantAuthService`:** Quản lý logic kiểm tra mật khẩu BCrypt, sinh JWT và điều phối phiên làm việc trên Redis.
- **`Dedicated Tenant MySQL`:** Cơ sở dữ liệu riêng của doanh nghiệp, chứa bảng `users`.
- **`Redis Cache`:** Quản lý lưu trữ Refresh Token theo từng người dùng doanh nghiệp.

---

## Tiền điều kiện và hậu điều kiện

### Tiền điều kiện:
- Doanh nghiệp (Tenant) đã tồn tại và ở trạng thái `ACTIVE`.
- Người dùng đã được cấp tài khoản trong hệ thống và ở trạng thái `ACTIVE`.
- Request đính kèm header `X-Tenant-ID`.

### Hậu điều kiện khi thành công:
- Sinh cặp token: Access Token (30 phút) và Refresh Token (7 ngày).
- Refresh Token được lưu trong Redis theo key `tenant:{tenantId}:refresh:{userId}` với TTL 7 ngày.
- Client lưu token và điều hướng vào không gian làm việc Recruiter Dashboard.

### Hậu điều kiện khi thất bại:
- Sai email hoặc mật khẩu: Trả về HTTP `401 Unauthorized` kèm thông báo chung `Invalid email or password`.
- Tài khoản chưa kích hoạt hoặc bị khóa: Trả về HTTP `403 Forbidden`.
- Doanh nghiệp bị khóa (`SUSPENDED`): Trả về HTTP `403 Forbidden`.

---

## Luồng hoạt động tuần tự (Sequence Walkthrough)

1. **Bước 1-2:** Nhân sự nhập email/mật khẩu và nhấn Đăng nhập. UI gửi request `POST /api/v1/tenant/auth/login` kèm header `X-Tenant-ID`.
2. **Bước 3-5:** Gateway phân giải Tenant ID, thiết lập `TenantContext`. Nếu Tenant không hợp lệ hoặc bị `SUSPENDED`, trả về `403 Forbidden`.
3. **Bước 6-7:** Gateway chuyển tiếp request tới `TenantAuthController`, gọi `TenantAuthService.login(request)`.
4. **Bước 8-9:** Service truy vấn thông tin tài khoản từ `Dedicated Tenant MySQL` theo email.
5. **Bước 10-15:** Service kiểm tra mật khẩu qua BCrypt. Nếu không khớp hoặc không tìm thấy tài khoản, trả về `401 Unauthorized`. Nếu tài khoản ở trạng thái `INVITED` hoặc `SUSPENDED`, trả về `403 Forbidden`.
6. **Bước 16-18:** Khi thông tin chính xác, Service sinh Access Token (30m) và Refresh Token (7d), lưu Refresh Token vào Redis Cache.
7. **Bước 19-22:** Trả về `LoginResponse` cho Frontend, lưu token vào bộ nhớ trình duyệt và điều hướng vào Dashboard.

---

## Chi tiết Class Diagram

### Vai trò các thành phần

| Thành phần | Loại | Vai trò |
|---|---|---|
| `TenantAuthRoute` | `<<REST API>>` conceptual | Định tuyến API đăng nhập nhân sự doanh nghiệp. |
| `TenantAuthController` | `<<Controller>>` | Tiếp nhận và validate thông tin đăng nhập. |
| `LoginRequest` | `<<Request>>` | DTO chứa email và mật khẩu `{write-only}`. |
| `LoginResponse` | `<<Response>>` | DTO trả về cặp token JWT và thông tin người dùng tóm tắt. |
| `UserSummaryResponse` | `<<Response>>` | DTO tóm tắt thông tin người dùng (`id`, `email`, `fullName`, `role`). |
| `TenantAuthService` / `Impl` | `<<Service>>` | Quản lý quy tắc xác thực, mã hóa BCrypt và quản lý token. |
| `UserRepository` | `<<Repository>>` | Thao tác JPA trên bảng `users` của Tenant DB. |
| `User` | `<<Entity>>` | Thực thể nhân viên doanh nghiệp trong Tenant DB. |
| `DedicatedTenantMySQL` | `<<Database>>` | Cơ sở dữ liệu riêng biệt của doanh nghiệp. |
| `RedisCache` | `<<Cache>>` | Quản lý Refresh Token theo từng phiên người dùng. |

### Giải thích các đường nối UML

| Nguồn → đích | Ký pháp | Loại quan hệ và lý do sử dụng |
|---|---|---|
| `TenantAuthController → LoginRequest` | `..>` | **Dependency**: Controller nhận DTO request (`consumes >`). |
| `TenantAuthController → TenantAuthService` | `-->` | **Directed association**: Controller ủy thác cho Service xử lý. |
| `TenantAuthController → LoginResponse` | `..>` | **Dependency**: Controller trả về DTO response. |
| `TenantAuthServiceImpl ..|> TenantAuthService` | `<\|..` | **Realization**: Lớp triển khai thực hiện Interface Service. |
| `LoginResponse → UserSummaryResponse` | `*--` | **Composition**: `UserSummaryResponse` cấu thành bên trong `LoginResponse`. |
| `TenantAuthServiceImpl → UserRepository` | `-->` | **Directed association**: Service tiêm và truy vấn UserRepository. |
| `TenantAuthServiceImpl → RedisCache` | `-->` | **Directed association**: Service lưu trữ Refresh Token vào Redis. |
| `UserRepository → User` | `-->` | **Navigable association**: Quản lý thực thể User. |
| `UserRepository → DedicatedTenantMySQL` | `-->` | **Directed association**: Thao tác trực tiếp trên Tenant MySQL. |

---

## Quyết định kiến trúc & Bảo mật

1. **Cô lập theo Tenant:** Mọi truy vấn chỉ diễn ra trong MySQL riêng của Tenant, ngăn chặn hoàn toàn rò rỉ dữ liệu chéo giữa các doanh nghiệp.
2. **Bảo mật thông tin đăng nhập:** Mật khẩu được mã hóa một chiều qua BCrypt. DTO trả về không bao giờ chứa thông tin băm mật khẩu.
3. **Phòng chống dò quét (Anti-Enumeration):** Dù người dùng không tồn tại hay sai mật khẩu đều trả về một thông điệp duy nhất `Invalid email or password`.

---

## Render và file được tạo

- `class-diagram.puml`: Mã nguồn PlantUML Class Diagram
- `sequence-diagram.puml`: Mã nguồn PlantUML Sequence Diagram
- `class-diagram.png`: Ảnh PNG độ phân giải cao 300 DPI (chuẩn SDD đồ án tốt nghiệp)
- `sequence-diagram.png`: Ảnh PNG độ phân giải cao 300 DPI (chuẩn SDD đồ án tốt nghiệp)

---

## Trạng thái review

**Complete** — Đã hoàn tất mã nguồn, tài liệu SDD chi tiết và render toàn bộ ảnh PNG 300 DPI verified.
