# Hướng dẫn sử dụng và cấu hình AI Interview

## Phiên AI Conversation mới (2026-10-03)

Attempt mới có `conversationVersion=1`: phòng chat lưu InterviewSession/InterviewMessage; không sinh đề/đáp án mẫu hoặc chấm từng câu. Mỗi lượt nhận phản hồi SSE thích ứng; complete/hết giờ → worker chấm toàn transcript. Ngân sách lượt = chủ đề × (1 + hỏi bồi), tối đa 40; thời lượng, consent, ngưỡng đạt, retries vẫn theo snapshot. Attempt cũ giữ engine và dữ liệu cũ.

Voice: MediaRecorder gửi audio chunk qua WebSocket, Gemini STT backend chuyển ngữ sau khi dừng; candidate kiểm tra transcript trước khi gửi. Nghe AI dùng TTS API; audio USER được lưu riêng tư nếu Record Audio bật, lỗi upload có nút thử lại. Streaming là text response, chưa bật Live Audio hai chiều hoặc nhận dạng từng fragment độc lập.

Native config: `AI_INTERVIEW_NATIVE_BASE_URL=https://generativelanguage.googleapis.com/v1beta`; `AI_INTERVIEW_CONVERSATION_MODEL` override model dialogue/STT/evaluation (trống thì dùng model task Master DB/env); `AI_INTERVIEW_TTS_MODEL` riêng cho voice. Key vẫn ưu tiên Master DB rồi env Interview. Kiểm tra Google ngày 2026-10-03: 2.5-flash trả 404 (không còn mở cho người dùng mới), 3.8-flash trả 503 quá tải; 3.7-flash streaming/STT và 3.8-flash-tts trả 200. `.env` local chọn model đã kiểm chứng, không commit key. Có tên trong list models không chứng minh gọi generateContent được.

Native HTTP connect 5s/read 45s; SSE tối đa 90s, không tự retry stream để tránh lặp lượt. Proxy tắt buffering SSE và hỗ trợ WebSocket upgrade. Trạng thái `Doing`: cần migrate V44 và E2E candidate/tenant thật trước Done. Mô tả Process V2/Web Speech API bên dưới chỉ áp dụng legacy.

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
2. Thiết lập ngưỡng đạt, thời lượng, số lần làm và Job Skills. Communication có trọng số 100%; các năng lực khác 0% và không chỉnh được.
3. Mở **Cấu hình bài tập**: chỉ Communication có thể chọn. Năm quy trình còn lại hiển thị **Sẽ mở rộng**, khóa thao tác và không tải control cấu hình.
4. Lưu cấu hình Communication: số chủ đề, ngôn ngữ và hỏi bồi. Mặc định mới có 3 chủ đề, sinh thích ứng từng câu và tối đa 1 hỏi bồi/chủ đề. Recruiter có thể tắt hỏi bồi để giảm số lượt gọi API.
5. Tạo phiên **Communication** cho đơn ứng tuyển hoặc tự tạo lời mời khi CV đạt. Backend tự chuẩn hóa cấu hình Job cũ thành Communication trước khi chốt snapshot phiên mới.
6. Candidate trả lời bằng văn bản hoặc Speech-to-Text của trình duyệt, AI đánh giá Communication và so với ngưỡng đạt của Job.

## Phạm vi hoạt động hiện tại (2026-10-02)

Chỉ **Communication** đang hoạt động. Technical Knowledge, Problem Solving, Practical Experience, Technical Reasoning và Behavioral Competency thuộc phạm vi **phát triển mở rộng trong tương lai**, chưa thể cấu hình hoặc thực hiện. Các bảng mô tả năm quy trình này bên dưới là định hướng tương lai.

API từ chối cấu hình bật quy trình khác hoặc Mini Assessment, và khóa API đề xuất lộ trình nhiều quy trình (`AI_INTERVIEW_PROCESS_UNAVAILABLE`, HTTP 409). Backend chặn bắt đầu, trả lời, sinh câu hỏi và chấm phiên cũ có quy trình chưa khả dụng. Snapshot và kết quả lịch sử vẫn giữ nguyên; phiên cũ chưa hoàn tất cần được thay bằng một phiên Communication mới.

