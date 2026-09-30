# FE11-F01 — Practice Interview Session

- **Feature:** `11 / ai-interview-practice` (`PRACT-01`)
- **Function:** `practice-interview-session`
- **Góc nhìn:** Application design (target)
- **Trạng thái:** `Complete`

## Mục đích và phạm vi

Candidate tạo phiên luyện tập sandbox (topic/target role), hệ thống lưu trạng thái session và cho phép nộp câu trả lời dạng text. Không ảnh hưởng ranking/hiring.

**Trong phạm vi:** `POST /practice/sessions`, `POST /practice/sessions/{id}/answers` (text).

**Ngoài phạm vi:** sinh câu hỏi (F02), voice/STT (F03), feedback (F04), xem lịch sử (F05).

## Nguồn đã đối chiếu

- Yêu cầu FE-11; lựa chọn A/1/I/X
- `docs/features/Practice-Interview/Practice-Session.md`
- `practiceApi`, entity `PracticeSession` / `PracticeAnswer`, enum `PracticeStatus`
- Migration `practice_sessions`, `practice_answers`

## Actor & kết quả

- **Actor:** `CANDIDATE`
- **Thành công:** session `CREATED`; text answer lưu; session `IN_PROGRESS`
- **Lỗi:** `401`/`403`/`404`

## Giả định

- `targetRole` / `questionTypes` trên create là thiết kế đích (schema hiện có `topic`)
- Câu hỏi được seed bởi F02 dưới dạng `practice_answers.question_text` (answer chưa có)

## Artifact

`class-diagram.puml`, `sequence-diagram.puml`, `README.md`
