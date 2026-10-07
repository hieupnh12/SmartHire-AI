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
- Header Recruiter: nút chuông mở panel thông báo tại chỗ, không điều hướng khỏi workspace; panel đóng khi nhấn `Esc` hoặc click ra ngoài.
- Header Candidate: nút chuông mở panel xem nhanh tối đa 5 thông báo mới nhất, có trạng thái đang tải/rỗng và số chưa đọc. Người dùng chọn `Xem tất cả thông báo` để vào `/notifications` xem chi tiết và đánh dấu đã đọc.

## Phụ thuộc

AUTH-02

## Phần đã triển khai (2026-09-27)

- Inbox thật: `GET /api/v1/notifications?page=0` trả tối đa 50 thông báo của người dùng hiện tại, mới nhất trước; `PATCH /api/v1/notifications/{id}` đánh dấu đã đọc, kiểm tra quyền sở hữu.
- CV đạt screening tạo thông báo `AI_INTERVIEW_INVITATION` với đường dẫn tới phiên thật. Payload gồm `aiInterviewId`, `applicationId`, `path`; không gửi sang tenant khác.
- Candidate có danh sách thông báo, liên kết mở lời mời và trạng thái đã đọc. Header hiển thị số chưa đọc trong 50 thông báo mới nhất và panel xem nhanh 5 mục; panel không tự đánh dấu đã đọc.
- Client cập nhật qua polling 15 giây. WebSocket push và email tự động chưa được triển khai; không hiển thị dữ liệu giả.

## Cài đặt thông báo (2026-10-07)

- `/notifications` có hai tab: `Hộp thư` (mặc định, link "Xem tất cả thông báo" từ chuông) và `Cài đặt` (`/notifications?tab=settings`, link "Thông báo" trong menu tài khoản).
- Tab Cài đặt: mỗi loại `AI_INTERVIEW`, `ASSESSMENT`, `HUMAN_INTERVIEW` có hai công tắc — `Trên web` (dòng `notifications`) và `Qua Gmail` (email). Lưu ngay khi bật/tắt.
- API: `GET /api/v1/notifications/preferences` trả đủ 3 loại (mặc định bật cả hai); `PUT /api/v1/notifications/preferences` nhận danh sách `{category, webEnabled, emailEnabled}` của người dùng hiện tại.
- Backend kiểm tra cài đặt của người nhận trước khi tạo thông báo web cho: lời mời/kết quả AI Interview, lời mời Assessment (gửi tay và tự sinh), lịch/nhắc/hủy/đề nghị đổi lịch phỏng vấn trực tiếp.
- Database: bảng tenant `notification_preferences` (V49).
