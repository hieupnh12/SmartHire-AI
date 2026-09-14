# AUTH — Vòng đời Xác thực & Phiên Người dùng Doanh nghiệp (Tenant User Authentication & Session Lifecycle)

- **Mã Feature:** `AUTH-01..04`
- **Mã Function:** `tenant-user-authentication`
- **Thư mục tài liệu:** `docs/diagram/01-authentication/tenant-user-authentication`
- **Trạng thái Review:** `Source complete — awaiting rendering decision`

---

## 1. Mục đích và Phạm vi

Tài liệu này mô tả kiến trúc thiết kế lớp (Static Class Structure) và quy trình tương tác runtime (Sequence Interaction) cho vòng đời xác thực của người dùng thuộc doanh nghiệp (Tenant) trong nền tảng SmartHire-AI SaaS Multi-Tenant (Separate Database per Tenant), bao gồm 4 nghiệp vụ cốt lõi:
1. **`/login`**: Xác thực email/mật khẩu truyền thống cho nhân sự nội bộ (`ADMIN`, `HR`, `RECRUITER`).
2. **`/google`**: Đăng nhập 1-click cho ứng viên (`CANDIDATE`) kèm cơ chế Just-In-Time (JIT) Provisioning tự động khởi tạo hồ sơ trong cơ sở dữ liệu riêng của Tenant.
3. **`/logout`**: Đăng xuất an toàn, thu hồi Refresh Token trên Redis và đưa Access Token hiện tại vào Redis Blacklist.
4. **`/reset-password`** (kèm `/forgot-password`): Quên mật khẩu và đặt lại mật khẩu an toàn qua OTP gửi bằng RabbitMQ Email Worker, chống lộ thông tin tài khoản (Account Enumeration Prevention).

---

## 2. Tài liệu và Mã nguồn đã đối soát

- Đặc tả nghiệp vụ:
  - [`docs/features/Authentication/Login-JWT.md`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/docs/features/Authentication/Login-JWT.md)
  - [`docs/features/Authentication/Google-OAuth.md`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/docs/features/Authentication/Google-OAuth.md)
  - [`docs/features/Authentication/RBAC.md`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/docs/features/Authentication/RBAC.md)
  - [`docs/features/Authentication/Tenant-Onboarding.md`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/docs/features/Authentication/Tenant-Onboarding.md)
- Cơ sở dữ liệu:
  - [`backend/src/main/resources/db/migration/tenant/V1__init_tenant_schema.sql`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/backend/src/main/resources/db/migration/tenant/V1__init_tenant_schema.sql) (`users`, `oauth_accounts`)
  - [`backend/src/main/resources/db/migration/tenant/V2__product_backlog_schema.sql`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/backend/src/main/resources/db/migration/tenant/V2__product_backlog_schema.sql) (`user_profiles`)
- Mã nguồn Backend liên quan:
  - [`backend/src/main/java/com/smarthire/tenant/auth/controller/TenantAuthController.java`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/backend/src/main/java/com/smarthire/tenant/auth/controller/TenantAuthController.java)
  - [`backend/src/main/java/com/smarthire/tenant/auth/service/TenantAuthService.java`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/backend/src/main/java/com/smarthire/tenant/auth/service/TenantAuthService.java)
  - [`backend/src/main/java/com/smarthire/security/JwtTokenProvider.java`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/backend/src/main/java/com/smarthire/security/JwtTokenProvider.java)
  - [`backend/src/main/java/com/smarthire/security/JwtAuthenticationFilter.java`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/backend/src/main/java/com/smarthire/security/JwtAuthenticationFilter.java)
  - [`backend/src/main/java/com/smarthire/multitenancy/context/TenantContext.java`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/backend/src/main/java/com/smarthire/multitenancy/context/TenantContext.java)

---

## 3. Các bên tham gia (Actors & Components)

