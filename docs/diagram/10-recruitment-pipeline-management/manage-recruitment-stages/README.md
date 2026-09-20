# PIPE-04 — Quản lý các bước tuyển dụng của Job (Manage Job Stages)

- **Mã Feature:** `PIPE` / `10-recruitment-pipeline-management`
- **Mã Function:** `manage-recruitment-stages`
- **Thư mục:** `docs/diagram/10-recruitment-pipeline-management/manage-recruitment-stages`
- **Trạng thái Review:** `Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.

---

## 1. Mục đích và phạm vi

Cho phép Recruiter hoặc HR Manager tùy chỉnh linh hoạt các bước tuyển dụng (Job Stages) hiển thị dưới dạng cột trên bảng Kanban tuyển dụng của từng Job (Thêm bước custom, Đổi tên, Sắp xếp thứ tự `sortOrder`, và Xóa bước). Hệ thống đảm bảo tính toàn vẹn dữ liệu: Không cho phép xóa bước tuyển dụng đang chứa hồ sơ ứng viên đang xử lý.

## 2. Nguồn đã đối chiếu

- Entity: `RecruitmentStage`, `Job`, `Application`
- Repository: `RecruitmentStageRepository`, `JobRepository`, `ApplicationRepository`
- Service & Controller: `JobStageController`, `JobStageService`

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| HR Manager / Recruiter | Tùy chỉnh danh sách bước tuyển dụng trên cột Kanban của Job. |
| Kanban Board Settings UI | Giao diện kéo thả đổi thứ tự bước và tạo/xóa cột Kanban. |
| Spring Security | Kiểm tra phân quyền truy cập endpoint quản lý stage. |
| TenantWebInterceptor | Giải mã Tenant ID và thiết lập `TenantContext`. |
| JobStageController | Tiếp nhận API `POST`, `PUT`, `DELETE` liên quan tới bước tuyển dụng. |
| JobStageService | Thực thi kiểm tra số lượng ứng viên trong bước trước khi xóa và lưu lại thứ tự. |
| RecruitmentStageRepository | Thao tác dữ liệu trên bảng `recruitment_stages`. |
| DedicatedTenantMySQL | CSDL riêng biệt của Tenant. |

## 4. Tiền điều kiện và hậu điều kiện

- **Tiền điều kiện:** Tenant `ACTIVE`; Người dùng có quyền truy cập Job tương ứng.
- **Thành công:** Bước tuyển dụng mới được chèn vào vị trí tương ứng; Thứ tự bước được cập nhật; Bước tuyển dụng rỗng bị xóa khỏi CSDL.
- **Thất bại:** `401`/`403` Access Error; `404 Not Found`; `409 Conflict` (Chặn xóa bước tuyển dụng đang có ứng viên).

## 5. Luồng chính và lỗi

1. **Luồng Thêm bước mới:**
   - Người dùng nhập tên bước và chọn vị trí chèn -> Gửi `POST /api/v1/jobs/{jobId}/stages`.
   - Server tính toán `sortOrder` và lưu bản ghi `RecruitmentStage` mới vào CSDL Tenant.

2. **Luồng Xóa bước:**
   - Người dùng bấm nút Xóa bước tuyển dụng trên cột Kanban -> Gửi `DELETE /api/v1/jobs/{jobId}/stages/{stageId}`.
   - Hệ thống kiểm tra số lượng ứng viên hiện tại trong bước qua `countByCurrentStageId(stageId)`.
   - Nếu `applicantCount > 0` -> Trả về `409 Conflict (STAGE_NOT_EMPTY)`.
   - Nếu rỗng -> Tiến hành `DELETE FROM recruitment_stages` và trả về `204 No Content`.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

- `Manager`: Recruiter/HR quản lý công việc.
- `UI`: Giao diện Kanban board.
- `Security`: Spring Security authorization context.
- `Interceptor`: `TenantWebInterceptor` xử lý `TenantContext`.
- `Controller`: `JobStageController` xử lý API.
- `Service`: `JobStageService` xử lý logic.
- `TenantDB`: CSDL riêng của Tenant.

### 6.2. Diễn giải chi tiết các bước

1. Manager bấm thêm bước -> `UI` gửi `POST /api/v1/jobs/{jobId}/stages`.
2. `Controller` gọi `Service.addStage`. `Service` lưu bản ghi `RecruitmentStage` vào `TenantDB`. Trả về 201 Created.
3. Manager bấm xóa bước -> `UI` gửi `DELETE /api/v1/jobs/{jobId}/stages/{stageId}`.
4. `Service` đếm ứng viên bằng `countByCurrentStageId`. Nếu có ứng viên -> Trả về 409 Conflict.
5. Nếu bước rỗng -> `Service` xóa bản ghi `RecruitmentStage` trong `TenantDB`. Trả về 204 No Content.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **Application-design**. Kiến trúc phân tầng Controller -> DTO -> Service -> Repository -> Entity -> Infrastructure.

### 7.1. Vai trò phần tử

| Phần tử | StereoType | Vai trò |
|---|---|---|
| `JobStageController` | `<<Controller>>` | Controller tiếp nhận request thêm, sửa, xóa bước tuyển dụng. |
| `CreateStageRequest` | `<<Request>>` | DTO chứa tên bước và vị trí sắp xếp. |
| `ReorderStagesRequest` | `<<Request>>` | DTO chứa mảng ID sắp xếp lại thứ tự các bước. |
| `StageResponse` | `<<Response>>` | DTO phản hồi thông tin bước tuyển dụng và số ứng viên đang ở bước đó. |
| `JobStageService` | `<<Service>>` | Interface định nghĩa nghiệp vụ quản lý bước tuyển dụng. |
| `JobStageServiceImpl` | `<<Service>>` | Implementation thực thi sắp xếp và kiểm tra tính rỗng trước khi xóa. |
| `RecruitmentStageRepository` | `<<Repository>>` | Repository quản lý bảng `recruitment_stages`. |
| `ApplicationRepository` | `<<Repository>>` | Repository kiểm tra ứng viên đang ở bước tuyển dụng. |
| `RecruitmentStage` | `<<Entity>>` | Thực thể bước tuyển dụng của Job. |

### 7.2. Quan hệ giữa các lớp

- `JobStageController --> JobStageService`: Ủy quyền xử lý nghiệp vụ (`delegates >`).
- `JobStageController ..> CreateStageRequest`: Nhận dữ liệu đầu vào (`consumes >`).
- `JobStageController ..> ReorderStagesRequest`: Nhận mảng sắp xếp (`consumes >`).
- `JobStageServiceImpl ..|> JobStageService`: Hiện thực hóa interface (`implements`).
- `JobStageServiceImpl --> RecruitmentStageRepository`: Quản lý danh sách bước tuyển dụng (`manages stages >`).
- `JobStageServiceImpl --> ApplicationRepository`: Kiểm tra việc sử dụng bước (`checks stage usage >`).
- `RecruitmentStageRepository --> DedicatedTenantMySQL`: Lưu trữ thực thể (`persists to >`).
- `Job "1" *-- "0..*" RecruitmentStage`: Sở hữu danh sách các bước (`owns >`).

## 8. Quyết định kiến trúc và bảo mật

- **Data Integrity Safety:** Ngăn chặn việc xóa nhầm bước tuyển dụng đang có ứng viên giúp tránh làm mồ côi các bản ghi ứng tuyển (`applications.current_stage_id`).
- **Flexible Pipeline Customization:** Cho phép từng Job có thể tự điều chỉnh quy trình tuyển dụng mà không bị gò bó bởi quy trình mặc định của toàn công ty.

## 9. Giả định

- Ứng viên phải được chuyển sang bước tuyển dụng khác trên Kanban trước khi bước hiện tại có thể bị xóa.

## 10. Hướng dẫn Render sơ đồ

Khi có yêu cầu xuất ảnh PNG từ người dùng:
```powershell
pwsh .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/10-recruitment-pipeline-management/manage-recruitment-stages -Format Png -PngDpi 300
```

## 11. Trạng thái Review

`Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.
