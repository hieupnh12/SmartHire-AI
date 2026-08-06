# Login & JWT Authentication

**Epic:** Authentication & User Management  
**Trạng thái:** `To Do`  
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
