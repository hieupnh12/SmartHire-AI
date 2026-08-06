# User Registration

**Epic:** Authentication & User Management  
**Trạng thái:** `To Do`  
**Code ID:** `AUTH-01`

## Mục đích chức năng

Cho phép guest tạo tài khoản Candidate/Recruiter với email/password, sẵn sàng xác minh và đăng nhập.

## Actor

- Guest
- System (email/OTP worker)

## Luồng hoạt động

1. User điền form đăng ký (role, name, email, password).
2. FE validate Zod → `POST /api/v1/auth/register`.
3. BE hash password, lưu `users` + profile mặc định.
4. (Optional) OTP qua Redis + RabbitMQ email.
5. Redirect Login hoặc yêu cầu verify.

## Business Rules

- Email unique (case-insensitive).
- Role public chỉ `CANDIDATE` | `RECRUITER`.
- Password policy bắt buộc.
- Không trả `password_hash`.

## API liên quan

| Method | Path | Auth |
|---|---|---|
| POST | `/api/v1/auth/register` | Public |

## Database liên quan

- `users`, `user_profiles`
- Redis OTP keys

## UI mockup

- Google Stitch: **Authentication & User Management / User Registration** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

Không
