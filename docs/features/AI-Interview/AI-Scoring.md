# AI Interview Scoring

**Epic:** AI Interview System  
**Trạng thái:** `Doing`  
**Code ID:** `INT-04`

## Mục đích chức năng

Chấm điểm phiên AI Interview sau khi candidate nộp bài và quyết định PASSED/FAILED theo ngưỡng của job.

## Actor

- System (chấm điểm), Recruiter (retry khi lỗi)

## Luồng hoạt động

1. Candidate `POST /api/v1/ai-interviews/{id}/complete` khi mọi câu đã có câu trả lời → phiên `SCORING`.
2. Dispatcher đẩy id phiên vào `interview.score.q` (header `X-Tenant-ID`); worker gửi câu trả lời cho Gemini theo lô 10 câu.
3. Mỗi câu trả lời có điểm 0–100 theo trọng số: đúng (50%), liên quan job (30%), rõ ràng/lập luận (20%), kèm feedback/strengths/weaknesses. Kiểm tra toàn bộ kết quả trước khi lưu `ai_feedbacks`.
4. Điểm phiên = trung bình điểm các câu, lưu `ai_interviews.overall_score`.
5. `overall_score >= passing_score_snapshot` (ngưỡng `aiInterviewPassingScore` chốt lúc bắt đầu):
   - **PASSED:** phiên `PASSED`; application → `ASSESSMENT` (và stage "Assessment" nếu có); Assessment mở cho candidate; notification `AI_INTERVIEW_PASSED` + email kết quả báo Assessment đã sẵn sàng (hoặc đang chuẩn bị đề nếu job chưa có test publish).
   - **FAILED:** phiên `FAILED`; application → `FAILED`; không truy cập Assessment; notification `AI_INTERVIEW_FAILED` + email kết quả.
6. Cả hai nhánh lưu `application_status_history` và ghi `ai_interview_logs` (điểm, đổi trạng thái đơn, mở Assessment, notification, email).
7. Email nằm trong `email_outbox` (`purpose = AI_INTERVIEW_RESULT`) và được worker gửi, tối đa 3 lần.

## Business Rules

- Ví dụ: ngưỡng 70, điểm 78 → PASSED.
- Kết quả AI không hợp lệ (thiếu câu, điểm ngoài 0–100, văn bản rỗng) → phiên `ERROR`, không lưu điểm nào; recruiter retry bằng `POST /api/v1/ai-interviews/{id}/score` trên cùng phiên.
- Assessment chỉ bắt đầu được khi phiên AI Interview `PASSED` và application ở `ASSESSMENT` (`SubmissionService`); không cần tạo assignment riêng.
- Điểm/feedback do hệ thống tính, recruiter không sửa tay (`AI_FEEDBACK_SYSTEM_MANAGED`).

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/ai-interviews/{id}/complete` |
| POST | `/api/v1/ai-interviews/{id}/score` (retry khi `ERROR`) |
| GET | `/api/v1/ai-interviews/{id}` |
| GET | `/api/v1/ai-interviews/{id}/logs` |

## Database liên quan

- `ai_interviews.overall_score`, `passing_score_snapshot`, `status`; `ai_feedbacks.score` (FK qua `ai_answers`).
- `applications.status`, `application_status_history`, `notifications`, `email_outbox`, `ai_interview_logs`.
- Bảng điểm legacy đã bị V21 xóa cùng dữ liệu; chưa có bảng `interview_scores` trong model mới.

## UI mockup

- Google Stitch: **AI Interview System / AI Interview Scoring** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

INT-03