Chi tiết phiên recruiter chỉ hiển thị quy trình còn hoạt động trong cấu hình bài tập: hiện là Communication. Các chặng, câu hỏi và nhóm điểm của quy trình đã khóa không xuất hiện, kể cả trong phiên cũ; số chặng/câu hiển thị tính từ phần được phép xem. Mini Assessment cũng không hiển thị trong báo cáo. Dữ liệu snapshot gốc vẫn được giữ nguyên.

V42 bổ sung `ai_answers.speech_metrics_json`; tiếp tục dùng consent/recording V40 và `ai_feedbacks.evaluation_json`. Ghi âm riêng tư được bật trong Communication khi cấu hình cho phép; streaming giọng nói hai chiều vẫn thuộc phạm vi tương lai.

### Kết nối Spring AI và Gemini

- Backend dùng Spring AI 1.0.3 (module model/client, cấu hình thủ công) trên Spring Boot 3.3.2, gọi Gemini qua endpoint tương thích OpenAI. Không cần OpenAI key hoặc Vertex AI credentials.
- Key Gemini do admin quản lý trong Master DB được ưu tiên; nếu chưa có key DB, hai tác vụ Interview dùng `AI_INTERVIEW_GEMINI_API_KEY`, không mượn key CV. Model lấy theo từng tác vụ `INTERVIEW_GEN` và `INTERVIEW_NLP`; khi chưa có cấu hình DB, dùng `AI_INTERVIEW_GEMINI_MODEL`.
- Endpoint mặc định: `https://generativelanguage.googleapis.com/v1beta/openai`. Biến `AI_INTERVIEW_GEMINI_BASE_URL` cũ kết thúc bằng `/models` được chuyển sang `/openai` khi gọi.
- Timeout HTTP dùng `AI_INTERVIEW_TIMEOUT_SECONDS` (mặc định 60s); temperature/max tokens lấy theo task. Fallback Interview mặc định 8192 token. Model và quota thực tế cần kiểm tra trên AI Studio; không cam kết miễn phí/độ trễ cố định.
- Master migration V24 thay riêng các seed Gemini Interview 1.5/2.0 đã lỗi thời bằng `gemini-2.5-flash`; model admin đã chọn khác được giữ. Tenant migration V42 thêm cột metrics nullable, không backfill dữ liệu giả. Cấu hình Interview dùng namespace cache mới để tránh đọc lại cấu hình transport cũ.
- Gemini trả JSON; backend kiểm tra rubric, evidence, điểm và tự tổng hợp. Không tự chuyển sang provider failover hoặc câu dự phòng chưa có rubric.

## Cấu hình chung

**Triển khai Process V2 (2026-10-02):** số câu chính tự tính từ Communication (1–10). Hỏi bồi cấu hình riêng (0–3/câu chính); mặc định 1 câu/chủ đề. Communication chiếm 100% điểm cuối. Thời lượng chung là timer được thực thi; không có timer riêng cho từng câu.

Speech hiện là Speech-to-Text qua trình duyệt: ứng viên kiểm tra transcript trước khi lưu làm câu trả lời; audio được lưu riêng tư nếu bật Record Audio và ứng viên đồng ý. Record Audio được cấu hình độc lập. Real-time Interaction (streaming hai chiều) vẫn khóa và API từ chối bật. Các bảng dưới mô tả cấu hình bài tập; mốc thời gian mockup chỉ là ví dụ, không phải giới hạn riêng đang được thực thi. Khối preview được ghi rõ là ví dụ minh họa; bài thực tế do backend sinh theo snapshot.

| Nhóm | Ý nghĩa |
|---|---|
| Enable AI Interview | Bật/tắt khả năng tạo phiên AI Interview cho Job. |
| Passing Score | Điểm tổng tối thiểu để đạt. |
| Duration / Attempts | Tổng thời lượng và số lần làm cho phép. |
| Competency Weights | Trọng số các nhóm năng lực; tổng phải bằng 100%. |
| Job Skills | Mặc định chọn toàn bộ kỹ năng của Job để AI tạo câu hỏi; recruiter chỉ bỏ chọn khi muốn tập trung vào một hoặc một vài kỹ năng cụ thể. |
| Mini Assessment | Sẽ phát triển trong tương lai; hiện không thể bật. |

## Cấu hình bài tập

