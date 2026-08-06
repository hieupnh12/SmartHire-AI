# WebSocket Notification

**Epic:** Interview Scheduling & Real-time Notifications  
**Trạng thái:** `To Do`  
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
