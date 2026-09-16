# NOTIF-04 — Truyền nhận thông báo thời gian thực qua WebSocket/STOMP (Realtime Notification Push)

- **Mã Feature:** `NOTIF` / `12-notification-realtime-communication`
- **Mã Function:** `realtime-notification`
- **Thư mục:** `docs/diagram/12-notification-realtime-communication/realtime-notification`
- **Trạng thái Review:** `Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.

---

## 1. Mục đích và phạm vi

Mô tả cơ chế đẩy thông báo thời gian thực (Realtime Push Notification) tới trình duyệt của Recruiter/Staff thông qua kết nối WebSocket (giao thức STOMP). Khi có các sự kiện như ứng viên mới ứng tuyển, kết quả phỏng vấn AI hoàn tất hoặc offer được chấp nhận, hệ thống bắn ngay thông báo tức thì lên giao diện người dùng mà không cần F5/reload trang.

## 2. Nguồn đã đối chiếu

- Configuration: `WebSocketConfig`, `SecurityConfig`
- DTO & Service: `RealtimeNotificationPayload`, `RealtimeNotificationService`
- Infrastructure: `SimpMessagingTemplate`, `RedisService` (`ws_session`)

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Client Web SPA | Trình duyệt người dùng kết nối WebSocket và lắng nghe topic STOMP. |
| STOMP WebSocket Handler | Tiếp nhận kết nối WSS, xác thực JWT token và đăng ký channel. |
| Spring Security WSS | Xác thực JWT token trên STOMP CONNECT header. |
| RealtimeNotificationService | Xử lý đẩy thông báo thời gian thực tới user cụ thể. |
| SimpMessagingTemplate | Framework port gửi STOMP message frame. |
| Redis Cache | Lưu trữ danh sách các phiên kết nối WebSocket active của từng Tenant (`ws_session`). |

## 4. Tiền điều kiện và hậu điều kiện

- **Tiền điều kiện:** WebSocket Handshake thành công; Token JWT hợp lệ; Client Subscribe vào topic `/topic/tenant.{tenantId}.user.{userId}`.
- **Thành công:** Message STOMP frame được đẩy xuống Client trong vòng vài milisecond; Giao diện Client hiển thị Toast thông báo phát âm thanh alert.
- **Thất bại:** Kết nối WebSocket bị ngắt -> Thông báo tự động chuyển sang lưu trữ trong In-App Notification Center.

## 5. Luồng chính và lỗi

1. **Luồng Kết nối Handshake & Register Topic:**
   - Client gửi `STOMP CONNECT` tới endpoint `ws://host/ws/notifications`.
   - Spring Security xác thực JWT Token và Tenant ID trong Header.
   - Khi thành công, lưu trạng thái phiên kết nối active trên Redis.
   - Client đăng ký topic `/topic/tenant.{tenantId}.user.{userId}`.

2. **Luồng Đẩy thông báo (Push Event):**
   - Sự kiện tuyển dụng phát sinh -> Service kiểm tra session online trong Redis.
   - Gọi `SimpMessagingTemplate.convertAndSendToUser` đẩy dữ liệu qua kênh STOMP.
   - Trình duyệt nhận frame thông báo, bật Popup Toast notification.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

- `Client`: Single Page Application (React).
- `WSHandler`: Spring STOMP WebSocket Controller.
- `Security`: Spring Security WebSocket Authenticator.
- `Service`: `RealtimeNotificationService`.
- `Messaging`: `SimpMessagingTemplate`.
- `Redis`: Cache quản lý trạng thái online.

### 6.2. Diễn giải chi tiết các bước

1. Client gửi `STOMP CONNECT`. `Security` xác thực JWT -> `WSHandler` lưu session active vào `Redis`.
2. Client gửi `SUBSCRIBE` channel theo tenant.
3. Khi có sự kiện -> `Service` đọc `Redis` kiểm tra phiên kết nối.
4. `Service` gọi `Messaging.convertAndSendToUser` đẩy frame STOMP tới Client.
5. `Client` nhận dữ liệu và hiển thị UI Toast.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **Application-design**. Kiến trúc Controller -> DTO -> Service -> Infrastructure.

### 7.1. Vai trò phần tử

| Phần tử | StereoType | Vai trò |
|---|---|---|
| `WebSocketNotificationController` | `<<Controller>>` | Xử lý handshake và quản lý kết nối STOMP. |
| `RealtimeNotificationPayload` | `<<DTO>>` | DTO chứa dữ liệu thông báo đẩy realtime. |
| `RealtimeNotificationService` | `<<Service>>` | Interface nghiệp vụ đẩy thông báo thời gian thực. |
| `RealtimeNotificationServiceImpl` | `<<Service>>` | Implementation gọi SimpMessagingTemplate đẩy dữ liệu. |
| `SimpMessagingTemplate` | `<<Framework Port>>` | Port của Spring Messaging đẩy tin nhắn qua WebSocket Broker. |
| `WebSocketSTOMPBroker` | `<<Message Broker>>` | Broker quản lý các topic đăng ký của client. |
| `RedisCache` | `<<Cache>>` | Cache lưu phiên làm việc WebSocket. |

### 7.2. Quan hệ giữa các lớp

- `WebSocketNotificationController --> RealtimeNotificationService`: Ủy quyền nghiệp vụ (`delegates >`).
- `RealtimeNotificationServiceImpl ..|> RealtimeNotificationService`: Hiện thực hóa interface (`implements`).
- `RealtimeNotificationServiceImpl ..> RealtimeNotificationPayload`: Đóng gói dữ liệu (`consumes >`).
- `RealtimeNotificationServiceImpl --> SimpMessagingTemplate`: Gửi tin nhắn STOMP (`pushes STOMP message >`).
- `RealtimeNotificationServiceImpl --> RedisCache`: Kiểm tra trạng thái online (`checks online status >`).
- `SimpMessagingTemplate --> WebSocketSTOMPBroker`: Gửi vào topic (`sends to topic >`).

## 8. Quyết định kiến trúc và bảo mật

- **Tenant Topic Isolation:** Mọi topic WebSocket đều được gán tiền tố Tenant ID (`/topic/tenant.{tenantId}.user.{userId}`) để tuyệt đối ngăn ngừa việc rò rỉ thông báo thời gian thực giữa các doanh nghiệp.
- **Graceful Fallback:** Nếu người dùng đang offline (kết nối WebSocket đứt), thông báo vẫn được lưu vào Database để hiển thị trên In-App Notification Center khi họ quay lại.

## 9. Giả định

- Client tự động kết nối lại (Auto-reconnect) WebSocket với thuật toán Exponential Backoff khi bị rớt mạng.

## 10. Hướng dẫn Render sơ đồ

Khi có yêu cầu xuất ảnh PNG từ người dùng:
```powershell
pwsh .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/12-notification-realtime-communication/realtime-notification -Format Png -PngDpi 300
```

## 11. Trạng thái Review

`Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.
