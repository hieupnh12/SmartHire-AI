# FE18-F03 — Interview Evaluation & Result Handling

- **Feature:** `18 / direct-interview-management`
- **Function:** `interview-evaluation-result-handling`
- **Góc nhìn:** Application design (thiết kế đích)
- **Trạng thái:** `Complete`

## Mục đích và phạm vi

Interviewer/HR chấm điểm Candidate theo tiêu chí đã cấu hình, nhập nhận xét và recommendation. Hệ thống tổng hợp điểm tổng, lưu kết quả human evaluation để phục vụ quyết định tuyển dụng (WF-03).

**Trong phạm vi:**
- `POST /api/v1/direct-interviews/{id}/evaluations`
- `GET /api/v1/direct-interviews/{id}/evaluations` (đọc kết quả)

**Ngoài phạm vi:** AI scoring (`interview_scores`), setup (F01), scheduling (F02), submit hiring decision (WF-03).

## Nguồn đã đối chiếu

- Quyết định **A + 1 + I** (bảng evaluation riêng).
- AI `interview_scores` / FE-07 scoring — **không** tái sử dụng cho human path.
- `interview_participants` (F02) để kiểm tra quyền evaluator.
- Chưa có Flyway `evaluation_criteria` / `interview_evaluations` — thiết kế đích.

## Actor, điều kiện và kết quả

- **Actor submit:** Interviewer được gán (PRIMARY/SECONDARY) hoặc `TENANT_ADMIN`.
- **Actor đọc:** Recruiter/HR/Interviewer trong phạm vi quyền.
- **Tiền điều kiện:** Interview `DIRECT`; status `SCHEDULED` hoặc `IN_PROGRESS`; đủ criterion scores.
- **Hậu điều kiện:** `interview_evaluations` + criterion scores; interview `EVALUATED`; overall score + recommendation.
- **Lỗi:** `401`/`403` (kể cả not assigned); `404`/`409`; `400` criteria invalid.

## Trách nhiệm trong sequence

1. Evaluator gửi điểm theo tiêu chí + comment + recommendation.
2. Service kiểm tra interview DIRECT và trạng thái cho phép.
3. Xác minh principal là participant (hoặc admin override).
4. Load criteria active theo `interviewType`; validate đủ và trong range.
5. `EvaluationAggregationPolicy` tính overall có trọng số.
6. Persist evaluation + scores; cập nhật `EVALUATED`; trả response.
7. Clear `TenantContext`.

## Trách nhiệm và quan hệ trong class diagram

- Controller **delegates** evaluation service; consumes/returns DTO.
- Impl **uses** `EvaluationAggregationPolicy`; **persists through** evaluation repos.
- `InterviewEvaluation` **association** 0..1 → Interview (một kết quả chính sau submit; re-score có thể upsert — giả định một bản ghi hiện hành).
- `EvaluationCriterionScore` **association** tới evaluation và criterion.
- **Không** association tới AI `InterviewScore`.

## Multi-tenant, bảo mật, audit

- Tenant DB only.
- Chỉ participant được gán mới submit (tránh chấm hộ).
- Comment không chứa secret; kết quả phục vụ hiring nhưng không tự hire/reject.

## Giả định

| Hạng mục | Quyết định |
|---|---|
| Storage | `evaluation_criteria`, `interview_evaluations`, `evaluation_criterion_scores` |
| Aggregation | Weighted average theo `weight` |
| Recommendation | STRONG_HIRE / HIRE / HOLD / NO_HIRE |
| Re-submit | Upsert một evaluation hiện hành (không vẽ lịch sử revision) |
| AI table | Không ghi `interview_scores` |

## Kiểm tra và render

Đã validate + render PNG 300 DPI (PlantUML 1.2026.8). Đã kiểm tra metadata DPI và kiểm tra trực quan.

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/18-direct-interview-management/interview-evaluation-result-handling `
  -Format Png -PngDpi 300 `
  -PlantUmlJar .agents/skills/enterprise-uml-diagram/tools/plantuml.jar
```

**Review status:** `Complete`