1. **Người dùng (User / Candidate):** Người dùng nội bộ thao tác trên cổng đăng nhập doanh nghiệp, hoặc ứng viên đăng nhập qua Google để phỏng vấn AI / ứng tuyển.
2. **Giao diện người dùng (Frontend SPA):** React 19 Client quản lý state đăng nhập, đính kèm `X-Tenant-ID` header và token `Authorization: Bearer`.
3. **TenantWebInterceptor & TenantContext:** Bắt mã tenant từ Header / Subdomain, nạp vào `ThreadLocal` trước mỗi request và dọn dẹp trong `finally`.
4. **JwtAuthenticationFilter:** Xác thực chữ ký token, đối chiếu Redis Blacklist, thiết lập Spring Security Context và khôi phục Tenant Context.
5. **TenantAuthController:** Tiếp nhận và validate các REST Request DTO.
6. **TenantAuthService:** Điều phối business logic xác thực, phân quyền, mã hóa mật khẩu và tạo token.
7. **GoogleTokenVerifierService & Google Identity Provider:** Xác thực chữ ký Google ID Token trực tiếp từ Google OAuth2 JWKS endpoint.
8. **Redis Cache:** Lưu trữ trạng thái phiên: Refresh Token (TTL 7 ngày), Token Blacklist (TTL bằng thời gian còn lại của Access Token), OTP đặt lại mật khẩu (TTL 15 phút).
9. **Tenant Database (MySQL):** Cơ sở dữ liệu riêng biệt của từng doanh nghiệp, lưu trữ `users`, `oauth_accounts`, `user_profiles`.
10. **RabbitMQ (`email.queue`):** Đẩy thông báo gửi email OTP bất đồng bộ, không làm nghẽn luồng HTTP.

---

## 4. Tiền điều kiện & Hậu điều kiện (Preconditions & Postconditions)

### Tiền điều kiện:
- Mọi request gửi lên bắt buộc mang định danh Tenant hợp lệ qua Header `X-Tenant-ID` hoặc Subdomain (đã được provisioned và ở trạng thái `ACTIVE`).
- Với các API cần xác thực (`/logout`, `/me`), request phải mang Access Token hợp lệ và chưa bị blacklist.

### Hậu điều kiện:
- **Đăng nhập thành công (`/login`, `/google`):** Trả về Access Token (30 phút), Refresh Token (7 ngày). Refresh Token được lưu trong Redis theo key `tenant:{tenantId}:refresh:{userId}`.
- **Đăng xuất thành công (`/logout`):** Refresh Token bị xóa khỏi Redis; Access Token hiện tại được ghi nhận vào `blacklist:token:{hash}` để vô hiệu hóa ngay lập tức.
- **Reset mật khẩu thành công (`/reset-password`):** Mật khẩu mới được băm BCrypt lưu vào bảng `users` của Tenant DB; toàn bộ phiên đăng nhập cũ trên Redis bị hủy bỏ.

---

## 5. Giải thích Thiết kế Class Diagram

Tập tin nguồn: [`class-diagram.puml`](class-diagram.puml)

- **Góc nhìn (Viewpoint):** Application Design kết hợp Data Model cho Tenant Domain.
- **Tính đóng gói (Encapsulation) & Độc lập Tenant:**
  - Không tồn tại thuộc tính `tenantId` thừa thãi trong các thực thể `User`, `OauthAccount`, `UserProfile` vì đã được cô lập vật lý bằng Separate Database per Tenant.
  - Tầng Persistence chỉ gồm các Entity và Repository thuộc Tenant Domain. Master Domain hoàn toàn tách biệt.
  - Tách bạch DTO request/response: `password` và `idToken` được đánh dấu `{write-only}`, không bao giờ serialize trả ngược về Client.
- **Cơ chế JIT Provisioning (Social Login):**
  - Thực thể `User` cho phép `passwordHash` mang giá trị `NULL` dành cho người dùng đăng nhập qua bên thứ ba (Google/LinkedIn). Quan hệ `User 1 o-- 0..* OauthAccount` cho phép một người dùng liên kết tài khoản định danh mạng xã hội.

---

## 6. Giải thích Luồng Sequence Diagram

