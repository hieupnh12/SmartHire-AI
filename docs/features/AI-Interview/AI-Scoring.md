# AI Interview Scoring

**Epic:** AI Interview System  
**Trạng thái:** `Doing`  
**Code ID:** `INT-04`

## Mục đích chức năng

Chấm điểm phiên AI Interview sau khi candidate nộp bài và quyết định PASSED/FAILED theo ngưỡng của job.

## Actor

- System (chấm điểm), Recruiter (retry khi lỗi)

## Luồng hoạt động

1. Candidate `POST /api/v1/ai-interviews/{id}/complete` → phiên `SCORING`. Phiên theo lộ trình cho nộp khi còn câu trống; hết giờ/đến hạn backend tự nộp. Phiên cũ (không có snapshot) vẫn yêu cầu trả lời đủ.
2. Dispatcher đẩy id phiên vào `interview.score.q` (header `X-Tenant-ID`); worker xử lý:
   - Câu trắc nghiệm: backend so với `correct_option`, đúng = 100, sai = 0, không gọi AI.
   - Câu bỏ trống: 0 điểm cho mọi nhóm năng lực/kỹ năng gắn với câu đó, không gọi AI.
   - Câu hỏi–đáp chấm theo **đáp án mẫu**: mỗi câu có `referenceAnswer` + 3–6 `keyPoints` trong `ai_questions.rubric_json`, do AI viết lúc sinh câu hỏi (phiên theo lộ trình). Câu chưa có đáp án mẫu (phiên cũ, hoặc recruiter đã sửa câu chữ) thì AI viết đáp án mẫu **trước khi chấm**, request không chứa câu trả lời; đáp án mẫu được lưu và dùng lại khi retry.
   - Gửi Gemini theo lô 10 câu (câu hỏi, câu trả lời, đáp án mẫu). AI chỉ cho điểm 0–100 **từng ý chính** kèm `evidence` trích nguyên văn câu trả lời; backend tự tính điểm (`InterviewRubric.referenceEvaluation`):
     - Ý chính AI bỏ sót, không có `evidence`, hoặc `evidence` không có trong câu trả lời (chuẩn hóa Unicode/khoảng trắng, không phân biệt hoa thường; giữ dấu câu và toán tử như `C++`, `C#`) → **0 điểm**. Prompt yêu cầu câu trả lời lạc đề/vô nghĩa nhận 0 cho mọi ý; AI vẫn chịu trách nhiệm đối chiếu ý nghĩa với đáp án mẫu.
     - Request chấm không gửi bằng chứng từ CV để tránh cộng điểm từ thông tin ứng viên không thực sự trả lời. Thiếu/hỏng đáp án mẫu hoặc lỗi dịch vụ AI (ví dụ HTTP 503) → `ERROR`, không quy thành 0 điểm của ứng viên.
     - Điểm câu = trung bình điểm các ý chính. Điểm từng nhóm năng lực/Job Skill của câu = trung bình các ý chính gắn nhóm/kỹ năng đó; nhóm/kỹ năng không có ý chính nào → 0.
     - Kết quả sai số lượng câu, điểm ý chính ngoài 0–100, feedback rỗng → `ERROR`.
3. Tính điểm (`InterviewRubric.report`, AI không chọn trọng số hay tính kết quả):
   - Điểm nhóm = trung bình điểm nhóm đó trên các câu được gắn.
   - Technical Knowledge = Hỏi–đáp kỹ thuật × (100 − `miniWeight`)% + Mini Assessment × `miniWeight`% (mặc định 70/30). Không bật Mini Assessment → lấy hoàn toàn từ hỏi–đáp.
   - Điểm AI Interview = Σ (Điểm nhóm × Trọng số nhóm) / 100, lưu `ai_interviews.overall_score`.
   - Điểm từng Job Skill = trung bình các câu có kỹ năng đó; **không** cộng vào điểm tổng. Kỹ năng không được kiểm tra có `score = null` (UI hiển thị "Chưa đủ dữ liệu"), không mặc định 0.
   - Báo cáo lưu `ai_interviews.report_json`: `overallScore`, `miniAssessmentScore`, `competencies`, `weights` (trọng số chốt theo phiên), `skills` (score, evidenceCount, miniAssessmentTested, questionIds làm bằng chứng). Điểm từng câu lưu `ai_feedbacks.evaluation_json`.
