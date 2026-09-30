# FE18-F02 — Interview Scheduling & Participant Assignment

- **Feature:** `18 / direct-interview-management`
- **Function:** `interview-scheduling-participant-assignment`
- **Góc nhìn:** Application design (thiết kế đích)
- **Trạng thái:** `Complete`

## Mục đích và phạm vi

Recruiter/HR đặt thời gian, hình thức (`ONLINE` / `ONSITE` / `HYBRID`) và phân công Interviewer/Participant cho phiên DIRECT đã tạo ở F01.

**Trong phạm vi:** `POST /api/v1/direct-interviews/{id}/schedule` — tạo `interview_schedules` + `interview_participants`, cập nhật interview `SCHEDULED`.

**Ngoài phạm vi:** Candidate confirm/reschedule (SCHED-01 đầy đủ), email/WebSocket reminder, đánh giá (F03), tạo phiên (F01).

## Nguồn đã đối chiếu

- Quyết định **A + 1 + I**.
- Entity/migration `interview_schedules`, enum `ScheduleStatus`.
- Feature doc `SCHED-01` (conflict timezone, PROPOSED…).
- Bảng `interview_participants` — thiết kế đích (chưa có Flyway).

## Actor, điều kiện và kết quả

- **Actor:** `RECRUITER`, `TENANT_ADMIN`.
- **Tiền điều kiện:** Interview `mode=DIRECT`, `status=CREATED`; `endsAt > startsAt`; ≥1 participant `PRIMARY`.
- **Hậu điều kiện:** Schedule `PROPOSED`; participants lưu; interview `SCHEDULED`.
- **Lỗi:** `401`/`403`; `404`; `409` invalid state / conflict / participants.

## Trách nhiệm trong sequence

1. Staff nhập lịch + danh sách participant.
2. Service kiểm tra interview DIRECT/CREATED.
3. Validate cửa sổ thời gian, format/location, user staff hợp lệ.
4. `opt` conflict check; nhánh hard conflict trả `409`.
5. Trong một transaction: insert schedule + participants, update status `SCHEDULED`.
6. Clear `TenantContext`.

## Trách nhiệm và quan hệ trong class diagram

- Controller **delegates** `ScheduleAssignmentService`.
- Impl **persists through** schedule/participant repos; **manages** interview status.
- `InterviewSchedule` **association** tới `Interview`; typed by `InterviewFormat`, `ScheduleStatus`.
- `InterviewParticipant` **association** tới `Interview` và `User`; typed by `ParticipantRole`.
- Composition không dùng: schedule/participant độc lập lifecycle nhưng thuộc một interview.

## Multi-tenant, bảo mật

- Tenant DB only; `TenantContext` bắt buộc.
- Không lộ URL họp chứa token secret trong log.

## Giả định

| Hạng mục | Quyết định |
|---|---|
| Conflict | Soft-warn mặc định; hard-block khi bật policy |
| `format` cột | Thiết kế đích trên `interview_schedules` |
| Confirm bởi Candidate | Ngoài F02 |
| Transaction | Schedule + participants + status cùng TX |

## Kiểm tra và render

Đã validate + render PNG 300 DPI (PlantUML 1.2026.8). Đã kiểm tra metadata DPI và kiểm tra trực quan.

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/18-direct-interview-management/interview-scheduling-participant-assignment `
  -Format Png -PngDpi 300 `
  -PlantUmlJar .agents/skills/enterprise-uml-diagram/tools/plantuml.jar
```

**Review status:** `Complete`
