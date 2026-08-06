# Google OAuth Login

**Epic:** Authentication & User Management  
**Trạng thái:** `To Do`  
**Code ID:** `AUTH-03`

## Mục đích chức năng

Đăng nhập/đăng ký nhanh bằng Google ID token; liên kết `oauth_accounts`.

## Actor

- Guest, Candidate, Recruiter

## Luồng hoạt động

1. FE nhận Google `idToken`.
2. `POST /api/v1/auth/google`.
3. BE verify token → find/create user → JWT.

## Business Rules

- Chỉ email Google verified.
- Policy merge nếu email đã có password account.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/auth/google` |

## Database liên quan

- `users`, `oauth_accounts`

## UI mockup

- Google Stitch: **Authentication & User Management / Google OAuth Login** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

AUTH-02
