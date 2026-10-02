# AI Question Generation

**Epic:** AI Interview System  
**Trạng thái:** `Doing`  
**Code ID:** `INT-01`

## Mục đích chức năng

Vòng 2 của pipeline tuyển dụng: AI sinh bộ câu hỏi theo **lộ trình phỏng vấn** cấu hình riêng cho từng Job
(chặng, nhóm năng lực, Job Skills) và **Mini Assessment** trắc nghiệm, dựa trên Job Description, Requirements,
Job Skills và bằng chứng CV đã trích xuất (nếu có); sau đó candidate trả lời và hệ thống chấm điểm (INT-04).

## Actor

- Candidate (yêu cầu bắt đầu, trả lời), System (sinh câu hỏi, chấm điểm), Recruiter (cấu hình, xem log, retry)

## Luồng hoạt động

1. Recruiter cấu hình job qua `PUT /api/v1/jobs/{jobId}/ai-interview-config`: bật AI Interview, `passingScore`, `questionCount` (1–30 câu hỏi–đáp), cửa sổ `availableFrom`–`availableUntil` và `policy`:
   - `durationMinutes` (1–180, tổng thời gian, gồm cả trắc nghiệm), `maxAttempts` (1–5, mặc định 1);
   - `weights` 5 nhóm năng lực, tổng = 100%. Mặc định: Technical Knowledge 35, Problem Solving 25, Practical Experience 20, Communication 10, Behavioral / Situational 10. UI có mẫu Junior/Senior để điền nhanh;
   - `selectedSkills` (chỉ Job Skills của Job), `stages` (chủ đề, số câu, nhóm năng lực, Job Skills);
   - `miniAssessmentEnabled`, `miniQuestionCount` (3–10, mặc định 3), `miniWeight` (tỷ trọng trắc nghiệm trong Technical Knowledge, mặc định 30), `miniAfterStage` (vị trí trong lộ trình, 0 = trước chặng 1).
   `POST .../ai-interview-config/suggest-roadmap` để AI đề xuất `stages` từ JD và kỹ năng (không lưu); recruiter chỉnh rồi mới lưu.
2. Khi CV screening `PASSED`, application chuyển `INTERVIEW` và hệ thống tạo phiên `GENERATING` + notification mời (nếu job đã bật AI Interview).
3. Candidate gọi `POST /api/v1/ai-interviews/applications/{applicationId}/start`. Backend kiểm tra:
   - application tồn tại và candidate hiện tại là owner (khác owner trả 404);
   - `cv_screening_status = PASSED`;
   - job bật AI Interview, chưa xoá và thời điểm hiện tại nằm trong cửa sổ `availableFrom`–`availableUntil`;
   - application đang ở `INTERVIEW`, chưa lưu trữ/rút;
   - không tạo phiên trùng: đã có phiên thì dùng lại; phiên `FAILED` còn lượt và còn hạn thì tạo lần làm mới (`attempt_number + 1`), ngược lại trả 409 `AI_INTERVIEW_ALREADY_COMPLETED`.
4. Tạo phiên `GENERATING` và chốt toàn bộ cấu hình vào `ai_interviews.config_snapshot_json`. Dispatcher (15 giây) đẩy id phiên vào RabbitMQ `interview.questions.q` kèm header `X-Tenant-ID`; worker gọi Gemini. Key và model được quản trị tập trung tại `/admin/system/ai-config` cho task `INTERVIEW_GEN`; biến môi trường `AI_INTERVIEW_GEMINI_API_KEY` chỉ là phương án dự phòng khi Master DB chưa có key hoạt động.
5. Worker dựng kế hoạch câu hỏi (`InterviewRubric.plan`): mỗi câu có chặng, nhóm năng lực, Job Skills; Communication được gắn vào mọi câu hỏi–đáp. Câu hỏi–đáp sinh theo lô 10 câu, mỗi câu kèm đáp án mẫu (`referenceAnswer` + 3–6 `keyPoints`, mỗi ý gắn một nhóm năng lực hoặc Job Skill của slot; gắn ngoài rubric → `ERROR`) để chấm ở INT-04; toàn bộ câu trắc nghiệm sinh trong **một lần gọi** (câu hỏi, 4 lựa chọn, 1 đáp án đúng, giải thích). Kết quả sai số lượng/slot, trùng câu hoặc đáp án không hợp lệ → `ERROR`, không lưu câu nào. Đủ câu thì lưu `ai_questions` (kèm `rubric_json`, `options_json`, `correct_option`, `explanation`), chụp ngữ cảnh Job/CV vào `context_snapshot_json`, chuyển `QUESTIONS_READY` và gửi notification `AI_INTERVIEW_READY`.
6. Candidate gọi lại endpoint ở bước 3 (hoặc `POST /api/v1/ai-interviews/{id}/start`). Trước `availableFrom` trả `409 AI_INTERVIEW_NOT_STARTED`; từ `availableUntil` trở đi trả `409 AI_INTERVIEW_UNAVAILABLE`. Trong cửa sổ hợp lệ, phiên chuyển `IN_PROGRESS`, dùng `passing_score_snapshot` đã chốt khi tạo phiên và đặt `expires_at = min(bắt đầu + durationMinutes, availableUntil)`.
7. Candidate lưu từng câu `PUT .../questions/{questionId}/answer` (trắc nghiệm lưu chỉ số lựa chọn `0`–`3`), rồi nộp `POST .../complete` → `SCORING` (xem INT-04). Hết giờ hoặc đến hạn, backend tự nộp các câu đã lưu (dispatcher và mọi lần đọc/ghi phiên đều kiểm tra `expires_at`); câu bỏ trống lưu rỗng và tính 0 điểm.
8. Mọi bước ghi một dòng vào `ai_interview_logs`; recruiter xem qua `GET /api/v1/ai-interviews/{id}/logs`.

