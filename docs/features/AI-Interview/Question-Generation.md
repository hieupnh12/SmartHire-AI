# AI Question Generation

**Epic:** AI Interview System  
**Trạng thái:** `Doing`  
**Code ID:** `INT-01`

## Mục đích chức năng

Vòng 2 của pipeline tuyển dụng: AI tự sinh 30–40 câu hỏi phỏng vấn theo Job Description, Requirements,
Job Skills và bằng chứng CV đã trích xuất (nếu có), sau đó candidate trả lời và hệ thống chấm điểm (INT-04).

## Actor

- Candidate (yêu cầu bắt đầu, trả lời), System (sinh câu hỏi, chấm điểm), Recruiter (cấu hình, xem log, retry)

## Luồng hoạt động

1. Recruiter cấu hình job qua `PUT /api/v1/jobs/{jobId}/ai-interview-config`: bật AI Interview, `passingScore`, `questionCount` (30–40), hạn `availableUntil`.
2. Khi CV screening `PASSED`, application chuyển `INTERVIEW` và hệ thống tạo phiên `GENERATING` + notification mời (nếu job đã bật AI Interview).
3. Candidate gọi `POST /api/v1/ai-interviews/applications/{applicationId}/start`. Backend kiểm tra:
   - application tồn tại và candidate hiện tại là owner (khác owner trả 404);
   - `cv_screening_status = PASSED`;
   - job bật AI Interview, chưa xoá, chưa quá `availableUntil`;
   - application đang ở `INTERVIEW`, chưa lưu trữ/rút;
   - không tạo phiên trùng: đã có phiên thì dùng lại, phiên đã `PASSED`/`FAILED` trả 409 `AI_INTERVIEW_ALREADY_COMPLETED`.
4. Chưa có phiên → tạo phiên `GENERATING`. Dispatcher (15 giây) đẩy id phiên vào RabbitMQ `interview.questions.q` kèm header `X-Tenant-ID`; worker gọi Gemini (key riêng `AI_INTERVIEW_GEMINI_API_KEY`).
5. Worker sinh câu hỏi theo lô 10 câu, gửi kèm danh sách câu đã có để tránh trùng, bỏ câu trùng/rỗng, tối đa `ceil(n/10)+2` lần gọi. Đủ số câu thì lưu toàn bộ `ai_questions`, chuyển `QUESTIONS_READY` và gửi notification `AI_INTERVIEW_READY`; thiếu câu thì chuyển `ERROR`, không lưu câu nào.
6. Candidate gọi lại endpoint ở bước 3 (hoặc `POST /api/v1/ai-interviews/{id}/start`) → `IN_PROGRESS`, chốt `passing_score_snapshot`.
7. Candidate lưu từng câu `PUT .../questions/{questionId}/answer`, rồi nộp `POST .../complete` → `SCORING` (xem INT-04).
8. Mọi bước ghi một dòng vào `ai_interview_logs`; recruiter xem qua `GET /api/v1/ai-interviews/{id}/logs`.

## Business Rules

- Số câu hỏi 30–40 (`jobs.ai_interview_question_count`, mặc định 30).
- Một application chỉ có một phiên AI Interview; retry sinh câu/chấm điểm dùng lại phiên, không tạo attempt mới.
- Phiên `ERROR` chưa có câu hỏi: candidate gọi lại bước 3 hoặc recruiter gọi `POST .../questions/generate` để sinh lại.
- Nội dung job/CV/câu trả lời gửi cho AI được coi là dữ liệu không tin cậy; lỗi provider được làm sạch, không lộ key hay nội dung.
- Log không chứa nội dung câu trả lời hay dữ liệu cá nhân.

## API liên quan

| Method | Path | Actor |
|---|---|---|
| GET/PUT | `/api/v1/jobs/{jobId}/ai-interview-config` | Recruiter |
| POST | `/api/v1/ai-interviews/applications/{applicationId}/start` | Candidate |
| GET | `/api/v1/ai-interviews/me` | Candidate |
| POST | `/api/v1/ai-interviews/{id}/start` | Candidate |
| PUT | `/api/v1/ai-interviews/{id}/questions/{questionId}/answer` | Candidate |
| POST | `/api/v1/ai-interviews/{id}/complete` | Candidate |
| GET | `/api/v1/ai-interviews/{id}` | Candidate (owner) / Recruiter |
| GET | `/api/v1/ai-interviews/{id}/logs` | Recruiter |
| POST | `/api/v1/ai-interviews` | Recruiter |
| GET | `/api/v1/ai-interviews` | Recruiter |
| PUT/DELETE | `/api/v1/ai-interviews/{id}` | Recruiter (chỉ khi chưa bắt đầu) |
| POST | `/api/v1/ai-interviews/{id}/questions/generate` | Recruiter (retry sinh câu) |
| POST/PUT/DELETE | `/api/v1/ai-interviews/{id}/questions[/{questionId}]` | Recruiter (chỉ khi chưa bắt đầu) |

## Database liên quan

- `jobs.ai_interview_*` (V25/V26), `applications.cv_screening_status` (V25).
- `ai_interviews`, `ai_questions` (FK `ai_interview_id`), `ai_interview_logs` (V26, FK DELETE CASCADE).
- Các bảng `legacy_v12_*` của model cũ đã bị V21 xóa cùng dữ liệu; không chuyển câu hỏi cũ sang model mới.

## UI mockup

- Google Stitch: **AI Interview System / AI Question Generation** — _[dán link]_
- Icons: xem `DESIGN.md`
- Recruiter: `/recruiter/jobs/:id/ai-interviews`. Candidate: `/candidate/interviews/:id`.
- Frontend chưa nối endpoint `applications/{applicationId}/start` và `{id}/logs`; type `AiInterviewStatus` ở FE chưa có `GENERATING`, `PASSED`, `ERROR`.

## Phụ thuộc

JOB-05, CV-04
