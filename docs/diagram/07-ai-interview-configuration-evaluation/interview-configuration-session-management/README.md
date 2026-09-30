# FE07-F01 — Interview Configuration & Session Management

- **Feature:** `07 / ai-interview-configuration-evaluation` (`INT-*` session bootstrap)
- **Function:** `interview-configuration-session-management`
- **Góc nhìn:** Application design theo kiến trúc mục tiêu (module hiện là scaffold)
- **Trạng thái:** `Complete`

## Mục đích và phạm vi

Recruiter/HR tạo một phiên phỏng vấn AI trước khi bắt đầu: chọn ứng viên, vị trí tuyển dụng (job), hình thức phỏng vấn (`AI_VOICE` | `AI_TEXT`), và tùy chọn gắn CV. Hệ thống lưu phiên với trạng thái `CREATED`.

**Trong phạm vi:** `POST /api/v1/interviews` — tạo phiên và trả tóm tắt session.

**Ngoài phạm vi:** sinh câu hỏi (INT-01 / feature 08), STT/NLP, scoring, feedback, practice interview, đặt lịch (SCHED-01), cập nhật/hủy phiên.

## Nguồn đã đối chiếu

- Yêu cầu người dùng cho FE07-F01; lựa chọn đã chốt: mode **B** (`AI_VOICE`/`AI_TEXT`), sequence **1** (chỉ tạo phiên).
- `docs/features/AI-Interview/Question-Generation.md` (ranh giới INT-01 sau bước create).
- `docs/api/API_GUIDE.md` — `POST /interviews`.
- `frontend/src/api/tenant/interviewApi.ts` — `create`.
- `InterviewController`, `InterviewService` (scaffold health only).
- Entity/repo: `Interview`, `InterviewRepository`, `Job`, `User`, `Cv`.
- Enum `InterviewStatus` (`CREATED` … `FAILED`).
- Tenant migration `V1__init_tenant_schema.sql` — bảng `interviews`.
- `AGENTS.md` — multi-tenant Separate DB, `TenantContext`.

## Actor, điều kiện và kết quả

- **Actor:** `RECRUITER`, `TENANT_ADMIN` (HR).
- **Tiền điều kiện:** JWT hợp lệ; tenant active; request có `X-Tenant-ID`/subdomain; `jobId`, `candidateId`, `mode` hợp lệ; nếu có `cvId` thì CV thuộc cùng candidate và job trong tenant DB.
- **Hậu điều kiện (thành công):** một bản ghi `interviews` với `status = CREATED`, `mode` đã chọn; HTTP `201` + `InterviewResponse`.
- **Kết quả lỗi:** `401`/`403` quyền; `400` DTO; `404` job/candidate/CV không tồn tại; `409` job không dùng được / candidate không đủ điều kiện / CV không khớp.

## Trách nhiệm trong sequence

1. UI thu thập job, candidate, mode, optional CV rồi gọi create.
2. Security + `TenantWebInterceptor` xác thực role, đặt `TenantContext`, rồi forward vào controller.
3. Controller validate DTO; không chứa business rule sâu.
4. Service đọc tenant hiện tại, kiểm tra Job → Candidate (`ACTIVE` + `CANDIDATE`) → optional CV (cùng user + job).
5. Các nhánh `alt` trả lỗi domain trước khi ghi; không tạo bản ghi dở dang.
6. Service tạo `Interview` (`mode`, `status=CREATED`), `INSERT` vào Tenant DB, trả response.
7. Interceptor luôn `TenantContext.clear()` trong `finally`.

## Trách nhiệm và quan hệ trong class diagram

- Không vẽ package *Routing & Boundary* / pseudo-class REST; HTTP route nằm ở sequence diagram.
- `InterviewController` **dependency** `consumes >` / `returns >` DTO và **association** `delegates >` sang `InterviewService`.
- `InterviewService` **realization** bởi `InterviewServiceImpl`; Impl **dependency** xử lý request/response; **association** tới các repository và `TenantContext`.
- `InterviewRepository` **association** `manages >` entity `Interview`; các repo Job/User/Cv dùng để validate tham chiếu trước khi lưu.
- `Interview` **association** nhiều-một tới `Job` và `User` (candidate); **association** tùy chọn tới `Cv`; **dependency** `typed by >` tới `InterviewMode` và `InterviewStatus`.
- `Cv` gắn với `Job` và `User` để diễn giải quy tắc CV phải khớp candidate + vị trí.
- Không dùng inheritance/composition cho vòng đời session ở bước create; persistence là Separate Tenant MySQL.

## Multi-tenant, bảo mật và vận hành

- Separate Database per Tenant; không gắn `tenantId` trên entity tenant.
- Chỉ ghi Tenant DB; không đụng Master DB; không publish RabbitMQ trong flow create.
- Không trả password/JWT/nội dung CV thô trong response.
- Quyền tạo phiên chỉ cho staff tuyển dụng; candidate không tạo phiên chính thức qua endpoint này.

## Giả định và quyết định đã chốt

| Hạng mục | Quyết định |
|---|---|
| Hình thức phỏng vấn | `InterviewMode`: `AI_VOICE`, `AI_TEXT` (lựa chọn B) |
| Phạm vi sequence | Chỉ tạo phiên → `CREATED` (lựa chọn 1) |
| Cột `mode` | Thuộc **thiết kế đích**; Flyway `interviews` hiện chưa có cột `mode` — cần migration khi implement |
| API body | `jobId`, `candidateId`, `cvId?`, `mode` — suy từ schema + yêu cầu; chưa có OpenAPI chi tiết |
| Role HR | Ánh xạ tới `TENANT_ADMIN` và/hoặc `RECRUITER` theo RBAC tenant |
| Code hiện tại | Scaffold (`/health` only); UML mô tả thiết kế đích, không bị giới hạn bởi scaffold |

## Kiểm tra và render

Đã validate + render bằng PlantUML 1.2026.8 (`-Format Png -PngDpi 300`). Cả hai PNG đã kiểm tra metadata 300 DPI và kiểm tra trực quan (không clipping nội dung chính). Bản sao cũng được đặt tại `D:\HocKy9\Đồ án\tài liệu\report 4`.

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/07-ai-interview-configuration-evaluation/interview-configuration-session-management `
  -Format Png -PngDpi 300 `
  -PlantUmlJar .agents/skills/enterprise-uml-diagram/tools/plantuml.jar
```

## Artifact

| File | Vai trò |
|---|---|
| `class-diagram.puml` | Cấu trúc tĩnh tạo phiên |
| `sequence-diagram.puml` | Luồng runtime create session |
| `class-diagram.png` / `sequence-diagram.png` | PNG 300 DPI |
| `README.md` | Giải thích và giả định |
