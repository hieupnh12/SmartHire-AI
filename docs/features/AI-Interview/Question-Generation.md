# AI Question Generation

**Epic:** AI Interview System  
**Trạng thái:** `Doing`  
**Code ID:** `INT-01`

## Mục đích chức năng

Sinh câu hỏi phỏng vấn theo JD + CV + level (RabbitMQ).

## Actor

- Recruiter, System

## Luồng hoạt động

1. `POST .../questions/generate` → queue `interview.questions`.
2. Lưu `interview_questions`.

## Business Rules

- Số câu giới hạn.
- Có thể edit trước khi start.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/ai-interviews` |
| GET | `/api/v1/ai-interviews` |
| GET | `/api/v1/ai-interviews/{id}` |
| PUT | `/api/v1/ai-interviews/{id}` |
| DELETE | `/api/v1/ai-interviews/{id}` |
| POST | `/api/v1/ai-interviews/{id}/questions` |
| PUT | `/api/v1/ai-interviews/{id}/questions/{questionId}` |
| DELETE | `/api/v1/ai-interviews/{id}/questions/{questionId}` |
| POST | `/api/v1/interviews/{id}/questions/generate` |

## Database liên quan

- Model hiện hành: `ai_interviews`, `ai_questions` (FK `ai_interview_id`). Các bảng `legacy_v12_*` của model cũ đã bị V21 xóa cùng dữ liệu; không chuyển câu hỏi cũ sang model mới.

## UI mockup

- Google Stitch: **AI Interview System / AI Question Generation** — _[dán link]_
- Icons: xem `DESIGN.md`
- Recruiter: `/recruiter/jobs/:id/ai-interviews` đã nối `/api/v1/ai-interviews` (danh sách theo job, tạo phiên cho đơn, xoá, drawer chi tiết thêm/sửa/xoá câu hỏi, đổi trạng thái/điểm tổng). Danh sách lọc theo job ở client vì API chưa có tham số `jobId`. Nút "Sinh câu hỏi bằng AI" còn mock do chưa có endpoint generate.

## Phụ thuộc

JOB-05, CV-04

## Luồng lời mời thật sau CV screening (2026-09-27)

- Khi screening đạt, hoặc recruiter chuyển hồ sơ sang `INTERVIEW`, hệ thống tạo phiên `CREATED` và thông báo `AI_INTERVIEW_INVITATION` trong cùng transaction của tenant.
- Khóa hàng application trước khi kiểm tra phiên đã có; chạy lại hoặc recruiter bấm tạo lại trả về phiên hiện có, không tạo lời mời trùng. Hồ sơ chưa ở vòng interview, đã lưu trữ hoặc đã rút không được mời.
- Candidate đọc `GET /api/v1/ai-interviews/me` và chi tiết phiên của chính mình; tên job lấy từ application thật.
- Recruiter thêm câu hỏi thật và chuyển trạng thái `QUESTIONS_READY`. Candidate gọi `POST /api/v1/ai-interviews/{id}/start`, lưu từng câu qua `PUT /api/v1/ai-interviews/{id}/questions/{questionId}/answer`, rồi `POST /api/v1/ai-interviews/{id}/complete`.
- Chỉ nộp khi mọi câu hỏi đã có câu trả lời; sau khi nộp chuyển `SCORING` và khóa chỉnh sửa phía candidate. Chưa có worker chấm điểm tự động trong luồng này.
- UI candidate dùng route `/candidate/interviews/:id`, đã xóa phiên demo, câu hỏi/câu trả lời mẫu và micro/transcript mô phỏng. Phiên `CREATED` hiển thị chờ recruiter chuẩn bị câu hỏi; chưa tự đặt ngày giờ phỏng vấn.
- Lời mời là thông báo trong ứng dụng; trang và chuông thông báo polling 15 giây. Email, WebSocket push và lịch hẹn có giờ cụ thể chưa thuộc phần triển khai này.
