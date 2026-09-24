# FE18-F01 — Direct Interview Setup

- **Feature:** `18 / direct-interview-management`
- **Function:** `direct-interview-setup`
- **Góc nhìn:** Application design (thiết kế đích; schedule module hiện scaffold)
- **Trạng thái:** `Complete`

## Mục đích và phạm vi

Recruiter/HR/Interviewer tạo phiên phỏng vấn trực tiếp: gắn Candidate, Job/Application, loại phỏng vấn và thông tin cần thiết. Hệ thống lưu `interviews` với `mode = DIRECT`, `status = CREATED`.

**Trong phạm vi:** `POST /api/v1/direct-interviews`.

**Ngoài phạm vi:** đặt lịch & participant (F02), đánh giá (F03), AI interview (FE-07/08), email/WebSocket reminder.

## Nguồn đã đối chiếu

- Quyết định người dùng: **A + 1 + I**.
- Entity `Interview`, bảng `interviews` / `applications` (Flyway tenant).
- FE-07 pattern tạo session AI; FE-18 mở rộng `InterviewMode.DIRECT`.
- `ScheduleController` / `ScheduleService` — scaffold health only.
- `AGENTS.md` — Separate Tenant DB, `TenantContext`.

## Actor, điều kiện và kết quả

- **Actor:** `RECRUITER`, `TENANT_ADMIN` (HR), `INTERVIEWER` (nếu role có trong RBAC tenant).
- **Tiền điều kiện:** JWT + tenant active; `applicationId`/`jobId`/`candidateId` khớp nhau; optional CV thuộc candidate+job.
- **Hậu điều kiện:** `interviews` row `mode=DIRECT`, `status=CREATED`, có `interviewType`.
- **Lỗi:** `401`/`403`; `400`; `404`/`409` tham chiếu không hợp lệ.

## Trách nhiệm trong sequence

1. UI thu thập application/job/candidate/type rồi gọi create.
2. Security + interceptor set `TenantContext`.
3. Service validate Application ↔ Job ↔ Candidate (và CV nếu có).
4. Insert Interview `DIRECT` / `CREATED`; trả `201`.
5. `TenantContext.clear()` trong `finally`.

## Trách nhiệm và quan hệ trong class diagram

- Controller **dependency** consumes/returns DTO; **association** `delegates >` service.
- Service **realization** bởi Impl; Impl **association** tới các repository và `TenantContext`.
- `Interview` **association** tới `Application`, `Job`, `User`, optional `Cv`; **dependency** typed by `InterviewMode`, `DirectInterviewType`, `InterviewStatus`.
- Không schedule/participant trên sơ đồ này.

## Multi-tenant, bảo mật

- Chỉ Tenant DB; không Master DB.
- Không trả PII thừa/secret trong response.

## Giả định

| Hạng mục | Quyết định |
|---|---|
| Endpoint | `/api/v1/direct-interviews` (tách rõ khỏi AI create) |
| `interviewType` | TECHNICAL / HR / BEHAVIORAL / FINAL |
| Cột `mode`, `application_id`, `interview_type` | Thiết kế đích — cần Flyway khi implement |
| Status DIRECT | CREATED → SCHEDULED → IN_PROGRESS → EVALUATED (khác lifecycle AI chi tiết) |

## Kiểm tra và render

Đã validate + render PNG 300 DPI (PlantUML 1.2026.8). Đã kiểm tra metadata DPI và kiểm tra trực quan.

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/18-direct-interview-management/direct-interview-setup `
  -Format Png -PngDpi 300 `
  -PlantUmlJar .agents/skills/enterprise-uml-diagram/tools/plantuml.jar
```

**Review status:** `Complete`
