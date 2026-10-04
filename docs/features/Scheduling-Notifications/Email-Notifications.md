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
2. Khi `AiInterviewInvitationService` tạo phiên mới (CV screening đạt hoặc tạo bù sau khi bật cấu hình), hệ thống tạo notification trong app, gửi mail qua `InviteMailSender`, ghi `email_outbox` + `applications.ai_interview_invited_at`. Nội dung gồm thời gian có thể bắt đầu, hạn hoàn thành, thời lượng, số lần thực hiện và liên kết đến danh sách phiên của candidate.
3. Worker template + SMTP/provider cho các loại mail còn lại.

## Business Rules

- Retry + DLQ (hàng đợi SCHED-03).
- Lời mời AI interview: một lần / application; SMTP lỗi thì chưa set `ai_interview_invited_at`.
- Thời gian trong lời mời hiển thị theo múi giờ `Asia/Bangkok` (`HH:mm dd/MM/yyyy`), đồng nhất với múi giờ vận hành hiện tại của hệ thống.
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
