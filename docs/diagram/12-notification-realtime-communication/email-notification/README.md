# NOTIF-01 — Hệ thống gửi email bất đồng bộ (Email Notification Engine)

- **Mã Feature:** `NOTIF` / `12-notification-realtime-communication`
- **Mã Function:** `email-notification`
- **Thư mục:** `docs/diagram/12-notification-realtime-communication/email-notification`
- **Trạng thái Review:** `Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.

---

## 1. Mục đích và phạm vi

Mô tả cơ chế gửi email bất đồng bộ (Asynchronous Email Delivery) sử dụng RabbitMQ Queue (`notify.email.q`) kết hợp với Template Engine (Thymeleaf). Kiến trúc này giúp giải phóng hoàn toàn luồng HTTP Request chính, đảm bảo API phản hồi tức thì (HTTP 202 Accepted) trong khi việc kết nối SMTP và gửi email được xử lý ngầm bởi Worker Pool.

## 2. Nguồn đã đối chiếu

- Feature docs: `docs/features/Scheduling-Notifications/`
- Entity: `EmailLog`, `EmailStatus`
- Repository: `EmailLogRepository`
- Messaging & Infrastructure: `EmailNotificationProducer`, `EmailConsumerWorker`, `JavaMailSender`, `RabbitMQ`

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| System / Recruiter | Nguồn phát sinh sự kiện cần gửi email (Mời nhận việc, Mời phỏng vấn, Đổi mật khẩu). |
| EmailNotificationController | Endpoint tiếp nhận yêu cầu gửi email thủ công/custom. |
| EmailNotificationService | Render template HTML và đóng gói DTO gửi vào queue. |
| RabbitMQ (`notify.email.q`) | Hàng đợi lưu trữ thông điệp email cần gửi. |
| EmailConsumerWorker | Consumer bất đồng bộ nhận thông điệp, khôi phục TenantContext và gọi SMTP. |
| JavaMailSender | Thư viện kết nối máy chủ Mail SMTP (Amazon SES / SendGrid / Mailgun). |
| EmailLogRepository | Lưu vết lịch sử gửi email (`email_logs`) trong Tenant DB. |

## 4. Tiền điều kiện và hậu điều kiện

- **Tiền điều kiện:** Tenant `ACTIVE`; RabbitMQ đang hoạt động; Cấu hình SMTP hợp lệ.
- **Thành công:** HTTP API trả về `202 Accepted` ngay lập tức; Worker kết nối SMTP gửi thành công; Bản ghi `email_logs` được lưu với trạng thái `SENT`.
- **Thất bại:** SMTP timeout/thất bại kết nối -> `email_logs` lưu trạng thái `FAILED` kèm thông điệp lỗi (`errorMessage`).

## 5. Luồng chính và lỗi

1. **Luồng Producer (HTTP API):**
   - Service gọi `sendEmailAsync` -> Render nội dung HTML từ Thymeleaf template.
   - Đóng gói `EmailMessageDTO` chứa `tenantId`, `recipientEmail`, `subject`, `htmlBody`.
   - Đẩy thông điệp vào RabbitMQ `notify.email.q` kèm Header `X-Tenant-ID`. Trả về `202 Accepted`.

2. **Luồng Consumer Worker (Background Task):**
   - `EmailConsumerWorker` tiêu thụ tin nhắn từ RabbitMQ queue.
   - Đọc Header `X-Tenant-ID` và gọi `TenantContext.setCurrentTenant(tenantId)`.
   - Thực hiện gửi email qua `JavaMailSender.send()`.
   - Lưu kết quả (`SENT` hoặc `FAILED`) vào bảng `email_logs` trong CSDL của Tenant.
   - Xóa context bằng `TenantContext.clear()` trong khối `finally`.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

- `Caller`: Hệ thống hoặc Recruiter kích hoạt gửi email.
- `Controller`: Endpoint nhận request.
- `Service`: Service dựng nội dung email.
- `RabbitMQ`: Message broker.
- `Consumer`: Background worker lắng nghe hàng đợi email.
- `SMTP`: Máy chủ Mail SMTP external.
- `TenantDB`: CSDL của Tenant lưu nhật ký email.

### 6.2. Diễn giải chi tiết các bước

1. `Caller` kích hoạt gửi email -> `Controller` gọi `Service.sendEmailAsync`.
2. `Service` render template HTML và đẩy DTO đính kèm `X-Tenant-ID` vào `RabbitMQ`.
3. `Controller` lập tức trả về `202 Accepted` cho `Caller`.
4. `RabbitMQ` phân phối tin nhắn đến `Consumer`.
5. `Consumer` thiết lập `TenantContext` và gọi `SMTP.send()`.
6. Nếu SMTP trả về 250 OK -> `Consumer` lưu `email_logs` trạng thái `SENT`.
7. Nếu SMTP lỗi kết nối -> `Consumer` lưu `email_logs` trạng thái `FAILED` kèm lý do.
8. `Consumer` gọi `TenantContext.clear()`.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **Application-design**. Kiến trúc phân tầng Controller -> DTO -> Service -> Repository -> Entity -> Infrastructure.

### 7.1. Vai trò phần tử

| Phần tử | StereoType | Vai trò |
|---|---|---|
| `EmailNotificationController` | `<<Controller>>` | Controller tiếp nhận request gửi email. |
| `SendEmailRequest` | `<<Request>>` | DTO chứa thông tin nhận email và mã template. |
| `EmailMessageDTO` | `<<DTO>>` | DTO đóng gói gửi vào RabbitMQ queue. |
| `EmailNotificationService` | `<<Service>>` | Interface định nghĩa nghiệp vụ gửi email. |
| `EmailNotificationServiceImpl` | `<<Service>>` | Implementation thực thi đóng gói và gửi SMTP. |
| `EmailLogRepository` | `<<Repository>>` | Repository lưu vết nhật ký gửi email. |
| `EmailLog` | `<<Entity>>` | Thực thể nhật ký email trong Tenant DB. |
| `EmailStatus` | `<<Enum>>` | Trạng thái gửi (PENDING, SENT, FAILED). |
| `EmailNotificationProducer` | `<<Messaging Port>>` | Port phát tin nhắn tới RabbitMQ queue. |
| `JavaMailSender` | `<<External API>>` | Port kết nối SMTP Provider ngoài. |

### 7.2. Quan hệ giữa các lớp

- `EmailNotificationController --> EmailNotificationService`: Ủy quyền xử lý nghiệp vụ (`delegates >`).
- `EmailNotificationController ..> SendEmailRequest`: Nhận dữ liệu đầu vào (`consumes >`).
- `EmailNotificationServiceImpl ..|> EmailNotificationService`: Hiện thực hóa interface (`implements`).
- `EmailNotificationServiceImpl ..> EmailMessageDTO`: Khởi tạo DTO đẩy vào queue (`constructs >`).
- `EmailNotificationServiceImpl --> EmailNotificationProducer`: Phát tin nhắn vào hàng đợi (`pushes to queue >`).
- `EmailNotificationServiceImpl --> JavaMailSender`: Gửi mail qua SMTP (`sends SMTP mail >`).
- `EmailNotificationServiceImpl --> EmailLogRepository`: Lưu nhật ký (`logs delivery >`).
- `EmailLogRepository --> DedicatedTenantMySQL`: Lưu trữ thực thể (`persists to >`).
- `EmailLog ..> EmailStatus`: Định kiểu trạng thái (`typed by >`).

## 8. Quyết định kiến trúc và bảo mật

- **Tenant Isolation in Async Worker:** Đảm bảo `X-Tenant-ID` luôn được gắn vào RabbitMQ Header để Async Worker khôi phục đúng `TenantContext`, bảo đảm `email_logs` được ghi đúng vào Database của doanh nghiệp đó.
- **Non-Blocking Architecture:** Việc đẩy gửi mail sang RabbitMQ loại bỏ hoàn toàn rủi ro HTTP Request bị treo do latency kết nối tới SMTP Provider.

## 9. Giả định

- SMTP Credential được cấu hình thông qua biến môi trường an toàn trên Server.

## 10. Hướng dẫn Render sơ đồ

Khi có yêu cầu xuất ảnh PNG từ người dùng:
```powershell
pwsh .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/12-notification-realtime-communication/email-notification -Format Png -PngDpi 300
```

## 11. Trạng thái Review

`Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.
