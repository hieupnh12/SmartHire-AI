# Hướng dẫn sử dụng và cấu hình AI Interview

**Epic:** AI Interview System  
**Đối tượng:** Recruiter, Hiring Manager  
**Trạng thái:** `Doing`

## Mục đích chức năng

AI Interview tạo và đánh giá bài phỏng vấn theo từng Job. AI dùng Job Description, Job Skills và bằng chứng từ CV để tạo nội dung phù hợp; recruiter quyết định cách đánh giá, thời lượng và hành vi phỏng vấn của AI.

Mục tiêu là tái sử dụng cùng một bộ cấu hình cho nhiều Job, trong khi câu hỏi thực tế vẫn thay đổi theo ngữ cảnh Job và CV của từng ứng viên.

## Actor

- **Recruiter:** bật AI Interview, cấu hình quy trình, xem preview, lưu cấu hình và theo dõi phiên.
- **Candidate:** thực hiện phiên được mời, trả lời câu hỏi và xem kết quả theo quyền được cấu hình.
- **System / AI:** tạo nội dung, hỏi bồi, chấm điểm và ghi nhận log.

## Luồng sử dụng

1. Recruiter mở Job → **Phỏng vấn AI** → **Cấu hình AI Interview**.
2. Thiết lập **Cấu hình chung**: ngưỡng đạt, thời lượng tổng, số lần làm, trọng số năng lực và Job Skills.
3. Mở **Cấu hình bài tập**, chọn từng quy trình và điều chỉnh tham số.
4. Kiểm tra khối **Mẫu AI giao**. Preview phải đổi theo các lựa chọn recruiter vừa đặt.
5. Lưu cấu hình. Cấu hình được chốt vào snapshot khi hệ thống tạo phiên mới; phiên đã tạo không bị thay đổi.
6. Khi ứng viên đạt CV screening, hệ thống gửi lời mời AI Interview. Candidate thực hiện bài, AI chấm và trả trạng thái đạt/không đạt theo ngưỡng Job.

## Cấu hình chung

| Nhóm | Ý nghĩa |
|---|---|
| Enable AI Interview | Bật/tắt khả năng tạo phiên AI Interview cho Job. |
| Passing Score | Điểm tổng tối thiểu để đạt. |
| Duration / Attempts | Tổng thời lượng và số lần làm cho phép. |
| Competency Weights | Trọng số các nhóm năng lực; tổng phải bằng 100%. |
| Job Skills | Mặc định chọn toàn bộ kỹ năng của Job để AI tạo câu hỏi; recruiter chỉ bỏ chọn khi muốn tập trung vào một hoặc một vài kỹ năng cụ thể. |
| Mini Assessment | Khối trắc nghiệm tùy chọn trong lộ trình. |

## Cấu hình bài tập

### Quy trình 1 — Technical Knowledge

Đánh giá kiến thức kỹ thuật nền tảng và khả năng giải thích lựa chọn.

| Cấu hình | Giá trị mẫu |
|---|---|
| Enable Process | ON |
| Question Count | 10 |
| Question Format | Single / Multiple / Mixed |
| Difficulty | Easy / Medium / Hard / Adaptive to Job Level |
| Answer Options | 4 |
| Randomize Options | ON |
| Allow Multiple Correct Answers | ON |
| Time Limit | 15 phút |
| Explanation Required | ON |
| Show Explanation After Interview | ON |
| Show Correct Answer | ON/OFF |

Khuyến nghị dùng **Adaptive to Job Level**: Job Junior sinh câu Easy → Medium; Job Senior sinh câu Medium → Hard. Preview phản ánh định dạng câu hỏi, đáp án đúng, thời lượng và quyền xem đáp án.

### Quy trình 2 — Problem Solving

Đánh giá khả năng tìm nguyên nhân gốc, đề xuất giải pháp và phân tích đánh đổi.

| Cấu hình | Giá trị mẫu |
|---|---|
| Enable Process | ON |
| Problem Count | 2 |
| Problem Style | Scenario / Coding / Debugging / Mixed |
| Difficulty | Job Adaptive |
| Complexity | Short / Medium / Complex |
| Require Solution / Explanation | ON |
| Allow Hint | OFF |
| Follow-up Enabled / Max Follow-up | ON / 2 |
| Time Limit | 20 phút |

AI đọc Job để tạo domain content. Ví dụ Backend có thể nhận case API response time tăng từ `200ms` lên `4 seconds`; Job Frontend có thể nhận case React re-render quá nhiều. Configuration không thay đổi giữa hai Job.

### Quy trình 3 — Practical Experience

Đối soát kinh nghiệm ứng viên khai trong CV và đánh giá mức độ sở hữu công việc thực tế.

| Cấu hình | Giá trị mẫu |
|---|---|
| Enable Process | ON |
| Main Question Count | 3 |
| Response Mode | Speech / Text |
| Experience Depth | Basic / Standard / Deep |
| Follow-up Enabled / Max Follow-up | ON / 2 |
| Ask Real Example / Candidate Role | ON |
| Ask Challenges / Result | ON |
| Verify Against CV | ON |
| Answer Time | 3 phút |

AI không cần recruiter cấu hình công nghệ như Kafka hay Redis. Job Skills và CV cung cấp domain context; AI có thể hỏi “Bạn đã sử dụng Kafka trong E-commerce project như thế nào?” rồi hỏi bồi về lý do không dùng synchronous processing.

