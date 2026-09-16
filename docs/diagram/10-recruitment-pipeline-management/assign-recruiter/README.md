# PIPE-01 — Phân công Recruiter phụ trách Job

- **Mã Feature:** `PIPE` / `10-recruitment-pipeline-management`
- **Mã Function:** `assign-recruiter`
- **Thư mục:** `docs/diagram/10-recruitment-pipeline-management/assign-recruiter`
- **Trạng thái Review:** `Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.

---

## 1. Mục đích và phạm vi

Cho phép HR Manager hoặc Admin gán chuyên viên tuyển dụng (Recruiter/HR Staff) vào phụ trách một tin tuyển dụng (`Job`). Việc phân công xác định quyền quản lý ứng viên, chấm điểm CV và thực hiện phỏng vấn đối với Job đó.

## 2. Nguồn đã đối chiếu

- Entity: `JobAssignment`, `Job`, `User`, `AssignmentRole`
- Repository: `JobAssignmentRepository`, `JobRepository`, `UserRepository`
- Service & Controller: `JobAssignmentController`, `JobAssignmentService`
- Messaging: `EventNotificationProducer`, `RabbitMQ`

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| HR Manager / Admin | Phân công Recruiter phụ trách công việc tuyển dụng. |
| Workspace UI | Giao diện quản lý phân công dự án tuyển dụng. |
| Spring Security | Kiểm tra quyền `TENANT_ADMIN`, `ADMIN`, hoặc `HR`. |
| TenantWebInterceptor | Thiết lập `TenantContext` cách ly dữ liệu. |
| JobAssignmentController | Tiếp nhận request `POST /api/v1/jobs/{jobId}/assignments`. |
| JobAssignmentService | Xử lý logic kiểm tra trùng lặp, kiểm tra quyền recruiter và lưu bản ghi. |
| JobAssignmentRepository | Quản lý bảng `job_assignments`. |
| DedicatedTenantMySQL | CSDL riêng biệt của Tenant. |
| RabbitMQ | Queue đẩy thông báo tới Recruiter được phân công. |

## 4. Tiền điều kiện và hậu điều kiện

- **Tiền điều kiện:** Tenant `ACTIVE`; Caller có quyền HR Manager/Admin; Job và Recruiter tồn tại trong CSDL Tenant.
- **Thành công:** Tạo bản ghi `JobAssignment` mới trong CSDL; Phát thông báo qua RabbitMQ tới Recruiter; Trả về HTTP 201 Created.
- **Thất bại:** `401`/`403` Access Error; `404 Not Found` (Job/User không tồn tại); `400 Bad Request` (User không có role Recruiter/HR); `409 Conflict` (Recruiter đã được phân công Job này trước đó).

## 5. Luồng chính và lỗi

1. HR Manager chọn Job và chọn Recruiter cần phân công kèm vai trò (`PRIMARY_RECRUITER`, `CO_RECRUITER`).
2. Gửi request `POST /api/v1/jobs/{jobId}/assignments`.
3. Server kiểm tra sự tồn tại của Job và User.
4. Kiểm tra xem Recruiter đã được phân công vào Job này chưa: Nếu đã có -> Trả về `409 Conflict`.
5. Tạo bản ghi `JobAssignment` trong `TenantDB`.
6. Bắn tin nhắn thông báo bất đồng bộ qua `RabbitMQ` để gửi email/in-app notification cho Recruiter.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

- `Manager`: Người phân công làm việc.
- `UI`: Giao diện quản lý tin tuyển dụng.
- `Security`: Spring Security authorization.
- `Interceptor`: `TenantWebInterceptor` xử lý `TenantContext`.
- `Controller`: `JobAssignmentController` tiếp nhận API.
- `Service`: `JobAssignmentService` xử lý logic phân công.
- `TenantDB`: CSDL của Tenant.
- `RabbitMQ`: Broker gửi thông báo.

### 6.2. Diễn giải chi tiết các bước

1. Manager thao tác phân công -> `UI` gửi `POST /api/v1/jobs/{jobId}/assignments`.
2. `Controller` gọi `Service.assignRecruiter`.
3. `Service` kiểm tra `Job` trong `TenantDB`: Nếu không thấy -> Trả về 404 Not Found.
4. `Service` kiểm tra `User` trong `TenantDB`: Nếu không hợp lệ -> Trả về 400 Bad Request.
5. `Service` kiểm tra sự tồn tại của `JobAssignment`: Nếu trùng -> Trả về 409 Conflict.
6. `Service` lưu `JobAssignment` mới vào `TenantDB`.
7. `Service` gọi `RabbitMQ` phát sự kiện phân công. Trả về `JobAssignmentResponse` kèm HTTP 201 Created.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **Application-design**. Kiến trúc phân tầng Controller -> DTO -> Service -> Repository -> Entity -> Infrastructure.

### 7.1. Vai trò phần tử

| Phần tử | StereoType | Vai trò |
|---|---|---|
| `JobAssignmentController` | `<<Controller>>` | Controller tiếp nhận request phân công recruiter. |
| `AssignRecruiterRequest` | `<<Request>>` | DTO chứa ID recruiter và vai trò phân công. |
| `JobAssignmentResponse` | `<<Response>>` | DTO trả về thông tin phân công. |
| `JobAssignmentService` | `<<Service>>` | Interface định nghĩa nghiệp vụ phân công. |
| `JobAssignmentServiceImpl` | `<<Service>>` | Implementation thực thi kiểm tra và lưu trữ. |
| `JobAssignmentRepository` | `<<Repository>>` | Repository quản lý entity `JobAssignment`. |
| `JobAssignment` | `<<Entity>>` | Thực thể liên kết giữa Job và User phụ trách. |
| `AssignmentRole` | `<<Enum>>` | Vai trò phân công (PRIMARY_RECRUITER, CO_RECRUITER). |
| `EventNotificationProducer` | `<<Messaging Port>>` | Port phát thông báo phân công qua RabbitMQ. |
| `DedicatedTenantMySQL` | `<<Database>>` | CSDL riêng của tenant. |

### 7.2. Quan hệ giữa các lớp

- `JobAssignmentController --> JobAssignmentService`: Ủy quyền xử lý nghiệp vụ (`delegates >`).
- `JobAssignmentController ..> AssignRecruiterRequest`: Nhận dữ liệu đầu vào (`consumes >`).
- `JobAssignmentController ..> JobAssignmentResponse`: Trả về kết quả (`returns >`).
- `JobAssignmentServiceImpl ..|> JobAssignmentService`: Hiện thực hóa interface (`implements`).
- `JobAssignmentServiceImpl --> JobAssignmentRepository`: Quản lý bản ghi phân công (`manages assignments >`).
- `JobAssignmentServiceImpl --> EventNotificationProducer`: Phát sự kiện thông báo (`publishes event >`).
- `JobAssignmentRepository --> DedicatedTenantMySQL`: Lưu trữ thực thể (`persists to >`).
- `JobAssignment ..> AssignmentRole`: Định kiểu vai trò (`typed by >`).
- `JobAssignment "0..*" --> "1" Job`: Phụ thuộc vào Job (`belongs to >`).
- `JobAssignment "0..*" --> "1" User`: Gán cho User (`assigned user >`).

## 8. Quyết định kiến trúc và bảo mật

- **RBAC Scoping:** Recruiter chỉ có thể xem và xử lý ứng viên của các Job mà họ được phân công làm `PRIMARY_RECRUITER` hoặc `CO_RECRUITER`.
- **Async Notification:** Bắn sự kiện qua RabbitMQ để gửi thông báo không làm nghẽn luồng xử lý chính.

## 9. Giả định

- Một Job có thể có 1 Primary Recruiter và nhiều Co-Recruiter.

## 10. Hướng dẫn Render sơ đồ

Khi có yêu cầu xuất ảnh PNG từ người dùng:
```powershell
pwsh .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/10-recruitment-pipeline-management/assign-recruiter -Format Png -PngDpi 300
```

## 11. Trạng thái Review

`Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.
