# Interview Feedback

**Epic:** AI Interview System  
**Trạng thái:** `To Do`  
**Code ID:** `INT-05`

## Mục đích chức năng

Tạo feedback readable cho recruiter/candidate (policy hiển thị).

## Actor

- Recruiter, Candidate (nếu được share), System

## Luồng hoạt động

1. Sau scoring sinh feedback.
2. Recruiter approve/share.
3. Candidate xem nếu được phép.

## Business Rules

- Phân quyền nội dung feedback.
- Có thể chỉnh tay trước khi share.

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/interviews/{id}/feedback` |
| POST | `/api/v1/interviews/{id}/feedback/share` |

## Database liên quan

- `interview_feedbacks`

## UI mockup

- Google Stitch: **AI Interview System / Interview Feedback** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

INT-04
