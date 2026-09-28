# Email Notification

**Epic:** Interview Scheduling & Real-time Notifications  
**Trạng thái:** `Doing`  
**Code ID:** `SCHED-03`

## Mục đích chức năng

Gửi email (OTP, schedule, decision, feedback) qua RabbitMQ mail worker.

## Actor

- System

## Luồng hoạt động

1. Publish `notify.email` (OTP, schedule — chưa đủ worker).
2. CV screening đạt → `InviteMailSender` gửi mail mời phỏng vấn AI, ghi `email_outbox` + `applications.ai_interview_invited_at`.
3. Worker template + SMTP/provider cho các loại mail còn lại.

## Business Rules

- Retry + DLQ (hàng đợi SCHED-03).
- Lời mời AI interview: một lần / application; SMTP lỗi thì chưa set `ai_interview_invited_at`.
- Unsubscribe/preference (optional).

## API liên quan

Internal queue `notify.email`; templates trong `mail_templates`.

## Database liên quan

- `email_outbox` / `notification_logs`

## UI mockup

- Google Stitch: **Interview Scheduling & Real-time Notifications / Email Notification** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

SCHED-01, SCHED-02
