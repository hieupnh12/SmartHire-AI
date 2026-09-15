# FE08-F01 — AI Interview Question Generation

- **Feature:** `08 / ai-powered-interview` (`INT-01`)
- **Function:** `ai-interview-question-generation`
- **Góc nhìn:** Application design theo kiến trúc mục tiêu
- **Trạng thái:** `Complete`

## Mục đích và phạm vi

Recruiter/HR yêu cầu AI sinh bộ câu hỏi cho một phiên phỏng vấn đã tạo, dựa trên **Job Description**, yêu cầu tuyển dụng và thông tin ứng viên (CV). Hệ thống sinh các loại: `GENERAL`, `TECHNICAL`, `BEHAVIORAL`, `JAPANESE`, lưu `interview_questions`, chuyển status `QUESTIONS_READY`.

**Trong phạm vi:** `POST /api/v1/interviews/{id}/questions/generate` → queue `interview.questions` → persist câu hỏi.

**Ngoài phạm vi:** Voice/STT (FE08-F02); NLP Analysis & Scoring (**FE07-F02**, lựa chọn A); chỉnh sửa câu hỏi chi tiết trên UI (chỉ ghi nhận được edit trước khi start).

## Nguồn đã đối chiếu

- Yêu cầu FE-08 Question Generation; đã chốt loại câu hỏi **1**, overlap FE07 **A**.
- `docs/features/AI-Interview/Question-Generation.md` (`INT-01`)
- `docs/api/API_GUIDE.md`, `interviewApi.generateQuestions`
- `RabbitMqConfig` / `application.yml` — `interview.questions`
- Entity: `Interview`, `InterviewQuestion`, `Job`, `Cv`; enum `InterviewStatus`
- Tenant migration `interview_questions`
- `JobPublisher` / `CvAnalysisWorker` — pattern `X-Tenant-ID` trên message

## Actor, điều kiện và kết quả

- **Actor:** `RECRUITER`, `TENANT_ADMIN`; System worker.
- **Tiền điều kiện:** session tồn tại (thường `CREATED`); có Job; CV optional; tenant active.
- **Hậu điều kiện:** bộ câu hỏi draft đã lưu; `QUESTIONS_READY`; HTTP `202 Accepted`.
- **Lỗi:** `401`/`403`; `404`; `409` khi status không cho generate; AI fail không để session “thành công giả”.

## Trách nhiệm sequence

1. Guard xác thực + `TenantContext`.
2. Service tải Interview/Job/CV; kiểm tra status.
3. Publish `QuestionGenerationJob` + `202`.
4. Consumer restore tenant → Generator gọi `AiQuestionPort` với đủ 4 loại câu.
5. Thay draft questions (giới hạn số câu) → `QUESTIONS_READY`.
6. Clear `TenantContext` trên HTTP và worker.

## Class diagram — quan hệ chính

- Route **dependency** controller; controller ủy quyền `InterviewService`.
- Service **emits** job qua publisher → RabbitMQ → `InterviewQuestionConsumer` → `InterviewQuestionGenerator`.
- Generator **association** `AiQuestionPort` và repositories; Interview **composition** questions; question **typed by** `QuestionType`.
- `questionType` (+ `language`) là thiết kế đích; schema hiện có `competency` — ghi trong assumptions.

## Multi-tenant & bảo mật

- Tenant DB only; worker bắt buộc `X-Tenant-ID` + clear context.
- Không trả raw prompt lỗi AI cho client.
- Nội dung câu hỏi tiếng Nhật là nội dung nghiệp vụ, không phải PII nhạy cảm; CV chỉ dùng tín hiệu đã extract trong tenant.

## Giả định

| Hạng mục | Quyết định |
|---|---|
| Loại câu | GENERAL / TECHNICAL / BEHAVIORAL / JAPANESE |
| Analysis + Scoring | Không vẽ lại — xem FE07-F02 |
| API | `202` khi enqueue |
| `questionType` | Target column / map qua competency khi implement |

## Kiểm tra và render

Đã validate + render PNG 300 DPI. Bản sao: `D:\HocKy9\Đồ án\tài liệu\report 4\FE08-F01-*.png`.

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/08-ai-powered-interview/ai-interview-question-generation `
  -Format Png -PngDpi 300 -PlantUmlJar .agents/skills/enterprise-uml-diagram/tools/plantuml.jar
```

## Artifact

| File | Vai trò |
|---|---|
| `class-diagram.puml` | Cấu trúc sinh câu hỏi |
| `sequence-diagram.puml` | Enqueue + worker generate |
| `class-diagram.png` / `sequence-diagram.png` | PNG 300 DPI |
| `README.md` | Giải thích |
