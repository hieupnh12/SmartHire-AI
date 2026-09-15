# PIPE — Gán recruiter phụ trách trên Kanban

- **Mã Feature:** `PIPE` / `10-recruitment-pipeline`
- **Mã Function:** `assign-recruiter`
- **Thư mục:** `docs/diagram/10-recruitment-pipeline/assign-recruiter`
- **Trạng thái Review:** `Complete with assumptions`

---

## 1. Mục đích và phạm vi

Gán (hoặc bỏ gán) **recruiter phụ trách từng application** trên thẻ Kanban. Không gán owner của **job** (`jobs.created_by`). Không đổi stage.

Người dùng đã chọn: gán trên từng application.

## 2. Nguồn đã đối chiếu

- `Application` (không có `assigned_recruiter_id`)
- `User` / `UserRole` / `UserStatus`
- `application_status_history` dùng làm audit ghi chú đổi assignee
- `SecurityConfig`: recruiter roles; `JOB-05` PATCH application

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Recruiter / Admin | Chọn người trên thẻ. |
| Job Kanban UI | PATCH assignee + `expectedUpdatedAt`. |
| Security / Interceptor | JWT + tenant. |
| ApplicationAssigneeController / Service | Validate role/status assignee. |
| Tenant DB | Application + User + history. |

## 4. Tiền điều kiện và hậu điều kiện

**Tiền:** caller quản lý được job của card.

**Thành công:** `assignedRecruiterId` đổi; history note; `200`.

**Thất bại:** `401`/`403`; `404`; `409` stale; `400` assignee không hợp lệ.

## 5. Luồng chính và lỗi

PATCH → load card → so `updatedAt` → kiểm user assignee → save + history.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

Không RabbitMQ: đổi owner thẻ không gửi mail bắt buộc.

### 6.2. Diễn giải bước

1. Mở thẻ, chọn assignee — trigger.
2. `PATCH /applications/{id}/assignee`.
3. 401/403.
4–6. Tenant + controller + `assign`.
7–8. Load application.
9. Không có thẻ: `404`.
10. `updatedAt` lệch: `409` — hai người sửa cùng thẻ.
11. `opt` có `recruiterId`: load User.
12. User thiếu / `LOCKED` / `CANDIDATE`: `400`.
13. Hợp lệ hoặc `recruiterId=null` (unassign): update cột assignee.
14. History note (status không đổi; note mô tả assignment — thiết kế dùng lại bảng history).
15. `200`; UI hiện tên trên thẻ; `clear()`.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **layered application-design** (`Routing & Boundary` → `Controller` → `Service` → `DTO` → `Repository` → `Domain Entity` → `Infrastructure`). Isolation qua `TenantContext` và Tenant DB, không prefix `Tenant` trên mọi package.

### 7.1. Vai trò phần tử

| Phần tử | Loại | Vai trò |
|---|---|---|
| Route / Controller | conceptual | Một endpoint. |
| `AssignRecruiterRequest` | conceptual | `recruiterId` optional + optimistic token. |
| `ApplicationCardResponse` | conceptual | Payload thẻ Kanban. |
| Service | conceptual | Rule assignee. |
| `Application` | hiện có + field conceptual assignee | Thẻ. |
| `User` | hiện có | Recruiter được gán. |
| History | hiện có | Audit. |

### 7.2. Quan hệ

| Nguồn → đích | Ký pháp | Loại và lý do |
|---|---|---|
| Route → Controller | `..>` | Dependency định tuyến. |
| Controller → request/response | `..>` | Dependency DTO. |
| Controller → Service | `-->` | Association inject. |
| Service → ApplicationRepository | `-->` | Association persist card. |
| Service → UserRepository | `-->` | Association kiểm assignee. |
| Application → User | `-->` `0..1` | Association assignedRecruiter; không composition (User sống độc lập). |
| Application → History | `*--` | Composition: history thuộc application. |
| User → Role/Status | `-->` | Typed-by. |
| Repository → entity | `..>` | Manage. |

## 8. Quyết định kiến trúc và bảo mật

- **Phạm vi 3.10:** assignee trên application, không `Job.createdBy`.
- **Optimistic lock:** `expectedUpdatedAt` vs `updatedAt`.
- **Audit:** một dòng history; không đổi `status`/`stage_id`.

## 9. Giả định

- Cột `assigned_recruiter_id` chưa có.
- Unassign = `null`.
- Recruiter phải `ACTIVE` và không phải `CANDIDATE`.

## 10. Render và file được tạo

| File | Metadata |
|---|---|
| [class-diagram.png](class-diagram.png) | PNG, ít nhất 300 DPI |
| [sequence-diagram.png](sequence-diagram.png) | PNG, ít nhất 300 DPI |

Đã kiểm tra trực quan. Không tạo SVG.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ./.agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/10-recruitment-pipeline/assign-recruiter `
  -PlantUmlJar "$env:LOCALAPPDATA\PlantUML\plantuml-1.2026.7.jar" `
  -Format Png `
  -PngDpi 300
```

PlantUML 1.2026.7. Script xác minh DPI PNG ≥ 300 cho cả hai chiều.

## 11. Trạng thái review

`Complete with assumptions` — nguồn và PNG 300 DPI đã xong.