### Quy trình 1 — Technical Knowledge — Sẽ phát triển trong tương lai

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

### Quy trình 2 — Problem Solving — Sẽ phát triển trong tương lai

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

### Quy trình 3 — Practical Experience — Sẽ phát triển trong tương lai

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

### Quy trình 4 — Technical Reasoning — Sẽ phát triển trong tương lai

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

### Quy trình 5 — Behavioral Competency — Sẽ phát triển trong tương lai

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

Communication là phiên phỏng vấn hội thoại theo lượt: STT chuyển lời nói thành văn bản; NLP/LLM phân tích yêu cầu công việc, cấu hình và câu trả lời vừa gửi để đánh giá và điều chỉnh câu tiếp theo. Bốn tiêu chí nội dung nằm trong cùng Communication: kiến thức chuyên môn, giải quyết vấn đề, lập luận, kỹ năng giao tiếp. Điểm câu là trung bình bốn tiêu chí có bằng chứng từ transcript; không mở lại các quy trình đang hoãn.

| Cấu hình | Giá trị mẫu |
|---|---|
| Enable Process | ON |
| Conversation Topics | 3 |
| Mode | Speech-to-Text / Text |
| Language | English |
| Conversation Difficulty | Job Adaptive |
| Follow-up Enabled / Max Follow-up | ON / 1 (có thể tắt hoặc chọn 0–3) |
| Real-time Interaction / Record Audio / Generate Transcript | OFF / ON / ON |
| Technical / Non-technical Explanation Task | ON |
| Adaptive Questions / Speech Signals | ON / ON |

Ví dụ: Backend giải thích REST API cho khách hàng không kỹ thuật; DevOps giải thích việc chậm deploy cho Project Manager; Data Engineer giải thích data-pipeline failure cho stakeholder.

## Business Rules

- Chỉ dùng Job Skills thuộc Job đang cấu hình.
- Tổng trọng số năng lực phải bằng 100%.
- Cấu hình mới chỉ áp dụng khi tạo phiên mới; phiên đã tạo dùng snapshot tại thời điểm sinh câu hỏi.
- Candidate chỉ xem đáp án/giải thích sau bài khi recruiter đã bật quyền tương ứng.
- Technical Knowledge áp dụng Single/Multiple/Mixed, 4 phương án và xáo trộn đáp án thật. Multiple yêu cầu bật Allow Multiple Correct Answers; Explanation Required bắt buộc nhập giải thích khi lưu lựa chọn. Không giải thích thì tự chấm tập đáp án; có giải thích thì 70% lựa chọn + 30% rubric giải thích.
- Backend từ chối kết quả AI sai loại bài, độ khó được cung cấp nhưng không hợp lệ, slot/số lượng hoặc nội dung thiết yếu; không lưu thành tự luận thay cho trắc nghiệm. Từ hotfix 2026-10-03, index thiếu lấy theo vị trí, difficulty thiếu mặc định medium, keyPoints thiếu/rỗng lấy từ referenceAnswer; trường thừa được bỏ qua. Metadata form cũ được loại khỏi cấu hình canonical.
- Các bài có hỏi bồi thực thi giới hạn theo câu chính và trả lời tuần tự. Quyền review của Technical Knowledge áp dụng theo process; các chặng đã hoàn thành được xem lại nhưng câu đã chấm không được sửa.
- Nội dung AI tạo từ Job/CV là dữ liệu hỗ trợ đánh giá; recruiter vẫn là người chịu trách nhiệm quyết định tuyển dụng.
- Không đưa API key, dữ liệu nhạy cảm hoặc nội dung câu trả lời đầy đủ vào log.

## API liên quan

