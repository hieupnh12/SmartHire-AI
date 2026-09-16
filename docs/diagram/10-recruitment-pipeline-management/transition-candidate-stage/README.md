# PIPE-05 — Chuyển giai đoạn ứng viên trên Pipeline (Transition Candidate Stage)

- **Mã Feature:** `PIPE` / `10-recruitment-pipeline-management`
- **Mã Function:** `transition-candidate-stage`
- **Thư mục:** `docs/diagram/10-recruitment-pipeline-management/transition-candidate-stage`
- **Trạng thái Review:** `Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.

---

## 1. Mục đích và phạm vi

Cho phép Recruiter thao tác kéo thả (drag-and-drop) hoặc chọn chuyển giai đoạn tuyển dụng cho ứng viên trên bảng Kanban (`applications.current_stage_id`). Mỗi thao tác chuyển bước được hệ thống ghi vết vào nhật ký kiểm toán (`stage_audit_logs`) và bắn sự kiện qua RabbitMQ để phát thông báo realtime cho các thành viên phụ trách Job.

## 2. Nguồn đã đối chiếu

- Entity: `Application`, `RecruitmentStage`, `StageAuditLog`
- Repository: `ApplicationRepository`, `RecruitmentStageRepository`, `StageAuditLogRepository`
- Service & Controller: `CandidatePipelineController`, `CandidatePipelineService`
- Messaging: `EventNotificationProducer`, `RabbitMQ`

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Recruiter | Thao tác chuyển bước ứng viên trên bảng Kanban tuyển dụng. |
| Kanban Board UI | Giao diện kéo thả card ứng viên realtime. |
| Spring Security | Kiểm tra phân quyền thao tác của Recruiter được phân công Job. |
| TenantWebInterceptor | Thiết lập `TenantContext` cách ly dữ liệu theo Tenant DB. |
| CandidatePipelineController | Tiếp nhận request `POST /api/v1/applications/{applicationId}/transition`. |
| CandidatePipelineService | Cập nhật bước mới, ghi log audit trail và bắn sự kiện thông báo. |
| DedicatedTenantMySQL | CSDL riêng của Tenant. |
| RabbitMQ | Message broker phát thông báo realtime qua WebSocket/Notification center. |

## 4. Tiền điều kiện và hậu điều kiện

- **Tiền điều kiện:** Tenant `ACTIVE`; Recruiter thuộc danh sách phân công phụ trách Job; Target stage thuộc cùng Job đó.
- **Thành công:** Cập nhật `applications.current_stage_id` = `targetStageId`; Tạo bản ghi `StageAuditLog` lịch sử chuyển bước; Bắn sự kiện chuyển bước qua RabbitMQ.
- **Thất bại:** `401`/`403` Access Error; `404 Not Found` (Application không tồn tại); `400 Bad Request` (Target stage không thuộc Job này).

## 5. Luồng chính và lỗi

1. Recruiter kéo thả card ứng viên từ cột hiện tại sang cột đích trên Kanban.
2. Gửi request `POST /api/v1/applications/{applicationId}/transition` đính kèm `targetStageId` và ghi chú (tùy chọn).
3. Server kiểm tra `Application` và xác minh `targetStageId` thuộc cùng Job. Nếu không thuộc -> Trả về `400 Bad Request`.
4. Cập nhật `current_stage_id` của bản ghi `Application` trong `TenantDB`.
5. Tạo bản ghi nhật ký `StageAuditLog` lưu lại: `fromStageId`, `toStageId`, người thực hiện (`changedBy`), và thời gian.
6. Bắn sự kiện thông báo qua `RabbitMQ` để tự động cập nhật UI của các thành viên khác đang mở Kanban.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

- `Recruiter`: Người thao tác kéo thả ứng viên.
- `UI`: Giao diện bảng Kanban.
- `Security`: Spring Security authorization context.
- `Interceptor`: `TenantWebInterceptor` gán Tenant ID.
- `Controller`: `CandidatePipelineController` tiếp nhận API.
- `Service`: `CandidatePipelineService` thực hiện chuyển bước.
- `TenantDB`: CSDL riêng của Tenant.
- `RabbitMQ`: Message broker gửi sự kiện realtime.

### 6.2. Diễn giải chi tiết các bước

1. Recruiter kéo card ứng viên -> `UI` gửi `POST /api/v1/applications/{applicationId}/transition`.
2. `Controller` gọi `Service.transitionStage`.
3. `Service` tìm `Application` trong `TenantDB`: Nếu không thấy -> Trả về 404 Not Found.
4. `Service` kiểm tra `targetStageId`: Nếu không hợp lệ -> Trả về 400 Bad Request.
5. `Service` cập nhật `applications.current_stage_id` trong `TenantDB`.
6. `Service` lưu bản ghi `StageAuditLog` vào `TenantDB`.
7. `Service` gọi `RabbitMQ` phát sự kiện chuyển bước.
8. Trả về `ApplicationStageResponse` kèm HTTP 200 OK. `UI` cập nhật vị trí card trên Kanban.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **Application-design**. Kiến trúc phân tầng Controller -> DTO -> Service -> Repository -> Entity -> Infrastructure.

### 7.1. Vai trò phần tử

| Phần tử | StereoType | Vai trò |
|---|---|---|
| `CandidatePipelineController` | `<<Controller>>` | Controller tiếp nhận request chuyển bước ứng viên. |
| `TransitionStageRequest` | `<<Request>>` | DTO chứa ID bước đích và ghi chú chuyển bước. |
| `ApplicationStageResponse` | `<<Response>>` | DTO phản hồi kết quả chuyển bước. |
| `CandidatePipelineService` | `<<Service>>` | Interface định nghĩa nghiệp vụ chuyển bước ứng viên. |
| `CandidatePipelineServiceImpl` | `<<Service>>` | Implementation thực thi cập nhật bước, lưu audit và bắn sự kiện. |
| `ApplicationRepository` | `<<Repository>>` | Repository quản lý bảng `applications`. |
| `RecruitmentStageRepository` | `<<Repository>>` | Repository quản lý bảng `recruitment_stages`. |
| `StageAuditLogRepository` | `<<Repository>>` | Repository quản lý bảng `stage_audit_logs`. |
| `Application` | `<<Entity>>` | Thực thể đơn ứng tuyển của ứng viên. |
| `StageAuditLog` | `<<Entity>>` | Thực thể ghi nhật ký lịch sử chuyển bước. |
| `EventNotificationProducer` | `<<Messaging Port>>` | Port phát sự kiện chuyển bước qua RabbitMQ. |

### 7.2. Quan hệ giữa các lớp

- `CandidatePipelineController --> CandidatePipelineService`: Ủy quyền xử lý nghiệp vụ (`delegates >`).
- `CandidatePipelineController ..> TransitionStageRequest`: Nhận dữ liệu đầu vào (`consumes >`).
- `CandidatePipelineController ..> ApplicationStageResponse`: Trả về kết quả (`returns >`).
- `CandidatePipelineServiceImpl ..|> CandidatePipelineService`: Hiện thực hóa interface (`implements`).
- `CandidatePipelineServiceImpl --> ApplicationRepository`: Cập nhật đơn ứng tuyển (`updates application >`).
- `CandidatePipelineServiceImpl --> StageAuditLogRepository`: Ghi nhật ký kiểm toán (`records audit trail >`).
- `CandidatePipelineServiceImpl --> EventNotificationProducer`: Phát sự kiện thông báo (`publishes transition event >`).
- `ApplicationRepository --> DedicatedTenantMySQL`: Lưu trữ dữ liệu (`persists to >`).
- `StageAuditLogRepository --> DedicatedTenantMySQL`: Lưu trữ dữ liệu (`persists to >`).
- `Application "1" --> "1" RecruitmentStage`: Liên kết bước hiện tại (`current stage >`).
- `StageAuditLog "0..*" --> "1" Application`: Theo dõi lịch sử của đơn ứng tuyển (`tracks history >`).

## 8. Quyết định kiến trúc và bảo mật

- **Audit Traceability:** Bắt buộc lưu vết `StageAuditLog` không thể sửa xóa giúp doanh nghiệp theo dõi chính xác ai đã chuyển ứng viên qua từng vòng tuyển dụng và vào thời điểm nào.
- **Event-Driven Realtime Update:** Phát sự kiện qua RabbitMQ và WebSocket giúp các Recruiter khác đang cùng mở Kanban board thấy ứng viên nhảy cột ngay lập tức mà không cần reload trang.

## 9. Giả định

- Không giới hạn số lần chuyển bước hoặc nhảy bước (có thể nhảy từ Screening trực tiếp sang Offer nếu Recruiter có đủ thẩm quyền).

## 10. Hướng dẫn Render sơ đồ

Khi có yêu cầu xuất ảnh PNG từ người dùng:
```powershell
pwsh .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/10-recruitment-pipeline-management/transition-candidate-stage -Format Png -PngDpi 300
```

## 11. Trạng thái Review

`Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.
