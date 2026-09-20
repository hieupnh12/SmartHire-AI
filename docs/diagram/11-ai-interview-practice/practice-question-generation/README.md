# FE11-F02 — Practice Question Generation

- **Feature:** `11 / ai-interview-practice` (hỗ trợ `PRACT-01`, pattern `INT-01`)
- **Function:** `practice-question-generation`
- **Trạng thái:** `Complete`

## Phạm vi

Sinh/lấy câu hỏi luyện tập theo topic/target role: `TECHNICAL`, `BEHAVIORAL`, `JAPANESE` (+ optional `GENERAL`). Async queue đích `practice.questions`. Lưu dưới `practice_answers.question_text` (chưa có bảng questions riêng).

Reuse `AiQuestionPort` / bank port; **không** ghi `interview_questions`.

## API (thiết kế đích)

`POST /api/v1/practice/sessions/{id}/questions/generate` → `202`

## Artifact

`class-diagram.puml`, `sequence-diagram.puml`, `README.md`