- API chi tiết phiên trả `roadmap` cho cả cấu hình lộ trình cũ (`policy.stages`) và Process Engine V2 (`policy.processes`). Với V2, từng câu hỏi dùng `processKey` trong rubric để ánh xạ về đúng lộ trình, nên recruiter vẫn xem đủ các chặng khi câu hỏi chưa được sinh hoặc phiên đang lỗi.

## Business Rules

- Ngay khi CV Screening `PASSED`, hệ thống chuyển Application sang `INTERVIEW`, tự tạo phiên và sinh câu hỏi theo snapshot cấu hình Job. Notification và Email phải nêu thời gian có thể bắt đầu, hạn hoàn thành, thời lượng và số lần thực hiện.

- Cấu hình hợp lệ khi: tổng trọng số = 100%; kỹ năng chọn thuộc Job; tổng số câu các chặng = `questionCount`; mỗi chặng chỉ dùng nhóm năng lực có trọng số > 0 và kỹ năng đã chọn; lộ trình bao phủ mọi nhóm năng lực có trọng số và mọi kỹ năng đã chọn (Communication luôn được coi là bao phủ). Mini Assessment cần Technical Knowledge > 0% và ít nhất một Job Skill. Một kỹ năng có thể nằm ở nhiều chặng.
- Số câu trắc nghiệm cấu hình riêng với số câu hỏi–đáp. Giai đoạn thử nghiệm dùng 3 câu (có thể chọn 4); cấu hình hỗ trợ 3–10.
- Cấu hình và lộ trình chốt theo phiên khi tạo bộ câu hỏi; sửa Job chỉ ảnh hưởng phiên mới. Job cũ chưa có lộ trình dùng một chặng mặc định bao phủ mọi nhóm có trọng số và mọi Job Skill.
- Đáp án trắc nghiệm chỉ nằm ở backend; candidate không nhận `correctOption`/`explanation`, recruiter chỉ thấy sau khi có kết quả.
- Candidate không nhận nội dung câu hỏi trước khi bấm bắt đầu (`questions` rỗng khi `startedAt` null); chỉ nhận `roadmap` (tên chặng, loại `OPEN`/`MCQ`, số câu) và `durationMinutes` từ snapshot để xem trước lộ trình.
- Phiên theo lộ trình không cho thêm/xoá câu thủ công và chỉ cho sửa câu chữ của câu hỏi–đáp (`AI_INTERVIEW_PLANNED`), để không phá rubric. Sửa câu chữ sẽ xoá đáp án mẫu cũ; lúc chấm AI viết lại đáp án mẫu theo câu mới.
- Mỗi application có thể có nhiều lần làm (lịch sử giữ đủ); retry sinh câu/chấm điểm do lỗi hệ thống dùng lại phiên, **không** tiêu hao lượt.
- Phiên `ERROR` chưa có câu hỏi: candidate gọi lại bước 3 hoặc recruiter gọi `POST .../questions/generate` để sinh lại.
- Nội dung job/CV/câu trả lời gửi cho AI được coi là dữ liệu không tin cậy; lỗi provider được làm sạch, không lộ key hay nội dung.
- Log không chứa nội dung câu trả lời hay dữ liệu cá nhân.

## API liên quan

| Method | Path | Actor |
|---|---|---|
| GET/PUT | `/api/v1/jobs/{jobId}/ai-interview-config` | Recruiter |
| POST | `/api/v1/jobs/{jobId}/ai-interview-config/suggest-roadmap` | Recruiter (AI đề xuất lộ trình, không lưu) |
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

- `jobs.ai_interview_*` (V25/V26/V33), `jobs.ai_interview_policy_json` (V35), `applications.cv_screening_status` (V25).
- `ai_interviews.config_snapshot_json`, `context_snapshot_json`, `attempt_number`, `expires_at` (V35); `ai_questions.rubric_json`, `options_json`, `correct_option`, `explanation` (V35).
- `ai_interviews`, `ai_questions` (FK `ai_interview_id`), `ai_interview_logs` (V26, FK DELETE CASCADE).
- Các bảng `legacy_v12_*` của model cũ đã bị V21 xóa cùng dữ liệu; không chuyển câu hỏi cũ sang model mới.

