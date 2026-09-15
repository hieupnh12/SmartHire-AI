# PIPE — Quản lý stage (kèm system stages)

- **Mã Feature:** `PIPE` / `10-recruitment-pipeline-management`
- **Mã Function:** `manage-recruitment-stages`
- **Thư mục:** `docs/diagram/10-recruitment-pipeline-management/manage-recruitment-stages`
- **Trạng thái Review:** `Complete with assumptions`

---

## 1. Mục đích và phạm vi

Recruiter/Admin **tạo, đổi tên, sắp xếp, xóa/archive** stage trên pipeline **của một job**, với catalog **system stages**: Applied, Screening, Assessment, Interview, Offer, Hired, Rejected.

Không copy template (function cấu hình pipeline) và không kéo ứng viên.

## 2. Nguồn đã đối chiếu

- `JOB-04`: không xóa stage đang có candidate (archive); ít nhất stage đầu/cuối
- `RecruitmentStage` / `recruitment_stages`
- API guide `GET/PUT /jobs/{id}/stages`
- Người dùng: Quản lý Stage + System stages **chung một function**

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Recruiter / Admin | Sửa cột Kanban của job. |
| Job Stages UI | List + form CRUD. |
| Security / Interceptor | JWT + tenant. |
| RecruitmentStageController / Service | Rule system vs custom. |
| Tenant DB | `recruitment_stages` + đếm `applications.stage_id`. |

## 4. Tiền điều kiện và hậu điều kiện

**Tiền:** job đã có pipeline; caller quản lý được job.

**Thành công:** stage custom được thêm/sửa/xóa; system stage không hard-delete; stage có ứng viên thì `archivedAt`.

**Thất bại:** `401`/`403`; `409 SYSTEM_STAGE_PROTECTED`.

## 5. Luồng chính và lỗi

GET list → `alt` tạo custom / rename-reorder / xóa (system forbidden | archive | hard-delete).

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

`ApplicationRepository` được service dùng gián tiếp qua Tenant DB “count applications” — không thêm lifeline để giữ 8–10 participant.

### 6.2. Diễn giải bước

1. Mở stage manager — trigger.
2. `GET /jobs/{jobId}/stages`.
3–8. RBAC, tenant, list, `200`, UI hiện cột system và custom; `clear()`.
9. `alt Create`: POST tên stage.
10–16. Insert `system=false`; `201`; cột mới.
17. `else Rename or reorder`.
18–24. PATCH/PUT order; `200`.
25. `else Delete`.
26–31. Load stage + đếm thẻ trên cột.
32. `alt System stage`: `409` — catalog bắt buộc.
33. `else` còn ứng viên: archive, `200` — không mất thẻ.
34. `else` custom trống: `DELETE`, `204`.
35. `clear()`.

Ghi chú: Hired/Rejected là terminal system; luôn còn một stage đầu và một stage cuối chưa archive.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **layered application-design** (`Routing & Boundary` → `Controller` → `Service` → `DTO` → `Repository` → `Domain Entity` → `Infrastructure`). Isolation qua `TenantContext` và Tenant DB, không prefix `Tenant` trên mọi package.

### 7.1. Vai trò phần tử

| Phần tử | Loại | Vai trò |
|---|---|---|
| `JobStageRoute` | conceptual API | GET/POST/PATCH/PUT order/DELETE. |
| `RecruitmentStageController` | conceptual | Biên HTTP. |
| DTOs | conceptual | Tên/thứ tự; `system` trên response. |
| `RecruitmentStageService` | conceptual | Rule xóa. |
| `SystemStageCode` | enum thiết kế | Bảy stage hệ thống. |
| `Job` / `RecruitmentStage` | hiện có + field conceptual `system`, `code`, `archivedAt` | Cột Kanban. |
| `Application` | hiện có | Đếm occupant. |

### 7.2. Quan hệ

| Nguồn → đích | Ký pháp | Loại và lý do |
|---|---|---|
| Route → Controller | `..>` | Dependency định tuyến. |
| Controller → request DTO | `..>` | Dependency input. |
| Controller → StageResponse | `..>` | Dependency output. |
| Controller → Service | `-->` | Association inject. |
| Service → StageRepository | `-->` | Association persist. |
| Service → ApplicationRepository | `-->` | Association đếm, không sở hữu application. |
| Service → SystemStageCode | `..>` | Dependency catalog. |
| Job → RecruitmentStage | `*--` `1..*` | Composition theo `job_id`. |
| RecruitmentStage → SystemStageCode | `-->` | Typed-by khi `system=true`. |
| Application → RecruitmentStage | `-->` | Association “currently in”; không composition. |
| Repository → entity | `..>` | Manage. |

Không inheritance custom/system: một class + cờ `system`.

## 8. Quyết định kiến trúc và bảo mật

- **Tenant:** chỉ job trong Tenant DB hiện tại.
- **Transaction:** mỗi thao tác CRUD một transaction tenant.
- **Audit chuyển ứng viên** không nằm function này.

## 9. Giả định

- `system`, `code`, `archivedAt` chưa có Flyway.
- System stage không đổi `code`; có thể đổi **tên hiển thị**.
- PUT cả mảng stage (API guide) tương đương POST/PATCH/DELETE đã tách trên sơ đồ.

## 10. Render và file được tạo

| File | Metadata |
|---|---|
| [class-diagram.png](class-diagram.png) | PNG, ít nhất 300 DPI |
| [sequence-diagram.png](sequence-diagram.png) | PNG, ít nhất 300 DPI |

Đã kiểm tra trực quan. Không tạo SVG.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ./.agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/10-recruitment-pipeline-management/manage-recruitment-stages `
  -PlantUmlJar "$env:LOCALAPPDATA\PlantUML\plantuml-1.2026.7.jar" `
  -Format Png `
  -PngDpi 300
```

PlantUML 1.2026.7. Script xác minh DPI PNG ≥ 300 cho cả hai chiều.

## 11. Trạng thái review

`Complete with assumptions` — nguồn và PNG 300 DPI đã xong.
