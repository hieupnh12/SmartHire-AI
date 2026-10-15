# AI Interview Scoring

## Quy tắc bỏ trống (2026-10-03)

Phiên Communication theo câu hỏi: thiếu bản ghi `AiAnswer`, nội dung `null`, rỗng hoặc chỉ có khoảng trắng đều nhận 0 điểm, không gọi provider. Tổng điểm tính cả câu bỏ trống; trạng thái PASSED/FAILED theo ngưỡng snapshot. Câu đã trả lời nhưng thiếu kết quả chấm vẫn báo lỗi để retry. Trạng thái `Doing`: 41 kiểm thử cấu hình/rubric, chấm điểm và hội thoại đã qua. Đã xác minh phiên thực tế #3 tại tenant `ttqt`: câu trả lời rỗng được RabbitMQ worker chấm 0/100, phiên FAILED và không còn ERROR sau khi nạp bản sửa vào backend local. Các worker dùng chung database cần chạy cùng phiên bản mã xử lý snapshot.

## Post-Session Evaluation (2026-10-03)

Phiên mới `conversationVersion=1` không chấm từng câu hoặc sinh rubric trước. Khi complete/hết hạn, lifecycle chuyển SCORING; RabbitMQ worker có tenant context gửi toàn bộ history InterviewMessage + snapshot Job/CV cho Gemini native theo INTERVIEW_NLP. Backend kiểm tra đủ bốn tiêu chí TECHNICAL_KNOWLEDGE/PROBLEM_SOLVING/REASONING/COMMUNICATION, điểm 0–100 và trích dẫn đúng USER message; evidence giả, thuộc ASSISTANT hoặc thiếu nhận 0. Điểm tổng là trung bình bốn tiêu chí; AI không tự tính tổng. Không có USER answer → 0 mà không gọi provider.

Report schemaVersion 3/evaluationMode POST_SESSION nằm trong ai_interviews.report_json, gồm communicationCriteria, criteriaEvidence(messageId/quote), summary/strengths/weaknesses. Ngưỡng snapshot và logic PASSED/FAILED → Assessment/notification/email giữ nguyên. Provider/JSON lỗi → ERROR, không coi là candidate 0; recruiter retry cùng phiên qua endpoint score. V44 lưu session/message; không tạo feedback mỗi câu cho phiên mới. Các phần rubric/AiAnswer dưới đây áp dụng legacy. Trạng thái `Doing`: test backend pass, chưa E2E scoring trên tenant thật.

## Communication hiện hành (2026-10-02)

Spring AI `ChatClient` gọi Gemini theo cấu hình riêng `INTERVIEW_NLP`; sinh câu hỏi/đáp án mẫu dùng `INTERVIEW_GEN`. Retry tối đa 3 lượt gọi với backoff 1s/2s khi HTTP 429/502/503/504; không retry lỗi xác thực, JSON hỏng hoặc điểm/rubric sai. Lỗi hệ thống không chuyển thành điểm 0 của ứng viên. Speech Signals được lưu thêm tại `ai_answers.speech_metrics_json` (V42), độc lập với feedback; các phiên cũ có thể chỉ có metrics trong `evaluation_json`.

Communication tích hợp bốn tiêu chí nội dung: kiến thức chuyên môn, giải quyết vấn đề, lập luận và giao tiếp. Các tiêu chí này thuộc cùng một phiên Communication; năm quy trình đã hoãn vẫn không được bật.

Mặc định Adaptive Questions bật: chỉ sinh một câu chính trước; khi câu trả lời được chấm và hết hỏi bồi, sinh câu chính kế tiếp từ Job, snapshot và câu trả lời vừa gửi. Bật hỏi bồi tối đa 1/chủ đề theo mặc định (cho phép 0–3). Nếu tắt thích ứng thì sinh trước bộ câu chính.

