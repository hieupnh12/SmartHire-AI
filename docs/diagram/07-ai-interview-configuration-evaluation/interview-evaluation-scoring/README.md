# FE07-F02 — Interview Evaluation & Scoring

- **Feature:** `07 / ai-interview-configuration-evaluation` (`INT-03` + `INT-04`)
- **Function:** `interview-evaluation-scoring`
- **Góc nhìn:** Application design theo kiến trúc mục tiêu (module interview hiện scaffold)
- **Trạng thái:** `Complete`

## Mục đích và phạm vi

Sau khi ứng viên đã trả lời, Recruiter/HR yêu cầu chấm điểm. Hệ thống đánh giá **từng câu** theo rubric cố định (relevance, depth, soft-skills) kết hợp `competency` của câu hỏi, lưu kết quả vào `interview_answer_analyses`, rồi tổng hợp **điểm phiên** vào `interview_scores` và chuyển trạng thái `SCORED`.

**Trong phạm vi (lựa chọn A + 1):**

- `POST /api/v1/interviews/{id}/score` → queue `interview.score`
- Đánh giá từng câu + điểm câu; tổng hợp overall + `breakdown_json`
- Idempotent re-score (upsert)
- Multi-tenant async: header `X-Tenant-ID`, restore/clear `TenantContext`

**Ngoài phạm vi:** tạo phiên (F01), sinh câu hỏi, STT live, share feedback (INT-05), UI chỉnh rubric theo Job.

## Nguồn đã đối chiếu

- Yêu cầu người dùng FE07 Evaluation & Scoring; đã chốt phạm vi **A**, tiêu chí **1**.
- `docs/features/AI-Interview/NLP-Response-Analysis.md` (`INT-03`)
- `docs/features/AI-Interview/AI-Scoring.md` (`INT-04`)
- `docs/api/API_GUIDE.md` — `POST /interviews/{id}/score`
- `frontend/src/api/tenant/interviewApi.ts` — `score`
- `RabbitMqConfig` / `application.yml` — exchange/queue `interview.score`
- Entity: `Interview`, `InterviewQuestion`, `InterviewAnswer`, `InterviewAnswerAnalysis`, `InterviewScore`
- Enum `InterviewStatus` (`SCORING`, `SCORED`, `FAILED`, …)
- Migrations tenant: `interviews`, `interview_questions`, `interview_answers`, `interview_answer_analyses`, `interview_scores`
- `AGENTS.md` — tenant isolation trên worker

## Actor, điều kiện và kết quả

- **Actor:** `RECRUITER`, `TENANT_ADMIN` (kích hoạt); System worker (chấm bất đồng bộ).
- **Tiền điều kiện:** JWT + tenant active; interview tồn tại trong Tenant DB; đã có câu trả lời với transcript dùng được; status cho phép chuyển sang `SCORING`.
- **Hậu điều kiện (thành công):** mỗi answer có analysis (điểm/câu + tiêu chí); một `interview_scores` (overall + breakdown); `status = SCORED`; HTTP đồng bộ `202 Accepted`.
- **Kết quả lỗi:** `401`/`403`; `404` interview; `409` chưa sẵn sàng chấm; worker lỗi → `FAILED` (không coi là thành công im lặng).

## Trách nhiệm trong sequence

1. UI gọi score; Guard xác thực và đặt `TenantContext`.
2. `InterviewService` tải phiên, kiểm tra sẵn sàng; nhánh thiếu/chưa sẵn sàng trả `404`/`409`.
3. Đặt `SCORING`, publish `InterviewScoreJob` kèm `X-Tenant-ID`, trả `202`.
4. Consumer restore tenant, gọi `InterviewScoringService`.
5. Vòng `loop`: `ScoringRubricPolicy.evaluate` → upsert `interview_answer_analyses`.
6. `aggregate` → upsert `interview_scores` → `SCORED` hoặc `FAILED`.
7. Consumer và HTTP interceptor luôn `clear()` `TenantContext` trong `finally`.

## Trách nhiệm và quan hệ trong class diagram

- Không vẽ package *Routing & Boundary* / pseudo-class REST; HTTP route nằm ở sequence diagram.
- Controller **association** `delegates >` `InterviewService`; **dependency** `returns >` `ScoreAcceptedResponse`.
- `InterviewService` **realization** bởi `InterviewServiceImpl`; **dependency** `emits >` `InterviewScoreJob`; **association** publish qua `InterviewScorePublisher` và cập nhật `Interview` qua repository.
- `InterviewScoreConsumer` nhận message từ RabbitMQ, restore `TenantContext`, **association** tới `InterviewScoringService`.
- `InterviewScoringService` **realization** bởi `InterviewScoringServiceImpl`; **association** tới rubric + repositories analysis/score; tạo `QuestionEvaluation` / `OverallScoreResult`.
- `ScoringRubricPolicy` là policy domain (không phải entity DB): rubric cố định relevance / depth / soft-skills.
- `Interview` **composition** câu hỏi; câu hỏi **composition** tối đa một answer; answer **composition** tối đa một analysis; interview **composition** tối đa một score (khớp UNIQUE trong schema).
- Điểm từng câu nằm trong `analysis_json`; tổng hợp trong `breakdown_json` + `overall_score` — không invent bảng điểm riêng.

## Multi-tenant, bảo mật và vận hành

- Separate DB per tenant; worker bắt buộc header tenant + clear context.
- Không trả raw prompt/model error chi tiết cho client (INT-03).
- Kết quả AI mang tính tư vấn; quyết định tuyển dụng cuối thuộc recruiter.
- Re-score idempotent; INT-04 có thể phát sự kiện cập nhật ranking — diagram ghi chú, không mô hình hóa RANK module.

## Giả định và quyết định đã chốt

| Hạng mục | Quyết định |
|---|---|
| Phạm vi | A — evaluate từng câu + overall trong một function |
| Tiêu chí | 1 — rubric hệ thống cố định + `competency` câu hỏi |
| API đồng bộ | `202 Accepted` khi đã enqueue (thiết kế đích) |
| Lưu điểm/câu | `interview_answer_analyses.analysis_json` |
| Lưu điểm phiên | `interview_scores.overall_score` + `breakdown_json` |
| Feedback share | Ngoài phạm vi (INT-05) |
| Code hiện tại | Scaffold; UML là thiết kế đích |

## Kiểm tra và render

Đã validate + render bằng PlantUML 1.2026.8 (`-Format Png -PngDpi 300`). Cả hai PNG đã kiểm tra metadata 300 DPI và kiểm tra trực quan. Bản sao: `D:\HocKy9\Đồ án\tài liệu\report 4\FE07-F02-*.png`.

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/07-ai-interview-configuration-evaluation/interview-evaluation-scoring `
  -Format Png -PngDpi 300 `
  -PlantUmlJar .agents/skills/enterprise-uml-diagram/tools/plantuml.jar
```

## Artifact

| File | Vai trò |
|---|---|
| `class-diagram.puml` | Cấu trúc tĩnh evaluation + scoring |
| `sequence-diagram.puml` | HTTP enqueue + worker chấm điểm |
| `class-diagram.png` / `sequence-diagram.png` | PNG 300 DPI |
| `README.md` | Giải thích và giả định |