Tập tin nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Luồng 1: Đăng nhập nội bộ (`POST /api/v1/tenant/auth/login`)
- Người dùng gửi email và mật khẩu. `TenantWebInterceptor` nạp `TenantContext`.
- `TenantAuthService` truy vấn user theo email trong Tenant DB.
- Nếu không tìm thấy hoặc tài khoản `SUSPENDED` $\rightarrow$ Trả về mã lỗi chung 401 `"Invalid credentials"` để tránh rò rỉ sự tồn tại của tài khoản.
- Sau khi kiểm tra `BCrypt.matches()`, cấp phát đồng thời `accessToken` (30 phút) và `refreshToken` (7 ngày), lưu `refreshToken` vào Redis.

### 6.2. Luồng 2: Ứng viên 1-Click Google OAuth (`POST /api/v1/tenant/auth/google`)
- Frontend gửi Google `idToken`.
- `GoogleVerifierService` kiểm tra chữ ký số qua Google JWKS endpoint.
- Nếu người dùng chưa tồn tại trong Tenant DB $\rightarrow$ Cơ chế **Just-In-Time Provisioning** kích hoạt:
  1. Insert `User` (`role = CANDIDATE`, `password_hash = NULL`).
  2. Insert `OauthAccount` (`provider = GOOGLE`, `provider_user_id = sub`).
  3. Insert `UserProfile` (`avatar_url = picture`).
- Cấp phát JWT và chuyển thẳng ứng viên vào trang làm bài đánh giá / phỏng vấn AI.

### 6.3. Luồng 3: Đăng xuất thu hồi phiên (`POST /api/v1/tenant/auth/logout`)
- `JwtAuthenticationFilter` kiểm tra token hợp lệ và xác nhận không nằm trong Blacklist.
- Xóa `tenant:{tenantId}:refresh:{userId}` trên Redis.
- Đưa mã hash của `accessToken` vào `blacklist:token:{hash}` với TTL bằng thời gian sống còn lại của token.

### 6.4. Luồng 4: Quên & Đặt lại mật khẩu (`/forgot-password` & `/reset-password`)
- **Yêu cầu OTP:** Khách hàng gửi email. Hệ thống kiểm tra: nếu tài khoản tồn tại và có mật khẩu $\rightarrow$ Sinh mã OTP 6 số lưu vào Redis (TTL 15 phút) và bắn event vào RabbitMQ để gửi email.
  - *Lưu ý an ninh:* Luôn trả về 200 OK bất kể email có tồn tại hay không nhằm chống tấn công rà quét tài khoản (Enumeration Attack).
- **Đặt lại mật khẩu:** Ứng viên nhập OTP và mật khẩu mới. Kiểm tra OTP từ Redis; nếu hợp lệ $\rightarrow$ cập nhật `password_hash` bằng BCrypt, xóa OTP và thu hồi toàn bộ session cũ trên Redis.

---

## 7. Các quyết định kiến trúc và bảo mật bắt buộc

1. **Tenant Isolation:** Mọi truy vấn DB bắt buộc thông qua Tenant Connection Pool do `TenantContext` chỉ định. Tuyệt đối không fallback sang Master DB.
2. **Session Hardening:** Rút ngắn Access Token từ 24h xuống 30 phút, kết hợp Refresh Token 7 ngày và Blacklist tức thời qua Redis khi logout.
3. **Data Protection:** Không log và không trả về raw password, OTP hoặc Google credentials trong bất kỳ thông báo lỗi nào.

---

## 8. Hướng dẫn Render Diagram

Theo quy chuẩn kỹ thuật của kỹ năng `enterprise-uml-diagram`:
1. Các tập tin nguồn `.puml` được thiết lập sẵn `skinparam dpi 300`.
2. Lệnh kiểm tra cú pháp không tạo ảnh:
   ```powershell
   pwsh -File .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/01-authentication/tenant-user-authentication -ValidateOnly
   ```
3. Lệnh xuất định dạng chất lượng cao (cả SVG vector và PNG 300 DPI) sau khi có sự đồng ý của người dùng:
   ```powershell
   pwsh -File .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/01-authentication/tenant-user-authentication -Format Both -PngDpi 300
   ```