| Method | Path | Mục đích |
|---|---|---|
| GET/PUT | `/api/v1/jobs/{jobId}/ai-interview-config` | Đọc/lưu cấu hình Job. |
| POST | `/api/v1/jobs/{jobId}/ai-interview-config/suggest-roadmap` | Đã khóa; dành cho lộ trình mở rộng tương lai. |
| POST | `/api/v1/ai-interviews` | Recruiter tạo phiên Communication; thay phiên cũ chưa hoàn tất đã khóa bằng phiên mới. |
| POST | `/api/v1/ai-interviews/applications/{applicationId}/start` | Candidate bắt đầu phiên. |
| POST | `/api/v1/ai-interviews/{id}/complete` | Candidate nộp bài. |
| GET | `/api/v1/ai-interviews/{id}` | Xem chi tiết phiên và kết quả. |
| POST | `/api/v1/ai-interviews/{id}/voice/consent` | Consent trước phiên voice. |
| POST multipart | `/api/v1/ai-interviews/{id}/questions/{questionId}/audio-answer` | Gửi audio và transcript, chấm và sinh câu tiếp theo. |
| GET | `/api/v1/ai-interviews/{id}/answers/{answerId}/recording/info` | Metadata transcript/audio sau phiên (Recruiter được phân quyền). |
| GET | `/api/v1/ai-interviews/{id}/answers/{answerId}/recording/audio` | Phát audio riêng tư sau phiên. |

## Database liên quan

- `jobs.ai_interview_*`, `jobs.ai_interview_policy_json`
- `ai_interviews.config_snapshot_json`, `context_snapshot_json`, `report_json`
- `ai_questions`, `ai_answers`, `ai_feedbacks`, `ai_interview_logs`
- `ai_interview_consents`, `ai_answer_recordings` (V40); `ai_feedbacks.evaluation_json` chứa tiêu chí và chỉ số lời nói, không thêm schema mới.

## UI mockup

- Recruiter: `/recruiter/jobs/:id/ai-interviews` → **Cấu hình AI Interview**.
- Candidate: `/interviews` hiển thị lời mời; lời mời gắn nhãn **Bản xem trước** mở `/interviews/demo` để duyệt luồng Voice Interview: AI đọc câu hỏi, ứng viên thu âm câu trả lời, nghe lại và chuyển câu. Âm thanh demo chỉ giữ cục bộ, không gọi API backend.
- Panel gồm hai tab: **Cấu hình chung** và **Cấu hình bài tập**.
- Mỗi quy trình có tab riêng, control cấu hình và khối **Mẫu AI giao** cập nhật theo lựa chọn hiện tại.

## Trạng thái

`Doing` — luồng AI Interview và cấu hình nền tảng đã có. Communication hoạt động theo Process Engine V2. Năm quy trình khác được khóa để mở rộng trong tương lai. Phiên mới chỉ chốt Communication; phiên cũ chưa hoàn tất có quy trình khác bị khóa.
# Process Engine V2 và Voice Interview

Với `schemaVersion = 2`, hệ thống chỉ sinh câu hỏi chính của process hiện tại. Mỗi câu được lưu cùng `referenceAnswer`
và `keyPoints` trong `rubric_json` trước khi candidate nhìn thấy câu hỏi; process kế tiếp chỉ được sinh sau khi process hiện
tại hoàn tất. Candidate API chỉ trả câu thuộc process đang chạy.

Đáp án mẫu, rubric, `correct_option` và `explanation` là private-by-default. Sau khi interview hoàn tất, backend chỉ trả
đáp án đúng/giải thích khi snapshot review cho phép `showCorrectAnswer` hoặc `showExplanationAfterInterview`.

Communication dùng text hoặc STT trình duyệt. Phiên voice yêu cầu consent trước khi bắt đầu. Candidate ghi âm, dừng và kiểm tra transcript trước khi gửi; bản ghi và câu trả lời được xử lý cùng thao tác. Recruiter được phân quyền Job xem transcript, audio và phản hồi sau khi phiên kết thúc.

Speech Signals đo năng lượng micro: thời lượng, thời gian có tiếng nói, khoảng dừng từ 600 ms và thời gian từ lúc câu xuất hiện tới tín hiệu lời nói đầu tiên; tốc độ từ/phút tính từ transcript và thời gian nói. Đây là chỉ số hỗ trợ, có thể bị ảnh hưởng bởi tiếng ồn và micro; không dùng để suy ra tính cách hay tự cộng vào điểm nội dung. Người trả lời văn bản không có chỉ số audio.

Audio tối đa 9 MB/câu, định dạng WebM/Ogg/MP4, tải lên kho Cloudinary authenticated; backend kiểm tra tenant, ownership, consent và chữ ký container. Recruiter nghe qua API có xác thực; không trả object key hay URL công khai. Hội thoại vận hành theo lượt, không hứa SLA độ trễ hoặc streaming hai chiều với API miễn phí.
