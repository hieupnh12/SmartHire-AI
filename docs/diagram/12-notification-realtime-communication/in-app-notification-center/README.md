# NOTIFY — In-App Notification Center

- **Mã Feature:** `NOTIFY` / `12-notification-realtime-communication` · `SCHED-02`
- **Mã Function:** `in-app-notification-center`
- **Thư mục:** `docs/diagram/12-notification-realtime-communication/in-app-notification-center`
- **Trạng thái Review:** `Complete with assumptions`

---

## 1. Mục đích và phạm vi

User đã đăng nhập **xem hộp thư in-app**, **số chưa đọc**, **đánh dấu đã đọc một hoặc tất cả**. Không tạo thông báo mới, không WebSocket, không SMTP. Ghi inbox thuộc `recruitment-event-notifications`. Đẩy realtime thuộc `realtime-notification`.

## 2. Nguồn đã đối chiếu

- `docs/features/Scheduling-Notifications/WebSocket-Notifications.md` — REST `GET /api/v1/notifications`
- `docs/api/API_GUIDE.md` — `GET/PATCH /notifications`
- Entity `Notification`, bảng `notifications` (`read_at`, `payload_json`)
- `NotificationController` / `NotificationService` hiện chỉ `/health`
- FE `notificationApi.list` / `markRead`; trang Notifications còn scaffold
- `SecurityConfig`: `/api/v1/**` mọi role tenant đã auth

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Authenticated User | Mở center, mark read. |
| Notification Center UI | GET list, PATCH read. |
| Spring Security | JWT + role. |
| TenantWebInterceptor | `TenantContext`. |
| NotificationController / Service | Inbox của **chính caller**. |
| Tenant DB | `notifications` theo `user_id`. |

## 4. Tiền điều kiện và hậu điều kiện

**Tiền:** tenant `ACTIVE`; JWT đúng tenant; user xem **inbox của mình**.

**Thành công (list):** `200` kèm items + `unreadCount` (`read_at IS NULL`).

**Thành công (mark one):** `read_at` gán nếu còn null; `200`.

**Thành công (mark all):** mọi dòng unread của caller có `read_at`; `200`.

**Thất bại:** `401`/`403`; `404` khi id không tồn tại hoặc **không thuộc** caller (không lộ inbox người khác).

## 5. Luồng chính và lỗi

Mở center → GET list → render badge → PATCH một hoặc tất cả → cập nhật unread.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

Không có RabbitMQ/WebSocket: function chỉ đọc/ghi `read_at`.

### 6.2. Diễn giải bước

**Open inbox**

1. User mở center.
2. `GET /api/v1/notifications`.
3. 401/403.
4–8. `setCurrentTenant` → `listMine` → load đúng `user_id` + đếm unread → `200` → vẽ list/badge → `clear()`.

**Mark read**

9. Chọn một hoặc tất cả.
10. `PATCH /notifications/{id}` hoặc `PATCH /notifications/read-all`.
11. 401/403.
12–14. Tenant + route.
15. `alt` mark one: tìm `id AND user_id`.
16. Không có / không sở hữu: `404` (cùng mã để không dò inbox).
17. Có: `read_at = now()` nếu còn null (idempotent nếu đã đọc).
18. `else` mark all: update mọi unread của caller.
19. `200`; badge giảm; `clear()`.

Deep link: UI điều hướng trong tenant hiện tại từ `payload_json`; không gọi API inbox khác.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **layered application-design** (`Routing & Boundary` → `Controller` → `Service` → `DTO` → `Repository` → `Domain Entity` → `Infrastructure`). Tenant isolation qua `TenantContext` và Tenant DB, không prefix `Tenant` trên mọi package.

### 7.1. Vai trò phần tử

| Phần tử | Lớp | Vai trò |
|---|---|---|
| NotificationInboxRoute | Routing | Hợp đồng GET/PATCH conceptual. |
| NotificationController | Controller | Inject service; không persist. |
| NotificationService | Service | Concrete class (không invent interface). Inbox đúng `userId`. |
| List / Item / MarkAll DTO | DTO | `unreadCount` derived; `deepLink` từ payload. |
| NotificationRepository | Repository | Query theo caller. |
| User, Notification | Domain | Composition inbox; `read_at` nguồn unread. |
| Tenant MySQL, TenantContext | Infrastructure | DB-per-tenant; set/clear context. |

### 7.2. Quan hệ

| Nguồn → đích | Ký pháp | Loại và lý do |
|---|---|---|
| Route → Controller | `-->` `defines routes` | Association định tuyến. |
| Controller → Service | `-->` `delegates` | Association inject. |
| Controller → DTO | `..>` `returns` | Dependency output. |
| Service → DTO | `..>` `creates` | Dependency map entity → response. |
| Service → Repository | `-->` `persists through` | Association. |
| Service → TenantContext | `-->` | Association phạm vi tenant. |
| Repository → Notification | `-->` `manages` | Association persist. |
| User → Notification | `*--` `inbox of` | Composition: xóa user kéo theo inbox. |
| Entity → TenantDB | `-->` `persists to` | Association hạ tầng. |

## 8. Quyết định kiến trúc và bảo mật

- **Ownership:** mọi query gắn `user_id = actor`. Không admin đọc inbox người khác trong function này.
- **Unread:** derived, không cache Redis ở đây.
- **Deep link:** client-side; server không tin path FE nếu sau này authorize resource.
- **Multi-tenant:** Tenant DB riêng; không mang `tenantId` trên entity.

## 9. Giả định

- `PATCH .../read-all` và field `unreadCount` là thiết kế; FE hiện chỉ `list` + `markRead`.
- `markRead` lặp lại trên dòng đã đọc vẫn `200`.
- Phân trang inbox không vẽ (list mới nhất).
- Tạo notification / WS / email **ngoài** function này.

## 10. Render và file được tạo

| File | Metadata |
|---|---|
| [class-diagram.png](class-diagram.png) | PNG, ít nhất 300 DPI |
| [sequence-diagram.png](sequence-diagram.png) | PNG, ít nhất 300 DPI |

Đã kiểm tra trực quan. Không tạo SVG.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ./.agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/12-notification-realtime-communication/in-app-notification-center `
  -PlantUmlJar "$env:LOCALAPPDATA\PlantUML\plantuml-1.2026.7.jar" `
  -Format Png `
  -PngDpi 300
```

## 11. Trạng thái review

`Complete with assumptions` — nguồn và PNG 300 DPI đã xong.
