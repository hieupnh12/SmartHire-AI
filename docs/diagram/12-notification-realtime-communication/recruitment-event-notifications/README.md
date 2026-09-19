# NOTIF-05 — Đẩy thông báo sự kiện tuyển dụng tự động (Recruitment Event Fan-Out)

- **Mã Feature:** `NOTIF` / `12-notification-realtime-communication`
- **Mã Function:** `recruitment-event-notifications`
- **Thư mục:** `docs/diagram/12-notification-realtime-communication/recruitment-event-notifications`
- **Trạng thái Review:** `Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.

---

## 1. Mục đích và phạm vi

Mô tả mô hình phân phối thông báo tự động dựa trên sự kiện (Event-Driven Notification Fan-Out) khi xảy ra các sự kiện tuyển dụng quan trọng (Ứng viên nộp CV mới, Đặt lịch phỏng vấn, Hoàn thành bài đánh giá AI, Phản hồi Offer). Hệ thống tự động phân phối thông báo đồng thời tới 3 kênh: Lưu CSDL In-App Center, Đẩy hàng đợi Email bất đồng bộ và Bắn tin nhắn Realtime WebSocket.

## 2. Nguồn đã đối chiếu

- Domain Events: `CandidateAppliedEvent`, `InterviewScheduledEvent`
- Event Listener: `RecruitmentEventListener`
- Event Producers: `EmailNotificationProducer`, `RealtimeNotificationService`, `NotificationRepository`

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Spring ApplicationEvent Publisher | Bus phát sự kiện nội bộ backend khi có nghiệp vụ tuyển dụng hoàn tất. |
| RecruitmentEventListener | Component lắng nghe sự kiện tuyển dụng và phân phối thông báo. |
| NotificationRepository | Lưu bản ghi thông báo nội bộ vào CSDL Tenant. |
| EmailNotificationProducer | Đẩy email thông báo vào hàng đợi RabbitMQ. |
| RealtimeNotificationService | Bắn STOMP message frame qua WebSocket cho người dùng đang online. |
| DedicatedTenantMySQL | CSDL riêng biệt của Tenant. |

## 4. Tiền điều kiện và hậu điều kiện

- **Tiền điều kiện:** Sự kiện tuyển dụng (Domain Event) phát sinh thành công trong cùng Transaction DB.
- **Thành công:** Tạo bản ghi `Notification` trong CSDL Tenant; Đẩy Email DTO vào RabbitMQ queue thành công; Bắn frame WebSocket tới trình duyệt Recruiter online.
- **Thất bại:** Lỗi phát sự kiện -> Xử lý exception không làm rollback nghiệp vụ tuyển dụng chính (sử dụng `@TransactionalEventListener(phase = AFTER_COMMIT)`).

## 5. Luồng chính và lỗi

1. Sự kiện tuyển dụng (VD: Ứng viên nộp CV thành công) commit vào CSDL.
2. Spring Event Bus kích hoạt `@TransactionalEventListener` trên `RecruitmentEventListener`.
3. `RecruitmentEventListener` thiết lập `TenantContext` từ thông tin event.
4. **Song song Fan-Out:**
   - **Kênh In-App:** Lưu bản ghi `Notification` vào CSDL Tenant.
   - **Kênh Email:** Đóng gói DTO đẩy vào RabbitMQ `notify.email.q`.
   - **Kênh Realtime:** Đẩy payload qua WebSocket STOMP topic tới các Recruiter phụ trách Job.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

- `EventBus`: Bus phát sự kiện nội bộ Spring Framework.
- `Listener`: Component lắng nghe và xử lý phân phối thông báo.
- `TenantDB`: CSDL của Tenant.
- `RabbitMQ`: Broker gửi email.
- `WebSocket`: Service đẩy thông báo thời gian thực.

### 6.2. Diễn giải chi tiết các bước

1. `EventBus` phát sự kiện `CandidateAppliedEvent` sau khi transaction chính commit.
2. `Listener` nhận sự kiện, khôi phục `TenantContext`.
3. `Listener` tạo bản ghi `Notification` mới và lưu vào `TenantDB`.
4. Trong khối song song (`par`):
   - `Listener` đẩy email DTO vào `RabbitMQ`.
   - `Listener` gọi `WebSocket.pushNotificationToUser` bắn popup realtime.
5. `Listener` xóa `TenantContext.clear()`.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **Application-design**. Kiến trúc Service -> Domain Event -> Repository -> Infrastructure.

### 7.1. Vai trò phần tử

| Phần tử | StereoType | Vai trò |
|---|---|---|
| `RecruitmentEventListener` | `<<Service>>` | Interface định nghĩa listener sự kiện tuyển dụng. |
| `RecruitmentEventListenerImpl` | `<<Service>>` | Implementation xử lý phân phối thông báo 3 kênh. |
| `CandidateAppliedEvent` | `<<Domain Event>>` | Sự kiện ứng viên nộp hồ sơ. |
| `InterviewScheduledEvent` | `<<Domain Event>>` | Sự kiện lịch phỏng vấn được khởi tạo. |
| `NotificationRepository` | `<<Repository>>` | Repository lưu bản ghi thông báo in-app. |
| `Notification` | `<<Entity>>` | Thực thể thông báo nội bộ. |
| `EmailNotificationProducer` | `<<Messaging Port>>` | Port phát tin nhắn email qua RabbitMQ. |
| `RealtimeNotificationService` | `<<Service Port>>` | Port phát thông báo realtime qua WebSocket. |

### 7.2. Quan hệ giữa các lớp

- `RecruitmentEventListenerImpl ..|> RecruitmentEventListener`: Hiện thực hóa interface (`implements`).
- `RecruitmentEventListenerImpl ..> CandidateAppliedEvent`: Tiêu thụ sự kiện nộp CV (`consumes >`).
- `RecruitmentEventListenerImpl ..> InterviewScheduledEvent`: Tiêu thụ sự kiện phỏng vấn (`consumes >`).
- `RecruitmentEventListenerImpl --> NotificationRepository`: Lưu thông báo in-app (`persists in-app notification >`).
- `RecruitmentEventListenerImpl --> EmailNotificationProducer`: Đẩy mail bất đồng bộ (`triggers email >`).
- `RecruitmentEventListenerImpl --> RealtimeNotificationService`: Đẩy thông báo WebSocket (`triggers WebSocket push >`).

## 8. Quyết định kiến trúc và bảo mật

- **After-Commit Listener:** Sử dụng `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` đảm bảo thông báo chỉ được phát đi khi dữ liệu tuyển dụng đã được lưu bền vững vào CSDL, phòng ngừa tình trạng gửi thông báo rác khi transaction chính bị rollback.
- **Decoupled Architecture:** Tách rời hoàn toàn nghiệp vụ tuyển dụng (Apply, Schedule) khỏi nghiệp vụ gửi thông báo giúp mã nguồn gọn gàng và dễ bảo trì.

## 9. Giả định

- Recruiter được gán cho Job sẽ nhận được tất cả các thông báo sự kiện liên quan tới Job đó.

## 10. Hướng dẫn Render sơ đồ

Khi có yêu cầu xuất ảnh PNG từ người dùng:
```powershell
pwsh .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/12-notification-realtime-communication/recruitment-event-notifications -Format Png -PngDpi 300
```

## 11. Trạng thái Review

`Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.
