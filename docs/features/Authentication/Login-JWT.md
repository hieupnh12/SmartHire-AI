# Login & JWT Authentication

**Epic:** Authentication & User Management  
**Trạng thái:** `Done`
**Code ID:** `AUTH-02`

## Mục đích chức năng

Xác thực email/password, cấp access token và refresh token JWT, quản lý phiên và thu hồi phiên (Redis Blacklist & Refresh Session), chống vét cạn mật khẩu (Brute-force Rate Limiting), khôi phục mật khẩu qua mã xác thực OTP gửi về email, và cho phép đổi mật khẩu cho người dùng đã đăng nhập.

## Actor

- Candidate, Recruiter, Admin (Tenant Staff & Candidates)

## Luồng hoạt động

1. **Đăng nhập (`POST /api/v1/tenant/auth/login`):**
   - Kiểm tra brute-force rate limit trên Redis (tối đa 5 lần thử sai liên tiếp, khóa 15 phút theo key `ratelimit:tenant:{tenantId}:login:failed:{email}`).
   - Kiểm tra thông tin người dùng trong cơ sở dữ liệu riêng của Tenant (`users`) và trạng thái tài khoản `ACTIVE`.
   - Nếu sai mật khẩu: tăng số lần thử sai trên Redis, trả về số lần thử còn lại.
   - Nếu đăng nhập thành công: xóa bộ đếm thất bại, cấp Access Token JWT (30m/configured TTL) và Refresh Token (UUID, 7 ngày lưu Redis theo key `auth:tenant:refresh:{tokenId}` chứa `{tenantId}:{email}`).
   - Trả về `accessToken`, `refreshToken`, `tokenType: "Bearer"`, thông tin `user` kèm permissions, `tenantId`, và `subdomain`.
2. **Làm mới phiên (`POST /api/v1/tenant/auth/refresh`):**
   - Đọc session từ `auth:tenant:refresh:{refreshToken}` trên Redis.
   - Xác thực tính hợp lệ của TenantContext hiện tại khớp với session Tenant.
   - Xóa refresh token cũ và sinh cặp token mới (Token Rotation) nhằm ngăn chặn replay attacks.
3. **Đăng xuất & Thu hồi phiên (`POST /api/v1/tenant/auth/logout`):**
   - Lấy `accessToken` từ header `Authorization: Bearer`.
   - Tính thời gian sống còn lại (TTL) và đưa vào danh sách đen `auth:jwt:blacklist:{token}` trên Redis.
   - Xóa `refreshToken` khỏi Redis.
   - Frontend dọn sạch token trong LocalStorage và điều hướng về trang tương ứng.
4. **Quên & Đặt lại mật khẩu (`POST /api/v1/tenant/auth/forgot-password`, `/reset-password`):**
   - Quên mật khẩu: Nhập email, hệ thống sinh mã OTP 6 chữ số lưu Redis (TTL 15 phút, key `otp:tenant:{tenantId}:password-reset:{email}`), gửi email qua `InviteMailSender`. Áp dụng cơ chế Anti-Enumeration (luôn trả về HTTP 200).
   - Đặt lại mật khẩu: Gửi email + OTP + mật khẩu mới. Xác thực OTP từ Redis, băm mật khẩu mới bằng BCrypt, cập nhật vào bảng `users`, xóa OTP.
5. **Đổi mật khẩu (`POST /api/v1/tenant/auth/change-password`):**
   - Người dùng đã xác thực gửi `currentPassword` và `newPassword`.
   - Kiểm tra mật khẩu hiện tại, đảm bảo mật khẩu mới không trùng với mật khẩu cũ, cập nhật băm mật khẩu mới vào Tenant DB.

## Business Rules

- Rate limit: 5 lần nhập sai liên tiếp → khóa đăng nhập 15 phút (`TOO_MANY_LOGIN_ATTEMPTS`).
- Cặp Access/Refresh Token: Access Token ngắn hạn, Refresh Token 7 ngày với cơ chế Token Rotation.
- Multi-Tenant Isolation: Token và Refresh session gắn liền với `tenantId`. Từ chối yêu cầu nếu token thuộc tenant khác (`TENANT_MISMATCH`).
- Redis Blacklist: Mọi token sau khi logout đều bị chặn ngay lập tức tại `JwtAuthenticationFilter`.
- Anti-Enumeration: Endpoint quên mật khẩu không làm lộ sự tồn tại của tài khoản trong hệ thống.
- Mật khẩu mới tối thiểu 6 ký tự, mã hóa BCrypt trước khi lưu database.

## API liên quan

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/v1/tenant/auth/login` | Public | Đăng nhập tài khoản doanh nghiệp (có rate limit, cấp access + refresh token) |
| POST | `/api/v1/tenant/auth/refresh` | Public | Làm mới Access Token và xoay vòng Refresh Token |
| POST | `/api/v1/tenant/auth/logout` | Public/Auth | Đăng xuất, đưa access token vào Redis Blacklist, hủy refresh session |
| POST | `/api/v1/tenant/auth/forgot-password` | Public | Yêu cầu mã OTP khôi phục mật khẩu qua email |
| POST | `/api/v1/tenant/auth/reset-password` | Public | Đặt lại mật khẩu bằng mã OTP 6 số |
| POST | `/api/v1/tenant/auth/change-password` | Authenticated | Đổi mật khẩu cho người dùng đang đăng nhập |
| GET | `/api/v1/tenant/auth/me` | Authenticated | Lấy hồ sơ tài khoản và danh sách quyền hạn hiện tại |

## Database liên quan

- Bảng Tenant MySQL: `users`
- Redis Keys:
  - `auth:tenant:refresh:{tokenId}` (TTL: 7 ngày)
  - `auth:jwt:blacklist:{token}` (TTL: remaining token lifetime)
  - `ratelimit:tenant:{tenantId}:login:failed:{email}` (TTL: 15 phút)
  - `otp:tenant:{tenantId}:password-reset:{email}` (TTL: 15 phút)

## UI mockup

- Màn hình đăng nhập doanh nghiệp: `LoginPage.tsx` (tích hợp nút "Quên mật khẩu?" mở modal nhập email và nhập mã OTP 6 chữ số để đặt lại mật khẩu).
- Quản trị viên/Nhân viên: Header menu hỗ trợ Đăng xuất với cơ chế thu hồi token toàn diện.

## Phụ thuộc

AUTH-01
