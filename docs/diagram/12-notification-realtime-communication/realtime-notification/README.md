# NOTIFY — Real-Time Notification

- **Mã Feature:** `NOTIFY` / `12-notification-realtime-communication` · `SCHED-02`
- **Mã Function:** `realtime-notification`
- **Thư mục:** `docs/diagram/12-notification-realtime-communication/realtime-notification`
- **Trạng thái Review:** `Complete with assumptions`

---

## 1. Mục đích và phạm vi

Đẩy thông báo **đã lưu inbox** tới client đang online qua **WebSocket/STOMP**. Function này là **kênh realtime**, không phải hộp thư REST và không gửi email. Backend **chưa có** cấu hình WebSocket trong source.

## 2. Nguồn đã đối chiếu

- `docs/features/Scheduling-Notifications/WebSocket-Notifications.md` — `/ws`, `/user/queue/notifications`, JWT, at-least-once + idempotent client
- `docs/api/API_GUIDE.md` — `WS /ws → /user/queue/notifications`
- `docs/architecture/ASYNC_AND_CACHE.md` — fan-out in-app → WebSocket sau worker
- `frontend/src/lib/ws.ts` — scaffold ` /ws/notifications?token=`
- Package diagram: WebSocket gắn `planned`

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Authenticated User | Giữ session, nhận toast. |
| App Shell / WS Client | CONNECT, SUBSCRIBE, dedupe theo `id`. |
| JwtChannelInterceptor | JWT trên CONNECT; gắn tenant. |
| STOMP Broker | Điểm đến `/user/queue/notifications`. |
| NotificationService | Gọi publisher **sau khi** inbox commit. |
| NotificationRealtimePublisher | `convertAndSendToUser`. |

## 4. Tiền điều kiện và hậu điều kiện

**Tiền:** JWT hợp lệ; tenant `ACTIVE`; dòng `notifications` đã commit.

**Thành công:** client nhận MESSAGE; badge tăng nếu chưa đọc.

**Thất bại CONNECT:** đóng socket; UI có thể poll REST (center).

**Offline:** không push; user đọc lại bằng GET inbox.

## 5. Luồng chính và lỗi

CONNECT JWT → SUBSCRIBE → (inbox insert ở function khác) → push user destination → client dedupe → DISCONNECT/`clear()`.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

Không có Tenant DB: persist xong trước khi publisher chạy. Không SMTP.

### 6.2. Diễn giải bước

**Subscribe**

1. App mở WS sau login.
2. `CONNECT /ws` kèm JWT (không log token).
3. JWT thiếu/sai: đóng kết nối.
4–6. `setCurrentTenant` → broker accept → `SUBSCRIBE /user/queue/notifications`.

**Push / dedupe / disconnect** (chỉ khi CONNECT thành công)

7. `opt` còn subscribe: `afterInboxInsert`.
8. `convertAndSendToUser(userId)`.
9. MESSAGE tới subscriber (id, type, title, deepLink — không PII thừa).
10. Toast / badge.
11. Publisher trả.
12. `opt` cùng `id`: bỏ qua (at-least-once).
13–15. DISCONNECT; `clear TenantContext`.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

### 7.1. Vai trò phần tử

| Phần tử | Loại | Vai trò |
|---|---|---|
| WebSocketEndpoint | conceptual | Hợp đồng STOMP. |
| JwtChannelInterceptor | conceptual | Auth kênh WS. |
| NotificationRealtimePublisher | conceptual | Gửi user destination. |
| RealtimeNotificationPayload | conceptual | Payload nhỏ, có `id` để dedupe. |
| NotificationService | scaffold | Hook sau insert. |
| Notification | entity | Nguồn sự thật inbox. |
| STOMP broker | infrastructure | Bắt buộc để giải thích kênh. |

### 7.2. Quan hệ

| Nguồn → đích | Ký pháp | Loại và lý do |
|---|---|---|
| Endpoint → Interceptor | `..>` | Dependency auth CONNECT. |
| Interceptor → Broker | `..>` | Dependency cho phép SUBSCRIBE. |
| Service → Publisher | `-->` | Association sau persist. |
| Publisher → Broker | `..>` | Dependency send. |
| Publisher → Payload | `..>` | Dependency. |
| Broker → Endpoint | `..>` | Dependency deliver. |
| Service → Notification | `..>` | Đọc bản đã lưu, không tạo ở đây. |

## 8. Quyết định kiến trúc và bảo mật

- **JWT trên CONNECT**, không nhét token vào MESSAGE.
- **Tenant trên session WS** khớp token; không subscribe tenant khác.
- **At-least-once:** client idempotent theo `id`; missed → REST inbox.
- **Không** dùng WS để mark-read.

## 9. Giả định

- Hợp đồng luận văn: **STOMP** như SCHED-02, không raw WS query `token`.
- FE `createNotificationSocket` là scaffold, sẽ đổi khi BE có broker.
- Spring package WebSocket **chưa có** trong backend.
- Publisher không retry SMTP; reliability email = function riêng.
- Không vẽ scale cluster STOMP (Redis relay) trừ khi triển khai sau.

## 10. Render và file được tạo

| File | Metadata |
|---|---|
| [class-diagram.png](class-diagram.png) | PNG, ít nhất 300 DPI |
| [sequence-diagram.png](sequence-diagram.png) | PNG, ít nhất 300 DPI |

Đã kiểm tra trực quan. Không tạo SVG.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ./.agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/12-notification-realtime-communication/realtime-notification `
  -PlantUmlJar "$env:LOCALAPPDATA\PlantUML\plantuml-1.2026.7.jar" `
  -Format Png `
  -PngDpi 300
```

## 11. Trạng thái review

`Complete with assumptions` — nguồn và PNG 300 DPI đã xong.
