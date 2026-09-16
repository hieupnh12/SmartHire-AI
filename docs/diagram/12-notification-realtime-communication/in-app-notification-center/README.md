# NOTIF-02 — Trung tâm thông báo nội bộ ứng dụng (In-App Notification Center)

- **Mã Feature:** `NOTIF` / `12-notification-realtime-communication`
- **Mã Function:** `in-app-notification-center`
- **Thư mục:** `docs/diagram/12-notification-realtime-communication/in-app-notification-center`
- **Trạng thái Review:** `Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.

---

## 1. Mục đích và phạm vi

Mô tả hoạt động của Trung tâm thông báo (Notification Center) trên giao diện ứng dụng Workspace. Người dùng (Recruiter/Admin) có thể xem số lượng thông báo chưa đọc (Badge counter), mở danh sách thông báo phân trang, đánh giá trạng thái đã đọc (`isRead = true`) và truy cập trực tiếp các liên kết liên quan (`targetUrl`).

## 2. Nguồn đã đối chiếu

- Entity: `Notification`, `NotificationType`
- Repository: `NotificationRepository`
- Service & Controller: `NotificationCenterController`, `NotificationCenterService`
- Cache: `RedisService` (`unread_notif` counter)

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Recruiter / Staff | Người nhận thông báo trên hệ thống. |
| Notification Bell UI | Component biểu tượng quả chuông hiển thị badge số lượng và danh sách thông báo. |
| Spring Security | Xác thực token và phân quyền truy cập. |
| TenantWebInterceptor | Giải mã Tenant ID gán `TenantContext`. |
| NotificationCenterController | Tiếp nhận API `GET /notifications`, `GET /unread-count`, `PATCH /{id}/read`. |
| NotificationCenterService | Đọc/ghi thông báo và lưu cache số lượng chưa đọc trên Redis. |
| NotificationRepository | Quản lý bản ghi `notifications` trong CSDL của Tenant. |
| Redis Cache | Lưu cache số lượng thông báo chưa đọc (`tenant:{tenantId}:unread_notif:{userId}`). |
| DedicatedTenantMySQL | CSDL riêng của Tenant. |

## 4. Tiền điều kiện và hậu điều kiện

- **Tiền điều kiện:** Tenant `ACTIVE`; Người dùng đã đăng nhập hệ thống.
- **Thành công:** Trả về số lượng chưa đọc cực nhanh từ Redis Cache; Phân trang danh sách thông báo mới nhất; Cập nhật `isRead = true` và giảm counter cache khi xem.
- **Thất bại:** `401`/`403` Access Error; `404 Not Found` (Thông báo không thuộc về user).

## 5. Luồng chính và lỗi

1. **Luồng lấy số thông báo chưa đọc (Badge Counter):**
   - Khi load header ứng dụng -> Gọi `GET /api/v1/tenant/notifications/unread-count`.
   - Đọc Redis key `tenant:{tenantId}:unread_notif:{userId}`. Nếu Cache Hit -> Trả về lập tức.
   - Nếu Cache Miss -> Đếm trong `TenantDB` qua `countByRecipientIdAndIsReadFalse`, lưu vào Redis (TTL 1 giờ) và trả về client.

2. **Luồng xem danh sách & Đánh dấu đã đọc:**
   - Khi click chuông thông báo -> Gọi `GET /api/v1/tenant/notifications?page=0&size=10`.
   - Khi click vào 1 item -> Gọi `PATCH /api/v1/tenant/notifications/{id}/read`.
   - Cập nhật `is_read = true` trong `TenantDB` và giảm số đếm trong Redis (`DECR`).

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

- `User`: Người dùng ứng dụng.
- `UI`: Giao diện quả chuông thông báo.
- `Security`: Spring Security authorization context.
- `Interceptor`: `TenantWebInterceptor` xử lý `TenantContext`.
- `Controller`: `NotificationCenterController` tiếp nhận API.
- `Service`: `NotificationCenterService` xử lý cache và CSDL.
- `TenantDB`: CSDL riêng biệt của Tenant.
- `Redis`: Cache đếm số lượng chưa đọc.

### 6.2. Diễn giải chi tiết các bước

1. User load Header -> `UI` gửi `GET /unread-count`.
2. `Service` đọc `Redis`: Nếu Hit -> Trả về ngay. Nếu Miss -> Truy vấn `TenantDB`, set `Redis` và trả về count.
3. User mở danh sách -> `UI` gửi `GET /notifications?page=0&size=10`. `Service` đọc `TenantDB` phân trang.
4. User click thông báo -> `UI` gửi `PATCH /{id}/read`. `Service` cập nhật `is_read = true` trong `TenantDB` và gọi `Redis DECR`.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **Application-design**. Kiến trúc phân tầng Controller -> DTO -> Service -> Repository -> Entity -> Infrastructure.

### 7.1. Vai trò phần tử

| Phần tử | StereoType | Vai trò |
|---|---|---|
| `NotificationCenterController` | `<<Controller>>` | Controller tiếp nhận request xem và đánh dấu đọc thông báo. |
| `NotificationResponse` | `<<Response>>` | DTO phản hồi thông tin thông báo. |
| `UnreadCountResponse` | `<<Response>>` | DTO phản hồi số lượng thông báo chưa đọc. |
| `NotificationCenterService` | `<<Service>>` | Interface định nghĩa nghiệp vụ trung tâm thông báo. |
| `NotificationCenterServiceImpl` | `<<Service>>` | Implementation thực thi đọc/ghi CSDL và lưu Redis cache. |
| `NotificationRepository` | `<<Repository>>` | Repository quản lý bảng `notifications`. |
| `Notification` | `<<Entity>>` | Thực thể thông báo nội bộ. |
| `NotificationType` | `<<Enum>>` | Phân loại thông báo (SYSTEM, RECRUITMENT_EVENT, INTERVIEW_REMINDER, OFFER_UPDATE). |
| `RedisCache` | `<<Cache>>` | Cache số lượng thông báo chưa đọc. |

### 7.2. Quan hệ giữa các lớp

- `NotificationCenterController --> NotificationCenterService`: Ủy quyền xử lý nghiệp vụ (`delegates >`).
- `NotificationCenterController ..> NotificationResponse`: Trả về dữ liệu (`returns >`).
- `NotificationCenterController ..> UnreadCountResponse`: Trả về số đếm (`returns >`).
- `NotificationCenterServiceImpl ..|> NotificationCenterService`: Hiện thực hóa interface (`implements`).
- `NotificationCenterServiceImpl --> NotificationRepository`: Quản lý danh sách thông báo (`manages notifications >`).
- `NotificationCenterServiceImpl --> RedisCache`: Cập nhật cache chưa đọc (`caches unread count >`).
- `NotificationRepository --> DedicatedTenantMySQL`: Lưu trữ dữ liệu (`persists to >`).
- `Notification ..> NotificationType`: Định kiểu phân loại (`typed by >`).

## 8. Quyết định kiến trúc và bảo mật

- **High Performance Counter Cache:** Sử dụng Redis `DECR` và `SETEX` để hiển thị Badge Counter vô cùng nhanh chóng trên giao diện mà không tạo tải truy vấn `COUNT(*)` liên tục lên MySQL Database.
- **Tenant Isolation:** Toàn bộ thông báo được lưu trữ và truy vấn độc lập trong CSDL riêng của Tenant.

## 9. Giả định

- Mặc định danh sách thông báo sắp xếp theo thời gian tạo giảm dần (`createdAt DESC`).

## 10. Hướng dẫn Render sơ đồ

Khi có yêu cầu xuất ảnh PNG từ người dùng:
```powershell
pwsh .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/12-notification-realtime-communication/in-app-notification-center -Format Png -PngDpi 300
```

## 11. Trạng thái Review

`Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.
