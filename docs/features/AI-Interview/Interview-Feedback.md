# Interview Feedback

**Epic:** AI Interview System  
**Trạng thái:** `Done`  
**Code ID:** `INT-05`

## Mục đích chức năng

Tạo feedback readable cho recruiter/candidate (policy hiển thị).

## Actor

- System (AI sinh feedback), Recruiter (xem), Candidate (xem sau khi hoàn tất)

## Luồng hoạt động

1. Sau scoring, AI sinh feedback từng câu trả lời (`ai_feedbacks`) và báo cáo tổng (`summary`, điểm mạnh/yếu, tiêu chí trong `report_json`).
2. Recruiter xem toàn bộ feedback trong drawer chi tiết phiên ở `/recruiter/jobs/:id/ai-interviews`.
3. Candidate tự động xem được feedback khi phiên đã kết thúc (`SCORED` / `PASSED` / `FAILED`), không cần recruiter share.

## Business Rules

- Feedback do AI quản lý; không có chỉnh tay (quyết định 2026-11-04 — bỏ route `PUT .../answers/{answerId}/feedback` vốn luôn trả 409 `AI_FEEDBACK_SYSTEM_MANAGED`).
- Candidate không thấy feedback khi phiên V2 còn đang làm; sau khi hoàn tất, đáp án đúng/giải thích hiển thị theo `policy.review` (`showCorrectAnswer`, `showExplanationAfterInterview`) và cấu hình từng process.
- Không có bước approve/share: kết quả hiển thị cho candidate ngay khi hoàn tất.

## API liên quan

| Method | Path | Ghi chú |
|---|---|---|
| GET | `/api/v1/ai-interviews/{id}` | Câu hỏi + câu trả lời + feedback (lọc theo quyền như trên) |
| GET | `/api/v1/applications/{id}/evaluation` | Candidate xem summary, điểm mạnh/yếu, điểm tiêu chí từng vòng |

## Database liên quan

- Model hiện hành: `ai_feedbacks` (FK UNIQUE `ai_answer_id` → `ai_answers`), chứa score/feedback/strengths/weaknesses theo câu trả lời; báo cáo tổng trong `ai_interviews.report_json`. Bảng feedback legacy đã bị V21 xóa cùng dữ liệu.

## UI mockup

- Google Stitch: **AI Interview System / Interview Feedback** — _[dán link]_
- Icons: xem `DESIGN.md`
- Recruiter: drawer chi tiết phiên ở `/recruiter/jobs/:id/ai-interviews` (chỉ đọc).
- Candidate: phần đánh giá các vòng trong chi tiết đơn ứng tuyển.

## Phụ thuộc

INT-04
