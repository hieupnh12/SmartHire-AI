# Interview Scheduling

**Epic:** Interview Scheduling & Real-time Notifications  
**Trạng thái:** `To Do`  
**Code ID:** `SCHED-01`

## Mục đích chức năng

Đặt lịch phỏng vấn (AI hoặc human), slot thời gian, participants.

## Actor

- Recruiter, Candidate

## Luồng hoạt động

1. Recruiter tạo schedule.
2. Candidate confirm/reschedule.
3. Reminder email + websocket.

## Business Rules

- Conflict check timezone.
- Status: PROPOSED, CONFIRMED, CANCELLED, DONE.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/schedules` |
| PATCH | `/api/v1/schedules/{id}` |
| POST | `/api/v1/schedules/{id}/confirm` |

## Database liên quan

- `interview_schedules`

## UI mockup

- Google Stitch: **Interview Scheduling & Real-time Notifications / Interview Scheduling** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

JOB-05, INT-01
