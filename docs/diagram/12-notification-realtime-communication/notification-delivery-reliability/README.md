# NOTIF-03 — Độ tin cậy và xử lý lỗi gửi thông báo (Notification Delivery Reliability & DLQ)

- **Mã Feature:** `NOTIF` / `12-notification-realtime-communication`
- **Mã Function:** `notification-delivery-reliability`
- **Thư mục:** `docs/diagram/12-notification-realtime-communication/notification-delivery-reliability`
- **Trạng thái Review:** `Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.

---

## 1. Mục đích và phạm vi

Mô tả cơ chế đảm bảo độ tin cậy tuyệt đối khi gửi thông báo (Email / Realtime) bằng RabbitMQ Dead Letter Exchange (`notify.dlx`), Dead Letter Queue (`notify.dlq`) và Retry Scheduler tự động. Đảm bảo không làm mất bất kỳ thông báo quan trọng nào khi xảy ra sự cố mạng, tràn tải hoặc lỗi phía nhà cung cấp SMTP/WebSocket.

## 2. Nguồn đã đối chiếu

- Entity: `DeadLetterNotification`, `DLQStatus`
- Repository: `DeadLetterNotificationRepository`
- Service & Scheduler: `NotificationReliabilityService`, `RetryScheduler`
- Messaging Architecture: `RabbitMQ` (`notify.email.q`, `notify.dlx`, `notify.dlq`)

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Primary Queue (`notify.email.q`) | Hàng đợi thông báo chính. |
| EmailConsumerWorker | Consumer chính thực thi gửi thông báo. |
| Dead Letter Exchange (`notify.dlx`) | Exchange hứng các tin nhắn gửi thất bại quá số lần quy định. |
| Dead Letter Queue (`notify.dlq`) | Hàng đợi lưu giữ các thông điệp bị lỗi. |
| DLQConsumerWorker | Consumer tiêu thụ tin nhắn lỗi từ DLQ và lưu vào CSDL. |
| NotificationReliabilityService | Quản lý lưu vết tin nhắn lỗi và thực thi thử lại (Retry). |
| DeadLetterNotificationRepository | Quản lý bảng `dead_letter_notifications` trong CSDL Tenant. |
| RetryScheduler | Cronjob quét định kỳ thử lại các tin nhắn lỗi. |

## 4. Tiền điều kiện và hậu điều kiện

- **Tiền điều kiện:** RabbitMQ được cấu hình Dead Letter Exchange; CSDL Tenant hỗ trợ bảng `dead_letter_notifications`.
- **Thành công:** Thông điệp bị lỗi được chuyển sang DLQ an toàn; Lưu thông tin lỗi vào CSDL; Retry Scheduler đẩy lại vào Primary Queue thành công -> Chuyển trạng thái sang `RESOLVED`.
- **Thất bại:** Quá số lần thử lại tối đa (`maxRetryAttempts`) -> Chuyển trạng thái sang `ABANDONED` để quản trị viên can thiệp thủ công.

## 5. Luồng chính và lỗi

1. **Luồng đẩy tin nhắn vào DLQ:**
   - Consumer chính xử lý tin nhắn và gặp lỗi (Mạng, SMTP chập chờn).
   - Nếu số lần retry trực tiếp vượt quá ngưỡng (3 lần) -> Consumer gửi `NACK (requeue = false)`.
   - RabbitMQ tự động đẩy thông điệp sang `notify.dlx` và đưa vào `notify.dlq`.

2. **Luồng lưu vết và Retry ngầm:**
   - `DLQConsumerWorker` tiêu thụ tin nhắn từ `notify.dlq`.
   - Lưu thông tin lỗi vào bảng `dead_letter_notifications` với trạng thái `PENDING_RETRY`.
   - Định kỳ (mỗi 15 phút), `RetryScheduler` quét các bản ghi `PENDING_RETRY` và đẩy lại vào Primary Queue.
   - Nếu đẩy lại thành công -> Đổi trạng thái sang `RESOLVED`. Nếu vượt quá 5 lần retry thất bại -> Đổi sang `ABANDONED`.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

- `MainQueue`: Hàng đợi chính.
- `Consumer`: Worker xử lý chính.
- `DLX / DLQ`: Dead Letter Infrastructure của RabbitMQ.
- `DLQWorker`: Consumer tiêu thụ tin nhắn bị từ chối.
- `Service`: Service quản lý độ tin cậy.
- `TenantDB`: CSDL riêng của Tenant.
- `Scheduler`: Tiến trình chạy tự động định kỳ.

### 6.2. Diễn giải chi tiết các bước

1. `Consumer` thất bại liên tục -> Phát lệnh NACK không requeue.
2. `RabbitMQ` chuyển tin nhắn từ `MainQueue` qua `DLX` vào `DLQ`.
3. `DLQWorker` đọc `DLQ`, kích hoạt `TenantContext` và gọi `Service.handleDeadLetterMessage`.
4. `Service` lưu bản ghi `DeadLetterNotification` PENDING_RETRY vào `TenantDB`.
5. `RetryScheduler` khởi chạy theo định kỳ -> Truy vấn danh sách tin nhắn lỗi từ `TenantDB`.
6. Với mỗi tin nhắn -> Đẩy lại vào `MainQueue`. Nếu thành công -> Cập nhật trạng thái `RESOLVED`.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **Application-design**. Kiến trúc phân tầng Service -> Repository -> Entity -> Infrastructure.

### 7.1. Vai trò phần tử

| Phần tử | StereoType | Vai trò |
|---|---|---|
| `NotificationReliabilityService` | `<<Service>>` | Interface nghiệp vụ độ tin cậy và retry thông báo. |
| `NotificationReliabilityServiceImpl` | `<<Service>>` | Implementation thực thi xử lý DLQ và re-publish. |
| `FailedNotificationDTO` | `<<DTO>>` | DTO chứa thông tin tin nhắn bị lỗi. |
| `DeadLetterNotificationRepository` | `<<Repository>>` | Repository quản lý bảng `dead_letter_notifications`. |
| `DeadLetterNotification` | `<<Entity>>` | Thực thể lưu vết tin nhắn lỗi trong CSDL Tenant. |
| `DLQStatus` | `<<Enum>>` | Trạng thái tin nhắn lỗi (PENDING_RETRY, RESOLVED, ABANDONED). |
| `EmailNotificationProducer` | `<<Messaging Port>>` | Port đẩy lại tin nhắn vào RabbitMQ queue chính. |

### 7.2. Quan hệ giữa các lớp

- `NotificationReliabilityServiceImpl ..|> NotificationReliabilityService`: Hiện thực hóa interface (`implements`).
- `NotificationReliabilityServiceImpl ..> FailedNotificationDTO`: Nhận dữ liệu tin nhắn lỗi (`consumes >`).
- `NotificationReliabilityServiceImpl --> DeadLetterNotificationRepository`: Quản lý nhật ký lỗi (`manages dead letters >`).
- `NotificationReliabilityServiceImpl --> EmailNotificationProducer`: Đẩy lại tin nhắn (`retries message delivery >`).
- `DeadLetterNotificationRepository --> DedicatedTenantMySQL`: Lưu trữ dữ liệu (`persists to >`).
- `DeadLetterNotification ..> DLQStatus`: Định kiểu trạng thái (`typed by >`).

## 8. Quyết định kiến trúc và bảo mật

- **Zero-Loss Guarantee:** Sự kết hợp giữa RabbitMQ DLQ và CSDL Tenant bảo đảm rằng kể cả khi RabbitMQ bị ngắt hoặc SMTP Provider bị sập cả ngày, dữ liệu thông báo vẫn được lưu vết đầy đủ để khôi phục khi hệ thống bình thường trở lại.
- **Controlled Re-publishing:** Thử lại theo thuật toán Exponential Backoff kết hợp giới hạn số lần thử lại tối đa tránh gây hiện tượng bão tin nhắn (Message Storm) đè nặng lên RabbitMQ Server.

## 9. Giả định

- Số lần thử lại tối đa trước khi đưa vào trạng thái `ABANDONED` là 5 lần.

## 10. Hướng dẫn Render sơ đồ

Khi có yêu cầu xuất ảnh PNG từ người dùng:
```powershell
pwsh .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/12-notification-realtime-communication/notification-delivery-reliability -Format Png -PngDpi 300
```

## 11. Trạng thái Review

`Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.
