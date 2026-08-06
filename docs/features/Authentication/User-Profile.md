# User Profile Management

**Epic:** Authentication & User Management  
**Trạng thái:** `To Do`  
**Code ID:** `AUTH-05`

## Mục đích chức năng

Xem/cập nhật hồ sơ cá nhân (avatar, phone, bio, links) theo role.

## Actor

- Candidate, Recruiter, Admin

## Luồng hoạt động

1. `GET /api/v1/users/me`.
2. `PUT /api/v1/users/me` hoặc PATCH.
3. Upload avatar (storage).
4. Candidate có thêm skills/experience summary.

## Business Rules

- Không đổi email/role qua profile thường.
- Validate phone/URL.
- Avatar MIME/size limit.

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/users/me` |
| PUT | `/api/v1/users/me` |
| POST | `/api/v1/users/me/avatar` |

## Database liên quan

- `user_profiles`

## UI mockup

- Google Stitch: **Authentication & User Management / User Profile Management** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

AUTH-02
