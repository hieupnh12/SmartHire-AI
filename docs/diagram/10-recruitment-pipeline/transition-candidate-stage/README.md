# PIPE — Chuyển giai đoạn và ghi lịch sử

- **Mã Feature:** `PIPE` / `10-recruitment-pipeline` · `WF-01`/`WF-02`
- **Mã Function:** `transition-candidate-stage`
- **Thư mục:** `docs/diagram/10-recruitment-pipeline/transition-candidate-stage`
- **Trạng thái Review:** `Complete with assumptions`

---

## 1. Mục đích và phạm vi

Recruiter xem Kanban, **kéo thẻ** sang stage khác, hệ thống **validate**, ghi **history** và **time-in-stage**, chống ghi đè đồng thời. Trigger Assessment/Interview chỉ là **event** (không chạy bài test/phỏng vấn trong function này). Offer/Hire/Reject thuộc `create-and-track-offer`.

## 2. Nguồn đã đối chiếu

- `docs/features/Recruitment-Workflow/Recruitment-Pipeline.md`, `Candidate-Status.md`
- API: `GET /jobs/{id}/pipeline`, `POST /applications/{id}/move`
- `Application`, `RecruitmentStage`, `ApplicationStatusHistory`, `ApplicationStatus`
- `WorkflowController` hiện chỉ `/health`
- `RabbitMqConfig` `notify-email`

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Recruiter | Kéo thẻ. |
| Job Kanban UI | GET board + POST move + version. |
| Security / Interceptor | JWT + tenant. |
| WorkflowController / Service | Move + history. |
| TransitionPolicy | Ma trận chuyển. |
| Tenant DB | Stage, application, history. |
| RabbitMQ | `opt` khi vào Assessment/Interview. |

## 4. Tiền điều kiện và hậu điều kiện

**Tiền:** job có pipeline; card chưa `HIRED`/`REJECTED`.

**Thành công:** `stage_id` (và `status` map) đổi; history đóng stay cũ (duration); stay mới `enteredAt`; `200`.

**Thất bại:** `401`/`403`; `404`; `409` stale; `422` transition cấm.

## 5. Luồng chính và lỗi

GET Kanban → POST move → load → policy → đóng history cũ → update card → insert history mới → opt notify.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

`TransitionPolicy` gói trong `WorkflowService.canMove` trên sequence (không thêm lifeline) để giữ số participant.

### 6.2. Diễn giải bước

**Load**

1. Mở pipeline job.
2. `GET /jobs/{jobId}/pipeline`.
3–8. Tenant, load columns+cards, `200`, vẽ Kanban; `clear()`.

**Move**

9. Kéo thẻ.
10. `POST /applications/{id}/move` (`toStageId`, `expectedUpdatedAt`).
11. 401/403.
12–14. `move` + load card/stages/history cuối.
15. `alt` thiếu / stale / cấm (lùi từ Hired, nhảy cóc nếu policy cấm): `404`/`409`/`422`.
16. Được phép: đóng history trước (`exitedAt`, `durationSeconds = exitedAt - enteredAt`).
17. Update `stage_id`, `status`, `updatedAt`.
18. Insert history mới (`enteredAt=now`).
19. `opt` đích Assessment/Interview: publish `X-Tenant-ID` — worker chương khác xử lý.
20. `200`; thẻ sang cột mới; `clear()`.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **layered application-design** (`Routing & Boundary` → `Controller` → `Service` → `DTO` → `Repository` → `Domain Entity` → `Infrastructure`). Isolation qua `TenantContext` và Tenant DB, không prefix `Tenant` trên mọi package. `TransitionPolicy` gói trong `WorkflowService.canMove`.

### 7.1. Vai trò phần tử

| Phần tử | Loại | Vai trò |
|---|---|---|
| Route / WorkflowController | mix | GET pipeline + POST move; method conceptual trên scaffold. |
| `MoveApplicationRequest` | conceptual | Đích + optimistic token. |
| `PipelineBoardResponse` | conceptual | Kanban DTO. |
| `WorkflowService` | hiện có (scaffold) | Điều phối. |
| `TransitionPolicy` | conceptual | Rule chuyển. |
| Producer / queue | conceptual + topology có | Side-effect. |
| Application / Stage / History / Status | mix | History thêm field duration conceptual. |

### 7.2. Quan hệ

| Nguồn → đích | Ký pháp | Loại và lý do |
|---|---|---|
| Route → Controller | `..>` | Dependency định tuyến. |
| Controller → DTO | `..>` | Dependency. |
| Controller → Service | `-->` | Association inject. |
| Service → TransitionPolicy | `-->` | Association consult (không persist). |
| Service → ApplicationRepository | `-->` | Association persist card. |
| Service → Producer | `-->` | Association event. |
| Producer → Queue | `..>` | Dependency publish. |
| Application → Stage | `-->` | Association hiện tại. |
| Application → Status | `-->` | Typed-by. |
| Application → History | `*--` | Composition audit. |
| Repository → Application | `..>` | Manage. |

## 8. Quyết định kiến trúc và bảo mật

- **Optimistic lock:** `expectedUpdatedAt`.
- **Time-in-stage:** từ history, không cột riêng trên application.
- **Async:** mail/trigger không rollback move đã commit.
- **Audit:** mỗi move một (và đóng) history row.

## 9. Giả định

- History hiện chỉ `from_status`/`to_status`; duration/stage id là thiết kế.
- Map stage code → `ApplicationStatus` (ví dụ SCREENING → `IN_REVIEW`).
- Bulk move = lặp cùng API, không vẽ `loop` để tránh phình sơ đồ.
- Không reopen HIRED/REJECTED ở đây.

## 10. Render và file được tạo

| File | Metadata |
|---|---|
| [class-diagram.png](class-diagram.png) | PNG, ít nhất 300 DPI |
| [sequence-diagram.png](sequence-diagram.png) | PNG, ít nhất 300 DPI |

Đã kiểm tra trực quan. Không tạo SVG.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ./.agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/10-recruitment-pipeline/transition-candidate-stage `
  -PlantUmlJar "$env:LOCALAPPDATA\PlantUML\plantuml-1.2026.7.jar" `
  -Format Png `
  -PngDpi 300
```

PlantUML 1.2026.7. Script xác minh DPI PNG ≥ 300 cho cả hai chiều.

## 11. Trạng thái review

`Complete with assumptions` — nguồn và PNG 300 DPI đã xong.