## UI mockup

- Google Stitch: **AI Interview System / AI Question Generation** — _[dán link]_
- Icons: xem `DESIGN.md`
- Recruiter: `/recruiter/jobs/:id/ai-interviews`. Candidate: `/candidate/interviews/:id`.
- Recruiter đã nối API cấu hình, sinh lại câu hỏi, thử chấm lại và lịch sử xử lý; trang chi tiết tự tải lại mỗi 5 giây. Các trạng thái `GENERATING`, `PASSED`, `ERROR` được hiển thị đúng. Điểm và trạng thái chỉ đọc, không có dữ liệu giả.
- Panel "Cấu hình AI Interview": thiết lập phiên, trọng số (mẫu Mặc định/Junior/Senior, hiển thị tổng), Job Skills, Mini Assessment (số câu, tỷ trọng, vị trí) và trình chỉnh lộ trình (thêm/xoá/đổi thứ tự chặng, nút "AI đề xuất lộ trình"). Validation phía FE khớp backend.
- Candidate `/candidate/interviews/:id` (bố cục 2 cột theo mockup phòng phỏng vấn): header có mã phiên, đồng hồ "còn lại / tổng" theo `expiresAt` + `durationMinutes` của backend và nút "Kết thúc" (nộp bài, xác nhận "câu trống tính 0 điểm"); cột trái hiện **từng câu một** (tiến độ "Câu hỏi 03 / 06", chip chặng/kỹ năng, thẻ AI Interviewer, ô trả lời văn bản "Lưu & tiếp tục" hoặc trắc nghiệm lưu ngay, nút câu trước/sau); cột phải là **Lộ trình phỏng vấn** (% hoàn thành; mỗi chặng hiển thị "01. Tên chặng" (gộp các câu trong cùng chặng, kèm số câu đã lưu) với trạng thái Đã nộp + "Thời lượng" (`answerDuration`, frontend gửi số giây cộng dồn mỗi lần lưu) / Hiện tại + "Đang trả lời (mm:ss)" / Chưa làm + "Ước tính ~N phút" (`durationMinutes` chia đều số câu); khối Mini Assessment không đánh số, ghi "N câu hỏi nhanh ngay sau chặng X", đặt đúng vị trí trong lộ trình; bấm để chuyển câu) và quy định phòng thi. Trước khi bắt đầu, trang hiển thị thẻ lời mời (số câu hỏi–đáp, số câu trắc nghiệm, thời gian, ngưỡng đạt) và lộ trình từ `roadmap`. Sau khi nộp: kết quả, nút "Làm lại" khi `canRetry`, danh sách câu trả lời.
- Mockup có ghi âm/nhận diện giọng nói, đọc câu hỏi (TTS), đo micro, xác minh camera/CCCD: **chưa triển khai** vì backend chưa có Speech-to-Text (INT-02); phiên hiện trả lời bằng văn bản.
- Sau mỗi lần thêm/sửa/xóa câu hỏi, backend đếm số câu: đủ số lượng cấu hình thì tự chuyển `QUESTIONS_READY`, chưa đủ thì `CREATED`. API cập nhật phiên từ chối sửa trạng thái/điểm thủ công.
- Lỗi provider được hiển thị bằng thông báo an toàn theo HTTP status (ví dụ 503: tạm thời không khả dụng), không lộ nội dung phản hồi hoặc API key.

## Kiểm chứng triển khai

- Sửa lỗi nút nộp bị khóa sau khi lưu đủ câu: xóa trạng thái chưa lưu của câu ngay trong callback lưu thành công, trước khi tự chuyển sang câu tiếp theo. Lưu thất bại hoặc còn thay đổi chưa lưu vẫn khóa nộp bài.

- 2026-09-29: 48 test liên quan AI Interview/rubric pass, gồm sinh Mini Assessment theo lô, chấm trắc nghiệm/câu trống không gọi AI, snapshot, giới hạn thời gian và đề xuất lại lộ trình.
- Kiểm tra render pass: gộp nhiều câu trong một chặng, giữ riêng chặng trùng tên, vị trí Mini Assessment và tiến độ.
- Mẫu Junior: 45/20/15/10/10; Senior: 20/35/25/10/10 theo thứ tự năm nhóm năng lực ở trên. Recruiter được chỉnh lại.
- Lộ trình hiển thị một mục cho mỗi chặng, kèm số câu đã lưu; Mini Assessment ghi vị trí sau chặng tương ứng.
- Phiên đã có snapshot dùng cấu hình và deadline đã chốt, kể cả khi cấu hình Job thay đổi.
- Chưa xác minh E2E với Gemini/MySQL và trình duyệt. Build TypeScript toàn frontend bị chặn bởi lỗi ngoài module Interview.

## Phụ thuộc

JOB-05, CV-04
