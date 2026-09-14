# Login & JWT Authentication

**Epic:** Authentication & User Management  
**Trạng thái:** `Doing`
**Code ID:** `AUTH-02`

## Mục đích chức năng

Xác thực email/password, cấp access/refresh JWT, bảo vệ API theo token.

## Actor

- Candidate, Recruiter, Admin

## Luồng hoạt động

1. `POST /api/v1/auth/login`.
2. Verify credentials + status.
3. Issue JWT (access ngắn, refresh dài; refresh metadata Redis).
4. FE lưu token, Axios interceptor gắn Bearer.
5. Logout revoke refresh (blacklist Redis).

## Business Rules

- Rate limit login (Redis).
- Message lỗi chung khi sai credentials.
- Access token hết hạn → refresh hoặc 401.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/auth/login` |
| POST | `/api/v1/auth/refresh` |
| POST | `/api/v1/auth/logout` |

## Database liên quan

- `users`
- Redis: refresh/session/blacklist

## UI mockup

- Google Stitch: **Authentication & User Management / Login & JWT Authentication** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

AUTH-01

## Cập nhật kết nối và tenant

- Login thực tế: `POST /api/v1/master/auth/login` cho Workspace Admin, `POST /api/v1/tenant/auth/login` cho doanh nghiệp.
- Profile: `/api/v1/master/auth/me`, `/api/v1/tenant/auth/me`.
- Login tenant bắt buộc mã tenant hoặc subdomain hợp lệ; registry nằm trên PostgreSQL và dữ liệu người dùng nằm trên MySQL tenant.
- JWT chứa mã tenant chuẩn; tenant thiếu, bị khóa hoặc khác header sẽ bị từ chối.
- Không có tài khoản demo hoặc mật khẩu mặc định; bootstrap Workspace Admin phải được bật rõ và nhận credential từ môi trường.
- Refresh, logout và rate limit trong kế hoạch phía trên chưa thuộc thay đổi kết nối DB này.
