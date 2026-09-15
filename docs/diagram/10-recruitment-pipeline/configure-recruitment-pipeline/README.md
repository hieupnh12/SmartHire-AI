# PIPE — Cấu hình pipeline công ty và job

- **Mã Feature:** `PIPE` / `10-recruitment-pipeline` (luận văn 3.10)
- **Mã Function:** `configure-recruitment-pipeline`
- **Thư mục:** `docs/diagram/10-recruitment-pipeline/configure-recruitment-pipeline`
- **Trạng thái Review:** `Complete with assumptions`

---

## 1. Mục đích và phạm vi

Tenant Admin lưu **pipeline template của công ty**, rồi **copy** template đó thành pipeline riêng của một job. Không gồm CRUD từng stage (function `manage-recruitment-stages`) và không kéo thẻ Kanban.

## 2. Nguồn đã đối chiếu

- `docs/features/Job-Recruitment/Recruitment-Stages.md` (`JOB-04`)
- `docs/api/API_GUIDE.md`: `GET/PUT /jobs/{id}/stages`
- Flyway `recruitment_stages` (`job_id`, `name`, `sort_order`, `is_terminal`)
- `Job`, `RecruitmentStage`; `JobController` hiện chỉ `/health`
- Người dùng: template công ty và pipeline theo job tách khỏi quản lý stage

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Tenant Admin / Recruiter | Sửa template (admin); apply lên job (recruiter/admin). |
| Pipeline Settings UI | Form template và nút apply. |
| Spring Security / TenantWebInterceptor | JWT + `TenantContext`. |
| PipelineTemplateController / Service | Lưu template; clone sang `recruitment_stages`. |
| Tenant DB | Template conceptual + bảng stage theo job (có thật). |

## 4. Tiền điều kiện và hậu điều kiện

**Tiền:** tenant `ACTIVE`; quyền admin để PUT template; quyền quản lý job để apply.

**Thành công lưu template:** singleton template trong Tenant DB.

**Thành công apply:** job có bộ `RecruitmentStage` clone; HTTP `201`.

**Thất bại:** `401`/`403`; `400` template sai; `404` job; `409` job đã có stage.

## 5. Luồng chính và lỗi

Lưu template → apply chỉ khi job **chưa** có stage. Job đã có pipeline thì sửa ở function quản lý stage.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

Interceptor bắt buộc vì ghi Tenant DB. Không có RabbitMQ: copy stage đồng bộ.

### 6.2. Diễn giải bước

**Lưu template**

1. Admin sửa danh sách stage mặc định — trigger.
2. `PUT /api/v1/tenant/pipeline-template`.
3. 401/403: không ghi.
4. Interceptor đặt tenant.
5. Controller nhận request.
6. Validate `sortOrder`/tên trùng.
7. Sai: `400`.
8. `saveTemplate`.
9. UPSERT template + `TemplateStage`.
10. `200`; `clear()`.

**Apply**

11. Chọn job và apply.
12. `POST .../pipeline:apply-template`.
13. 401/403 nếu không quản lý được job.
14. Interceptor đặt tenant.
15. `applyTemplateToJob`.
16. Load job + đếm stage.
17. Không có job: `404`.
18. Đã có stage: `409` — tránh ghi đè Kanban đang chạy.
19. Pipeline trống: đọc template.
20. Insert clone `RecruitmentStage` theo `jobId`.
21. `201`; UI mở Kanban; `clear()`.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **layered application-design** (`Routing & Boundary` → `Controller` → `Service` → `DTO` → `Repository` → `Domain Entity` → `Infrastructure`). Isolation qua `TenantContext` và Tenant DB, không prefix `Tenant` trên mọi package.

### 7.1. Vai trò phần tử

| Phần tử | Loại | Vai trò |
|---|---|---|
| `PipelineTemplateRoute` | conceptual API | Ba endpoint template/apply. |
| `PipelineTemplateController` | conceptual | Biên HTTP. |
| `SaveTemplateRequest` / responses | conceptual DTO | Không lộ PII. |
| `PipelineTemplateService` | conceptual | Copy template; không sửa từng stage. |
| `PipelineTemplate` / `TemplateStage` | conceptual | Một template / Tenant DB. |
| `Job` / `RecruitmentStage` | hiện có | Pipeline vật lý theo job. |
| Repositories | mix | Template conceptual; Job/Stage hiện có. |

### 7.2. Quan hệ

| Nguồn → đích | Ký pháp | Loại và lý do |
|---|---|---|
| Route → Controller | `..>` | Dependency định tuyến. |
| Controller → DTOs | `..>` | Dependency input/output. |
| Controller → Service | `-->` | Association inject. |
| Service → 3 repository | `-->` | Association persist. |
| PipelineTemplate → TemplateStage | `*--` | Composition: stage template chết theo template. |
| Job → RecruitmentStage | `*--` | Composition: stage job chết theo job (`job_id` NOT NULL). |
| Template → Job | `..>` | Dependency “copied onto”: không FK live. |
| TemplateStage → RecruitmentStage | `..>` | Dependency clone, không inheritance. |
| Repository → entity | `..>` | Manage. |
| Repository → Tenant DB | `-->` | Cùng Tenant MySQL. |

## 8. Quyết định kiến trúc và bảo mật

- **Multi-tenant:** chỉ Tenant DB hiện tại.
- **Authorization:** sửa template = admin tenant; apply = người quản lý job.
- **Transaction:** apply một transaction tenant (đọc template + insert stages).
- **Async:** không.
- **Không ghi Master.**

## 9. Giả định

- `pipeline_templates` chưa có Flyway.
- Apply không ghi đè pipeline đã có.
- Seed system stages nằm trên template và được copy; ràng buộc xóa system stage thuộc function 2.

## 10. Render và file được tạo

| File | Metadata |
|---|---|
| [class-diagram.png](class-diagram.png) | PNG, ít nhất 300 DPI |
| [sequence-diagram.png](sequence-diagram.png) | PNG, ít nhất 300 DPI |

Đã kiểm tra trực quan. Không tạo SVG.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ./.agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/10-recruitment-pipeline/configure-recruitment-pipeline `
  -PlantUmlJar "$env:LOCALAPPDATA\PlantUML\plantuml-1.2026.7.jar" `
  -Format Png `
  -PngDpi 300
```

PlantUML 1.2026.7. Script xác minh DPI PNG ≥ 300 cho cả hai chiều.

## 11. Trạng thái review

`Complete with assumptions` — nguồn và PNG 300 DPI đã xong.
