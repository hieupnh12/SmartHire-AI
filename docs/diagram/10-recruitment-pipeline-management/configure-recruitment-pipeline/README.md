# PIPE-02 — Cấu hình Template Quy trình tuyển dụng (Recruitment Pipeline)

- **Mã Feature:** `PIPE` / `10-recruitment-pipeline-management`
- **Mã Function:** `configure-recruitment-pipeline`
- **Thư mục:** `docs/diagram/10-recruitment-pipeline-management/configure-recruitment-pipeline`
- **Trạng thái Review:** `Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.

---

## 1. Mục đích và phạm vi

Cho phép HR Manager định nghĩa Template quy trình tuyển dụng chuẩn của toàn công ty (bao gồm các bước cố định như *Ứng tuyển*, *Sàng lọc*, *Phỏng vấn*, *Offer*, *Trúng tuyển*). Template này sau đó có thể được áp dụng tự động để khởi tạo danh sách các bước (`recruitment_stages`) cho các Job mới tạo.

## 2. Nguồn đã đối chiếu

- Entity: `PipelineTemplate`, `TemplateStage`, `RecruitmentStage`, `Job`
- Repository: `PipelineTemplateRepository`, `RecruitmentStageRepository`, `JobRepository`
- Service & Controller: `PipelineTemplateController`, `PipelineTemplateService`

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| HR Manager | Thiết lập danh sách bước chuẩn và áp dụng cho các Job. |
| Pipeline Settings UI | Giao diện kéo thả sắp xếp các bước tuyển dụng template. |
| Spring Security | Kiểm tra vai trò `TENANT_ADMIN`, `ADMIN`, hoặc `HR`. |
| TenantWebInterceptor | Thiết lập TenantContext cho kết nối DB. |
| PipelineTemplateController | Tiếp nhận request `PUT /pipeline-template` và `POST /jobs/{jobId}/pipeline:apply-template`. |
| PipelineTemplateService | Lưu template mẫu và nhân bản các bước vào Job. |
| DedicatedTenantMySQL | CSDL riêng biệt của Tenant. |

## 4. Tiền điều kiện và hậu điều kiện

- **Tiền điều kiện:** Tenant `ACTIVE`; Người dùng có quyền HR/Admin.
- **Thành công:** Template quy trình chuẩn được lưu vào `pipeline_templates`; Khi áp dụng vào Job (chưa có bước nào), toàn bộ stage mẫu được sao chép vào `recruitment_stages`.
- **Thất bại:** `401`/`403` Access Error; `400 Bad Request` (Thiếu các bước hệ thống bắt buộc); `409 Conflict` (Áp dụng template vào Job đã có quy trình).

## 5. Luồng chính và lỗi

1. **Luồng lưu Template:**
   - HR Manager cấu hình tên và thứ tự các bước -> Gửi `PUT /api/v1/tenant/pipeline-template`.
   - Kiểm tra xem các bước hệ thống bắt buộc (`APPLIED`, `HIRED`) có mặt không. Nếu thiếu -> Trả về `400 Bad Request`.
   - Lưu bản ghi Template vào CSDL của Tenant.

2. **Luồng áp dụng Template cho Job:**
   - Đội ngũ tuyển dụng bấm "Áp dụng Template" cho một Job mới -> Gửi `POST /api/v1/jobs/{jobId}/pipeline:apply-template`.
   - Hệ thống đếm số bước hiện tại của Job. Nếu `stageCount > 0` -> Trả về `409 Conflict`.
   - Đọc danh sách `TemplateStage` và nhân bản tạo các bản ghi `RecruitmentStage` tương ứng gán cho `jobId`.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

- `Manager`: HR Manager cấu hình hệ thống.
- `UI`: Giao diện cấu hình pipeline.
- `Security`: Spring Security authorization context.
- `Interceptor`: `TenantWebInterceptor` gán Tenant ID.
- `Controller`: `PipelineTemplateController` xử lý API.
- `Service`: `PipelineTemplateService` thực hiện clone stage.
- `TenantDB`: CSDL của Tenant.

### 6.2. Diễn giải chi tiết các bước

1. Manager bấm lưu cấu hình Template -> `UI` gửi `PUT /api/v1/tenant/pipeline-template`.
2. `Controller` validate danh sách bước. `Service` lưu thông tin vào `TenantDB`. Trả về HTTP 200 OK.
3. Manager áp dụng template cho Job -> `UI` gửi `POST /api/v1/jobs/{jobId}/pipeline:apply-template`.
4. `Service` đếm số bước của Job trong `TenantDB`. Nếu đã có bước -> Trả về 409 Conflict.
5. Nếu Job chưa có bước -> `Service` đọc `PipelineTemplate` và `INSERT` toàn bộ bước vào `recruitment_stages`.
6. Trả về `JobPipelineResponse` kèm HTTP 200 OK.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **Application-design**. Kiến trúc phân tầng Controller -> DTO -> Service -> Repository -> Entity -> Infrastructure.

### 7.1. Vai trò phần tử

| Phần tử | StereoType | Vai trò |
|---|---|---|
| `PipelineTemplateController` | `<<Controller>>` | Controller tiếp nhận request cấu hình template pipeline. |
| `SaveTemplateRequest` | `<<Request>>` | DTO chứa danh sách các bước draft. |
| `PipelineTemplateResponse` | `<<Response>>` | DTO phản hồi template pipeline đã lưu. |
| `JobPipelineResponse` | `<<Response>>` | DTO phản hồi kết quả áp dụng template vào Job. |
| `PipelineTemplateService` | `<<Service>>` | Interface định nghĩa nghiệp vụ template pipeline. |
| `PipelineTemplateServiceImpl` | `<<Service>>` | Implementation thực thi nhân bản stage vào Job. |
| `PipelineTemplateRepository` | `<<Repository>>` | Repository quản lý bảng `pipeline_templates`. |
| `RecruitmentStageRepository` | `<<Repository>>` | Repository quản lý bảng `recruitment_stages`. |
| `PipelineTemplate` | `<<Entity>>` | Thực thể template quy trình tuyển dụng của Tenant. |
| `TemplateStage` | `<<Entity>>` | Thực thể chi tiết từng bước trong template. |
| `RecruitmentStage` | `<<Entity>>` | Thực thể bước tuyển dụng áp dụng cho Job cụ thể. |

### 7.2. Quan hệ giữa các lớp

- `PipelineTemplateController --> PipelineTemplateService`: Ủy quyền xử lý nghiệp vụ (`delegates >`).
- `PipelineTemplateController ..> SaveTemplateRequest`: Nhận dữ liệu đầu vào (`consumes >`).
- `PipelineTemplateServiceImpl ..|> PipelineTemplateService`: Hiện thực hóa interface (`implements`).
- `PipelineTemplateServiceImpl --> PipelineTemplateRepository`: Quản lý template (`manages template >`).
- `PipelineTemplateServiceImpl --> RecruitmentStageRepository`: Lưu trữ các bước tuyển dụng của Job (`persists job stages >`).
- `PipelineTemplateRepository --> DedicatedTenantMySQL`: Lưu trữ dữ liệu (`persists to >`).
- `PipelineTemplate "1" *-- "1..*" TemplateStage`: Chứa danh sách các bước mẫu (`contains >`).
- `Job "1" *-- "0..*" RecruitmentStage`: Sở hữu danh sách các bước tuyển dụng thực tế (`owns >`).

## 8. Quyết định kiến trúc và bảo mật

- **Tenant Isolation:** Mỗi Tenant có 1 Template quy trình tuyển dụng chuẩn duy nhất được lưu trong CSDL Tenant riêng biệt.
- **Pipeline Cloned Execution:** Các bước tuyển dụng của Job được nhân bản độc lập từ Template, cho phép người dùng tùy chỉnh sâu từng bước của từng Job mà không làm ảnh hưởng đến Template chung.

## 9. Giả định

- Chỉ cho phép áp dụng Template tự động đối với các Job chưa khởi tạo bất kỳ bước tuyển dụng nào.

## 10. Hướng dẫn Render sơ đồ

Khi có yêu cầu xuất ảnh PNG từ người dùng:
```powershell
pwsh .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/10-recruitment-pipeline-management/configure-recruitment-pipeline -Format Png -PngDpi 300
```

## 11. Trạng thái Review

`Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.