### Quy trình 4 — Technical Reasoning

Đánh giá chất lượng lý giải kỹ thuật qua chuỗi: **Question → Candidate Solution → Why → Alternative → Trade-off**.

| Cấu hình | Giá trị mẫu |
|---|---|
| Enable Process | ON |
| Scenario Count | 3 |
| Scenario Complexity | Medium |
| Response Mode | Speech / Text |
| Require Justification / Alternatives / Trade-offs | ON |
| Challenge Candidate Answer | ON |
| Follow-up Depth | 2 |
| Time per Scenario | 5 phút |

### Quy trình 5 — Behavioral Competency

Đánh giá hành vi theo cấu trúc STAR và trọng tâm của Job.

| Cấu hình | Giá trị mẫu |
|---|---|
| Enable Process | ON |
| Question Count | 4 |
| Question Style | STAR |
| Response Mode | Speech |
| Scenario Source | Job Context |
| Follow-up Enabled / Max Follow-up | ON / 2 |
| Require Real Example / Action / Result / Reflection | ON |
| Answer Time | 3 phút |

AI đọc trách nhiệm Job: Senior có thể nhận tình huống technical decision/mentoring; Junior nhận tình huống teamwork phù hợp hơn.

### Quy trình 6 — Communication

Đánh giá hành vi hội thoại của AI và khả năng ứng viên diễn giải kỹ thuật cho đúng người nghe.

| Cấu hình | Giá trị mẫu |
|---|---|
| Enable Process | ON |
| Conversation Topics | 3 |
| Mode | Speech-to-Speech |
| Language | English |
| Conversation Difficulty | Job Adaptive |
| Follow-up Enabled / Max Follow-up | ON / 3 |
| Real-time Interaction / Record Audio / Generate Transcript | ON |
| Technical / Non-technical Explanation Task | ON |
| Answer Time | 2 phút |

Ví dụ: Backend giải thích REST API cho khách hàng không kỹ thuật; DevOps giải thích việc chậm deploy cho Project Manager; Data Engineer giải thích data-pipeline failure cho stakeholder.

## Business Rules

- Chỉ dùng Job Skills thuộc Job đang cấu hình.
- Tổng trọng số năng lực phải bằng 100%.
- Cấu hình mới chỉ áp dụng khi tạo phiên mới; phiên đã tạo dùng snapshot tại thời điểm sinh câu hỏi.
- Candidate chỉ xem đáp án/giải thích sau bài khi recruiter đã bật quyền tương ứng.
- Nội dung AI tạo từ Job/CV là dữ liệu hỗ trợ đánh giá; recruiter vẫn là người chịu trách nhiệm quyết định tuyển dụng.
- Không đưa API key, dữ liệu nhạy cảm hoặc nội dung câu trả lời đầy đủ vào log.

## API liên quan

| Method | Path | Mục đích |
|---|---|---|
| GET/PUT | `/api/v1/jobs/{jobId}/ai-interview-config` | Đọc/lưu cấu hình Job. |
| POST | `/api/v1/jobs/{jobId}/ai-interview-config/suggest-roadmap` | AI đề xuất lộ trình, không tự lưu. |
| POST | `/api/v1/ai-interviews/applications/{applicationId}/start` | Candidate bắt đầu phiên. |
| POST | `/api/v1/ai-interviews/{id}/complete` | Candidate nộp bài. |
| GET | `/api/v1/ai-interviews/{id}` | Xem chi tiết phiên và kết quả. |

## Database liên quan

- `jobs.ai_interview_*`, `jobs.ai_interview_policy_json`
- `ai_interviews.config_snapshot_json`, `context_snapshot_json`, `report_json`
- `ai_questions`, `ai_answers`, `ai_feedbacks`, `ai_interview_logs`

## UI mockup

- Recruiter: `/recruiter/jobs/:id/ai-interviews` → **Cấu hình AI Interview**.
- Panel gồm hai tab: **Cấu hình chung** và **Cấu hình bài tập**.
- Mỗi quy trình có tab riêng, control cấu hình và khối **Mẫu AI giao** cập nhật theo lựa chọn hiện tại.

## Trạng thái

`Doing` — luồng AI Interview và cấu hình nền tảng đã có. Cấu hình của sáu quy trình được lưu cùng Job theo Process Engine V2; các phiên đã tạo tiếp tục dùng snapshot tại thời điểm tạo phiên.
# Process Engine V2 và Voice Interview

Với `schemaVersion = 2`, hệ thống chỉ sinh câu hỏi chính của process hiện tại. Mỗi câu được lưu cùng `referenceAnswer`
và `keyPoints` trong `rubric_json` trước khi candidate nhìn thấy câu hỏi; process kế tiếp chỉ được sinh sau khi process hiện
tại hoàn tất. Candidate API chỉ trả câu thuộc process đang chạy.

Đáp án mẫu, rubric, `correct_option` và `explanation` là private-by-default. Sau khi interview hoàn tất, backend chỉ trả
đáp án đúng/giải thích khi snapshot review cho phép `showCorrectAnswer` hoặc `showExplanationAfterInterview`.

Voice dùng chung session/process/question/answer với text mode. Candidate consent trước khi bắt đầu; audio chỉ lưu object
key private trong `ai_answer_recordings`, transcript được dùng để chấm. Không trả public URL cho candidate.

