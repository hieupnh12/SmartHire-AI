# Email Notification

**Epic:** Interview Scheduling & Real-time Notifications  
**Trạng thái:** `To Do`  
**Code ID:** `SCHED-03`

## Mục đích chức năng

Gửi email (OTP, schedule, decision, feedback) qua RabbitMQ mail worker.

## Actor

- System

## Luồng hoạt động

1. Publish `notify.email`.
2. Worker template + SMTP/provider.
3. Log delivery status.

## Business Rules

- Retry + DLQ.
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