4. `overall_score >= passing_score_snapshot` (ngưỡng `aiInterviewPassingScore` chốt khi tạo phiên):
   - **PASSED:** phiên `PASSED`; application → `ASSESSMENT` (và stage "Assessment" nếu có); Assessment mở cho candidate; notification `AI_INTERVIEW_PASSED` + email kết quả báo Assessment đã sẵn sàng (hoặc đang chuẩn bị đề nếu job chưa có test publish).
   - **FAILED còn quyền làm lại** (`attempt_number < maxAttempts` và chưa quá `availableUntil`): phiên `FAILED`; application giữ `INTERVIEW`; thông báo còn lượt làm lại. Candidate tạo lần mới qua `POST .../applications/{applicationId}/start`.
   - **FAILED hết quyền:** phiên `FAILED`; application → `FAILED`; không truy cập Assessment; notification `AI_INTERVIEW_FAILED` + email kết quả.
5. Dispatcher (`closeExhaustedRetries`) đóng hồ sơ `INTERVIEW` có lần làm gần nhất `FAILED` khi hạn làm lại đã qua: application → `FAILED` + lịch sử + thông báo.
6. Cả hai nhánh lưu `application_status_history` và ghi `ai_interview_logs` (điểm, đổi trạng thái đơn, mở Assessment, notification, email).
7. Email nằm trong `email_outbox` (`purpose = AI_INTERVIEW_RESULT`) và được worker qua queue durable `tenant.interview.email` gửi, tối đa 3 lần. Queue được `RabbitMqConfig` khai báo tự động khi backend khởi động.

## Business Rules

- Ví dụ: ngưỡng 70, điểm 78 → PASSED.
- Ví dụ Technical Knowledge: hỏi–đáp 80, Mini Assessment 100, tỷ lệ 70/30 → 80 × 0,7 + 100 × 0,3 = 86.
- Ví dụ đáp án mẫu 3 ý: ý 1 được 90 có trích dẫn đúng, ý 2 AI cho 80 nhưng trích dẫn không có trong câu trả lời, ý 3 bị bỏ sót → (90 + 0 + 0) / 3 = 30.
- Đáp án mẫu chỉ nằm ở backend (`rubric_json`), không trả cho candidate.
- Kết quả dùng lần hoàn thành gần nhất; các lần trước vẫn được giữ để xem lịch sử.
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

- `ai_interviews.overall_score`, `passing_score_snapshot`, `status`, `report_json`, `attempt_number` (V35); `ai_feedbacks.score`, `evaluation_json` (V35) (FK qua `ai_answers`); `ai_questions.correct_option` (V35).
- `applications.status`, `application_status_history`, `notifications`, `email_outbox`, `ai_interview_logs`.
- Bảng điểm legacy đã bị V21 xóa cùng dữ liệu; chưa có bảng `interview_scores` trong model mới.

## UI mockup

- Google Stitch: **AI Interview System / AI Interview Scoring** — _[dán link]_
- Icons: xem `DESIGN.md`
- Recruiter: drawer chi tiết phiên hiển thị báo cáo (điểm tổng, Mini Assessment, thanh điểm từng nhóm năng lực, điểm từng Job Skill hoặc "Chưa đủ dữ liệu", câu làm bằng chứng), đáp án đúng và giải thích trắc nghiệm sau khi có kết quả, lần làm và hạn nộp.

## Phụ thuộc

INT-03
