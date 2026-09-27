# WebSocket Notification

**Epic:** Interview Scheduling & Real-time Notifications  
**Trạng thái:** `Doing`  
**Code ID:** `SCHED-02`

## Mục đích chức năng

Đẩy thông báo realtime (stage change, schedule, score ready) qua WebSocket/STOMP.

## Actor

- All authenticated users

## Luồng hoạt động

1. FE subscribe `/user/queue/notifications`.
2. BE publish khi domain events.
3. Lưu inbox `notifications`.

## Business Rules

- Auth trên WS connect (JWT).
- At-least-once + idempotent client.

## API liên quan

WS endpoint `/ws` + REST `GET /api/v1/notifications`

## Database liên quan

- `notifications`

## UI mockup

- Google Stitch: **Interview Scheduling & Real-time Notifications / WebSocket Notification** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

AUTH-02

## Phần đã triển khai (2026-09-27)

- Inbox thật: `GET /api/v1/notifications?page=0` trả tối đa 50 thông báo của người dùng hiện tại, mới nhất trước; `PATCH /api/v1/notifications/{id}` đánh dấu đã đọc, kiểm tra quyền sở hữu.
- CV đạt screening tạo thông báo `AI_INTERVIEW_INVITATION` với đường dẫn tới phiên thật. Payload gồm `aiInterviewId`, `applicationId`, `path`; không gửi sang tenant khác.
- Candidate có danh sách thông báo, liên kết mở lời mời và trạng thái đã đọc. Header hiển thị số chưa đọc trong 50 thông báo mới nhất.
- Client cập nhật qua polling 15 giây. WebSocket push và email tự động chưa được triển khai; không hiển thị dữ liệu giả.
