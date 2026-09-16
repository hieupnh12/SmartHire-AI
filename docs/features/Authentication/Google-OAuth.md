# Google OAuth Login

**Epic:** Authentication & User Management  
**Trạng thái:** `Done`  
**Code ID:** `AUTH-03`

## Mục đích chức năng

Đăng nhập/đăng ký nhanh bằng Google ID token với cơ chế JIT (Just-In-Time) Provisioning; tự động lưu `User`, `UserProfile` và liên kết `oauth_accounts` vào cơ sở dữ liệu riêng biệt của từng Doanh nghiệp (Tenant Database).

## Actor

- Guest, Candidate, Recruiter

## Luồng hoạt động

1. FE nhận Google `idToken` từ Google Sign-In SDK.
2. Gửi request `POST /api/v1/tenant/auth/google` kèm header `X-Tenant-ID`.
3. BE xác thực chữ ký token qua JWKS của Google (`GoogleTokenVerifierService`).
4. BE thực hiện JIT Provisioning (khởi tạo User với role `CANDIDATE`, lưu `UserProfile` và liên kết `oauth_accounts` trong Tenant DB).
5. BE cấp phát JWT Access Token & Refresh Token (lưu session vào Redis) và trả về thông tin Candidate.

## Business Rules

- Chỉ chấp nhận email Google đã được `email_verified == true`.
- Tự động liên kết `oauth_accounts` nếu tài khoản email đã tồn tại trong Tenant DB.
- Chặn đăng nhập nếu trạng thái tài khoản không phải `ACTIVE`.

## API liên quan

| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/v1/tenant/auth/google` | Đăng nhập/Đăng ký tự động ứng viên qua Google ID Token |

## Database liên quan

- `users`, `oauth_accounts`

## UI mockup

- Google Stitch: **Authentication & User Management / Google OAuth Login** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

AUTH-02