Chấm điểm yêu cầu evidence là đoạn có thật trong transcript; evidence không tồn tại nhận 0. Điểm câu trung bình bốn tiêu chí, report tổng hợp `communicationCriteria`. `speechMetrics` và tốc độ từ/phút là chỉ số hỗ trợ Recruiter, không tự cộng vào điểm nội dung. Audio/transcript xem qua API có xác thực sau khi hoàn tất. Chủ đề chưa sinh vì nộp sớm hoặc hết giờ được tính 0 khi tổng hợp, không làm tăng điểm vì giảm số câu.


> **Phạm vi hiện tại (2026-10-02):** Chỉ Communication đang hoạt động. Năm quy trình còn lại và Mini Assessment được khóa để phát triển trong tương lai. Phiên mới chỉ sinh/chấm Communication (100% trọng số); snapshot cũ không được viết lại. Xem [hướng dẫn cấu hình](AI-Interview-Configuration-Guide.md).


**Epic:** AI Interview System  
**Trạng thái:** `Doing`  
**Code ID:** `INT-04`

## Mục đích chức năng

Chấm điểm phiên AI Interview sau khi candidate nộp bài và quyết định PASSED/FAILED theo ngưỡng của job.

## Actor

- System (chấm điểm), Recruiter (retry khi lỗi)

## Luồng hoạt động

### Phiên Process V2 (`schemaVersion = 2`)

- Chấm từng câu khi ứng viên lưu câu trả lời; câu đã chấm bị khóa sửa. Chỉ mở quy trình tiếp theo sau khi hoàn thành câu chính và chuỗi câu hỏi phụ của quy trình hiện tại.
- Trắc nghiệm một/nhiều đáp án: so tập `selectedOptions` với khóa `correctOptions` trong rubric. Không yêu cầu giải thích thì đúng hoàn toàn = 100, còn lại = 0, không gọi AI. Khi `explanationRequired = true`, điểm câu = 70% độ chính xác lựa chọn + 30% điểm giải thích theo đáp án mẫu và các ý chính.
- Tự luận: điểm là trung bình 3–6 ý chính. Ý không có trích dẫn nguyên văn từ câu trả lời nhận 0. Sai cấu trúc/điểm ngoài 0–100 hoặc lỗi provider không được quy thành lỗi năng lực ứng viên.
- `verifyAgainstCV` chỉ bổ sung đối chiếu tính nhất quán cho Practical Experience; không cộng điểm từ nội dung CV mà ứng viên chưa trả lời.
- Điểm cuối dùng trọng số **cấu hình chung đã chốt theo phiên**, chuẩn hóa trên các nhóm năng lực đang bật. Technical Reasoning thuộc nhóm Problem Solving; không dùng trọng số process để thay trọng số chung. Nhóm đang bật nhưng chưa thực hiện khi nộp sớm nhận 0; câu đã sinh nhưng bỏ trống nhận 0.
- Báo cáo lưu điểm nhóm, trọng số thực dùng, điểm kỹ năng, số bằng chứng và ID câu hỏi; kỹ năng chưa được kiểm tra có điểm `null`. Feedback/khóa đáp án không lộ trong lúc làm bài. Sau khi hoàn tất, hiển thị khóa và giải thích theo cờ review của từng process.

### Phiên legacy / lộ trình V1

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

- Đã cập nhật màu nhãn và bộ lọc trạng thái (2026-10-04): chuẩn bị xám, sinh câu hỏi tím, có câu hỏi xanh dương, đang diễn ra xanh trời, đang chấm vàng, chấm xong xanh ngọc, đạt xanh lá, không đạt cam, lỗi xử lý đỏ. Dùng token trong `DESIGN.md`, giữ chữ/biểu tượng và viền cho bộ lọc được chọn.

- Google Stitch: **AI Interview System / AI Interview Scoring** — _[dán link]_
- Icons: xem `DESIGN.md`
- Recruiter: drawer chi tiết phiên hiển thị báo cáo (điểm tổng, Mini Assessment, thanh điểm từng nhóm năng lực, điểm từng Job Skill hoặc "Chưa đủ dữ liệu", câu làm bằng chứng), đáp án đúng và giải thích trắc nghiệm sau khi có kết quả, lần làm và hạn nộp.

## Phụ thuộc

INT-03
