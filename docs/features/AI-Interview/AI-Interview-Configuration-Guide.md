# Hướng dẫn sử dụng và cấu hình AI Interview

## Tổng số câu hỏi và thời lượng (2026-10-15, quy tắc hiện hành)

**Trạng thái: `Done` cho triển khai; cần triển khai backend/frontend để áp dụng cho phiên mới.** Mục này thay thế các mô tả cũ về câu chính, chủ đề và nhân thêm số câu hỏi bồi bên dưới.

- Thay ô **Số câu hỏi** bằng **Chủ đề**: chọn “Yêu cầu công việc” hoặc một kỹ năng thuộc Job. AI hỏi đúng 1 câu mở đầu theo chủ đề; các câu sau dựa vào câu trả lời trước để hỏi thêm trong cùng chủ đề. Chọn chủ đề không nhân số câu.
- **Tổng số câu tối đa = 1 + Max Follow-up** khi bật hỏi thêm; tắt hỏi thêm thì chỉ có 1 câu. Backend tự tính, không dùng số câu tùy ý do client gửi.
- **Follow-up mặc định bật**, kể cả khi cấu hình cũ từng lưu `false` nhưng chưa có xác nhận lựa chọn mới. Khi lưu, `config.followUpSettingVersion=1` ghi nhận lựa chọn rõ ràng: nếu recruiter chủ động tắt và lưu thì giữ tắt ở lần mở sau. Việc chuẩn hóa cấu hình Job không viết lại snapshot lời mời đã tồn tại.
- Tổng thời lượng = **tổng số câu × 5 phút**: 1 câu mở đầu + 2 follow-up = 3 câu, 15 phút; +10 follow-up = 11 câu, 55 phút. Hạn hoàn thành vẫn giới hạn đồng hồ phiên.
- Mọi câu trả lời, kể cả câu tiếp nối, được đưa vào transcript để chấm điểm tổng AI Interview theo trọng số tiêu chí. Chấm toàn hội thoại; không cộng hoặc lấy trung bình các điểm từng câu chưa tồn tại.
- API tiếp tục dùng cấu hình hiện có, bổ sung `policy.processes[COMMUNICATION].config.topic` (`JOB_REQUIREMENTS` hoặc tên kỹ năng Job). `questionCount` được tính từ 1 + số follow-up đang bật. Snapshot mới có `questionBudgetVersion=3`; giới hạn lượt trả lời và `maxQuestionCount` bằng tổng số câu này. Snapshot v2/không có dấu phiên bản giữ điều kiện cũ để không đổi lời mời đã tạo. Không thay đổi schema DB.
- Thẻ lời mời, thời lượng email/thông báo và chi tiết recruiter đọc cùng snapshot. Lượt cuối chỉ kết thúc hội thoại; API chặn gửi thêm câu trả lời sau khi dùng hết ngân sách.

Kiểm chứng: kiểm thử tổng câu bật/tắt follow-up, chặn lượt vượt tổng, thời lượng phiên và transcript chấm điểm chứa cả câu trả lời tiếp nối; kiểm tra tương thích snapshot cũ.

## Ngôn ngữ hội thoại và điều khiển đọc ở candidate (2026-10-15)

- Phòng hội thoại candidate không hiển thị checkbox “Tự đọc lời chào và câu hỏi” hoặc nút “Dừng đọc”. Tự đọc vẫn hoạt động khi bật voice; dừng phát khi candidate bật micro, gửi câu trả lời hoặc rời phòng.
- Lời chào, câu hỏi, hỏi tiếp và lời kết dùng ngôn ngữ trong snapshot `COMMUNICATION.config.language`. Prompt nhấn mạnh tiếng Việt khi cấu hình Vietnamese, tiếng Anh khi cấu hình English và tiếng Nhật khi cấu hình Japanese, độc lập ngôn ngữ JD hoặc câu trả lời. Request đọc thành tiếng nhận cùng ngôn ngữ, yêu cầu đọc nguyên văn, không dịch.
- Không sửa nội dung hội thoại đã lưu hoặc ghi đè snapshot phiên cũ. Thay đổi prompt áp dụng cho lượt sinh tiếp theo sau khi triển khai backend; cần kiểm chứng lại bằng provider thật. Trạng thái: `Doing`.

## Bảo toàn thời gian snapshot (2026-10-15)

Snapshot giữ chính xác phần nano giây của thời gian mở/đóng khi chuyển qua JSON; không làm tròn qua số thực dấu phẩy động. Kiểm thử dùng mốc thời gian cố định để phát hiện sai lệch. Test thời lượng Communication đồng bộ quy tắc 2 câu chính × 5 phút = 10 phút. Trạng thái: `Done`.

## Số câu hiển thị trên lời mời (2026-10-15)

Thẻ AI Interview hiển thị tổng câu hỏi tối đa, gồm câu chính và hỏi bồi: `maxQuestionCount = questionCount × (1 + maxFollowUp)` khi bật hỏi bồi; khi tắt chỉ tính câu chính. Ví dụ 1 câu chính + tối đa 2 hỏi bồi → “Tối đa 3 câu (2 hỏi bồi)”. API bổ sung `maxQuestionCount`, giữ `questionCount` là số câu chính. Tổng thời lượng vẫn tính theo câu chính × 5 phút. Dữ liệu lấy từ snapshot phiên, không lấy giới hạn hỏi bồi đang chọn nhưng đã tắt, hoặc cấu hình Job thay đổi sau đó. Trạng thái: `Done` cho logic và kiểm thử.

## Mở và đóng phiên theo lời mời hoặc ngày giờ (2026-10-15)

Trong **Cấu hình chung**, Recruiter chọn **Cách đặt thời gian**:

- **Theo số giờ từ lời mời**: mở sau X giờ tính từ thời điểm hệ thống tạo lời mời; X = 0 cho phép bắt đầu ngay. Hạn hoàn thành là N giờ tính từ lúc mở, N ≥ 1. Ví dụ X = 6, N = 48 → mở ở mốc +6 giờ và đóng ở mốc +54 giờ. Mặc định mới X = 0, N = 24; mỗi giá trị tối đa 8760 giờ.
- **Theo ngày giờ cụ thể**: chọn cả giờ mở và hạn hoàn thành, hạn phải sau giờ mở. Cấu hình cũ có ngày giờ được giữ ở chế độ này; snapshot phiên cũ không bị viết lại.

API cấu hình hiện có bổ sung `policy.availability = {mode: "RELATIVE"|"ABSOLUTE", startDelayHours, completionWindowHours}`. Với RELATIVE, `availableFrom`/`availableUntil` trong cấu hình Job là null, thời gian tuyệt đối được chốt vào snapshot ngay khi tạo lời mời. Thời điểm nhận lời mời ở đây là lúc tạo lời mời trong hệ thống, không phải lúc ứng viên mở email. Thẻ ứng viên, thông báo và email dùng cùng mốc snapshot; trước giờ mở thẻ hiển thị “Chưa đến giờ bắt đầu”, tự đổi khi đến giờ; backend tiếp tục chặn bắt đầu sớm hoặc quá hạn. Lượt làm lại giữ nguyên cửa sổ lời mời ban đầu, không gia hạn theo thời điểm retry.

FE dùng Zod, BE kiểm tra mode/offset và thứ tự ngày giờ trước khi lưu. Dữ liệu dùng JSON policy/snapshot và các cột ngày giờ hiện có, không thêm bảng/cột/enum JPA hoặc migration. Lịch mở/đóng độc lập với thời lượng làm bài = số câu chính × 5 phút; đồng hồ phiên được giới hạn bởi hạn hoàn thành. Trạng thái: `Done` cho code và kiểm thử; cần triển khai để áp dụng cho lời mời mới.

## Giao diện cấu hình chung (2026-10-15)

Không hiển thị ô tổng thời gian và số câu hỏi Communication. Số câu lấy từ Cấu hình bài tập; hệ thống vẫn tự tính thời lượng. Trạng thái: `Done`.

## Tự tính thời lượng và giới hạn hỏi bồi (2026-10-15)

- Tổng thời gian = số câu hỏi chính Communication trong **Cấu hình bài tập × 5 phút**. Ví dụ 3 câu → 15 phút, 10 câu → 50 phút. **Cấu hình chung** không hiển thị ô tổng thời gian hoặc dòng giải thích thời lượng. Backend vẫn tính lại khi đọc/lưu cấu hình Job và tạo snapshot phiên mới, không tin thời lượng tùy ý do client gửi.
- Khi bật hỏi bồi, **Max Follow-up** chọn 2–10 câu tối đa cho mỗi câu chính, mặc định 2; có thể tắt hỏi bồi. FE dùng Zod và BE kiểm tra giới hạn. Cấu hình Job cũ 0/1 được đưa về 2 khi chuẩn hóa; snapshot phiên đã tạo giữ nguyên.
- Câu chính và toàn bộ câu hỏi bồi của nó dùng chung ngân sách **5 phút trả lời ước tính**, không phải mỗi câu bồi được thêm 5 phút. AI nhận chỉ dẫn chọn nhiệm vụ hẹp, tránh bài code dài/thiết kế hệ thống rộng/nhiều đầu việc; càng nhiều hỏi bồi thì câu trả lời kỳ vọng phải càng ngắn.
- Mỗi lượt sinh nhận vị trí câu chính hoặc hỏi bồi tương ứng, số câu chính, trần hỏi bồi và thời lượng snapshot. Hết nhóm hỏi bồi chuyển sang câu chính/chủ đề kế tiếp. Trần lượt = số câu chính × (1 + max follow-up khi bật), tối đa 110 với 10 câu chính × 10 câu bồi. Giới hạn cũ 40 lượt/3 câu bồi được thay thế cho phiên mới.
- Đồng hồ hết hạn toàn phiên vẫn do backend kiểm tra và bị giới hạn bởi hạn hoàn thành. 5 phút/câu là ngân sách thiết kế nội dung trong prompt, không khóa trả lời từng câu tại phút thứ 5; model không thể bảo đảm tốc độ trả lời thực tế của mọi ứng viên.

API không thêm endpoint/cột/bảng: tiếp tục dùng `policy.durationMinutes`, `policy.processes[COMMUNICATION].config.questionCount`, `followUpEnabled`, `maxFollowUp` và snapshot hiện có. Trạng thái: `Done` cho logic và kiểm thử; cần triển khai để áp dụng, kiểm chứng nội dung sinh với provider thật.

## Cấu hình tiêu chí và trọng tâm theo Job (2026-10-15)

Recruiter mở **AI Interview → Cấu hình chung → Tiêu chí hỏi và đánh giá hội thoại** để thiết lập:

- Kiến thức chuyên môn, Giải quyết vấn đề, Lập luận, Giao tiếp: trọng số nguyên 0–100%, tổng bắt buộc 100%. Mặc định mỗi tiêu chí 25%; 0% không đóng góp điểm tổng.
- Trọng tâm phỏng vấn theo job: tối đa 2.000 ký tự, ví dụ “REST API, xử lý lỗi và lựa chọn database”. AI dùng cùng JD, trách nhiệm và Job Skills đã chọn; nội dung này là dữ liệu chủ đề, không được thay thế chỉ dẫn hệ thống.

Thiết lập dùng chung cho sinh câu hỏi và đánh giá toàn phiên. Mỗi câu hỏi cần gắn yêu cầu công việc, có mục tiêu bằng chứng theo tiêu chí; mục tiêu luân phiên các tiêu chí chuyên môn/giải quyết vấn đề/lập luận có trọng số dương. Giao tiếp được quan sát xuyên suốt; khi chỉ Giao tiếp có trọng số thì mục tiêu là Giao tiếp. AI được chỉ dẫn ưu tiên bằng chứng còn thiếu và tiêu chí trọng số cao trong ngân sách lượt, giữ câu hỏi ngắn và độ khó tăng dần. Đây là định hướng cho model, không bảo đảm model luôn tuân thủ hoàn toàn.

API cấu hình hiện có giữ nguyên endpoint; `policy.processes[key=COMMUNICATION].config` bổ sung `technicalKnowledgeWeight`, `problemSolvingWeight`, `reasoningWeight`, `communicationWeight` (integer), `assessmentFocus` (string). Frontend dùng Zod; backend kiểm tra trước khi lưu. Không thêm bảng/cột: dùng JSON cấu hình hiện có và snapshot phiên. Cấu hình chỉ áp dụng cho phiên mới; snapshot cũ thiếu trường dùng mặc định 25%/tiêu chí và trọng tâm rỗng. Báo cáo bổ sung `criterionWeights` và hiển thị trọng số cạnh điểm từng tiêu chí.

Trạng thái: `Done` — đã kiểm thử validation, lưu/đọc lại, dữ liệu prompt và phép tính trọng số; cần triển khai và kiểm chứng chất lượng câu hỏi với provider thật.

## Kiểm tra kết nối proxy OpenAI tùy chỉnh (2026-10-15)

Nút kiểm tra API Key không truyền `modelName`: với endpoint OpenAI tùy chỉnh, backend gọi `GET /models` cùng Bearer key rồi dùng model đầu tiên có ID hợp lệ để gửi câu `ping`. Không mặc định gửi `o3-mini` tới proxy LiteLLM/Ollama. Nếu danh sách rỗng, báo lỗi yêu cầu chỉ định model và không gửi chat. Khi request truyền model cụ thể, dùng đúng model đó. Kết quả trả `modelVersion` cho biết model đã kiểm tra; thao tác này không đổi model routing của các task. Trạng thái: `Done` (kiểm thử HTTP mô phỏng; cần triển khai backend để áp dụng cho server).

## Vào phòng trước, tạo lời chào bất đồng bộ (2026-10-15)

- Sau khi kiểm tra thiết bị và xác nhận bắt đầu, ứng viên vào phòng chờ ngay. Micro/chia sẻ tab được giữ trong lúc AI chuẩn bị; chỉ hiển thị chat khi lời chào đã được lưu.
- API `POST /api/v1/ai-interviews/{id}/start` với phiên hội thoại trả nhanh `IN_PROGRESS`, `startedAt=null`, `expiresAt=null`. Worker RabbitMQ hiện có tạo lời chào; chỉ sau khi thành công mới lưu session/message và bắt đầu đồng hồ. API không còn gọi model trực tiếp trong request bắt đầu.
- Dispatcher lấy cả phiên hội thoại `IN_PROGRESS` chưa có `startedAt` để gửi queue tạo câu hỏi, kèm tenant context như trước. Khóa phiên bảo đảm không tạo trùng lời chào; tiến trình gián đoạn có thể tiếp tục từ trạng thái DB.
- Giao diện kiểm tra trạng thái mỗi 2 giây khi mở phòng. Lỗi provider chuyển phiên sang `ERROR`, ghi `OPENING_FAILED`; phòng chờ cho thử lại cùng phiên, không tăng lượt làm và không buộc kiểm tra/chia sẻ thiết bị lại. Nộp bài khi lời chào chưa sẵn sàng trả `AI_CONVERSATION_PREPARING` (409).
- Khi ứng viên chủ động quay lại kiểm tra thiết bị hoặc rời phòng, hệ thống dừng thiết bị đang giữ. Kiểm tra giám sát của phiên thi vẫn áp dụng khi chat bắt đầu.

## Provider tương thích OpenAI / Llama (2026-10-15)

- Trạng thái transport/chấm/âm thanh backend: `Done` — 58 kiểm thử liên quan thành công; smoke test dữ liệu giả trên endpoint thực tế xác nhận streaming, toàn bộ luồng tính điểm/báo cáo, TTS và STT. Đã khôi phục chấm lại phiên lỗi và xác minh điểm/báo cáo được lưu. Frontend build thành công; thao tác micro thực tế trên trình duyệt ứng viên vẫn cần kiểm chứng.
- Hội thoại streaming, chấm transcript và engine cũ hỗ trợ `GEMINI` hoặc `OPENAI`. Với Llama qua API tương thích OpenAI, chọn `OPENAI` và model đúng cho cả `INTERVIEW_GEN` / `INTERVIEW_NLP`.
- Endpoint nhận base URL (`https://host/v1`) hoặc URL đầy đủ (`https://host/v1/chat/completions`); backend chuẩn hóa để không lặp `/chat/completions`.
- Với `OPENAI`, model lấy theo task Master DB; `AI_INTERVIEW_CONVERSATION_MODEL` chỉ override Gemini. Không dùng key Gemini dự phòng cho endpoint OpenAI.
- Llama xử lý hội thoại và chấm điểm. STT/TTS native dùng cấu hình Gemini riêng, ưu tiên key Gemini ACTIVE trong Master DB rồi `AI_INTERVIEW_GEMINI_API_KEY`; không dùng key Llama hoặc key CV dự phòng cho âm thanh. Model STT dùng cấu hình Interview Gemini/override Gemini hiện có, model đọc dùng `AI_INTERVIEW_TTS_MODEL`.
- Lỗi âm thanh HTTP 502/503/504 được thử lại tối đa một lần. Nếu TTS backend không khả dụng, nút “Nghe AI” dùng Speech Synthesis của trình duyệt và thông báo rõ. Bắt đầu ghi âm sẽ dừng giọng đọc; transcript vẫn cần được ứng viên kiểm tra trước khi gửi.
- Chấm transcript thu nhận JSON qua streaming nội bộ, tối đa 180 giây và 32.000 ký tự; không công bố kết quả từng phần. Provider tương thích OpenAI nhận JSON Schema ràng buộc đủ bốn tiêu chí, kiểu số và bằng chứng; backend vẫn kiểm tra độc lập. Request tuân theo `maxTokens` của task, chỉ gửi ngữ cảnh Job và transcript (không gửi các quy trình cấu hình không dùng). Kiểm tra điểm 0–100, trích dẫn chính xác từ USER và nhận xét hợp lệ trước khi lưu báo cáo.
- Giao diện recruiter hiển thị `candidateTurns/maxTurns` từ phiên hội thoại, không dùng số bản ghi `ai_questions` của engine cũ làm tiến độ.
- Vận hành: dùng base endpoint `/v1` để tương thích cả client cũ có tự nối `/chat/completions`; test kết nối trên trang quản trị nhận cả base URL và URL đầy đủ. Sau khi đổi endpoint cần xóa cache cấu hình Interview và chỉ chấm lại phiên ERROR đã kết thúc, giữ nguyên transcript.
- Kiểm chứng tự động: request đúng endpoint/model/key, streaming, chấm JSON, không override model Llama bằng model Gemini, không gọi âm thanh sai provider; giữ kiểm thử hồi quy Gemini.

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
   Job chưa lưu cấu hình mặc định bật **Cho phép AI Interview và tự tạo lời mời khi CV đạt**, áp dụng cả backend. Recruiter có thể bỏ tích và lưu để tắt; Job đã lưu giữ lựa chọn hiện có.
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

## Cấu hình Llama qua OpenAI-compatible endpoint

### Khôi phục LiteLLM local (2026-10-15)

- Khi ngrok/Llama thử riêng thành công nhưng phiên vẫn `OPENING_FAILED`, kiểm tra cả `ai_model_configs`, provider key và Redis. Đã phát hiện `INTERVIEW_GEN` còn `CURSOR / claude-sonnet-4-5` trong Master DB/cache, dù env đã là Llama. Cần đồng bộ cả `INTERVIEW_GEN` và `INTERVIEW_NLP` sang `OPENAI / vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M`, có provider key ACTIVE mặc định với endpoint ngrok đúng, rồi xóa cache hai task (bao gồm hậu tố `:spring-ai-v1`). Không tăng số lượt hoặc đặt lại dữ liệu phiên để xử lý lỗi cấu hình.

- Ngrok chuyển cổng 8000 tới LiteLLM; Ollama chạy cổng 11434 với model Llama đã chọn. Lỗi `400 / no_db_connection / No connected db.` xuất hiện tại LiteLLM khi key gửi đến không được nhận diện là master key và proxy không có database cho virtual key.
- Khôi phục ngày 2026-10-15: phiên #33 của tenant `ttqt` (subdomain `se36`) lỗi `OPENING_FAILED / HTTP 400`. Tiến trình LiteLLM chạy trực tiếp bằng `--model` được khởi động lại bằng `deploy/scripts/start-interview-ai.ps1` để nạp cấu hình model và master key từ môi trường. Kiểm chứng qua ngrok: `/v1/models` trả 200; request chat mẫu dạng stream với `max_tokens=12672` trả 200 và kết thúc `finish_reason=stop`. Không sửa dữ liệu phiên; chưa kiểm chứng lại phiên #33 qua giao diện. Trạng thái: `Doing`.
- Cấu hình local tại `artifacts/litellm-interview-local.yaml` dùng `LITELLM_MASTER_KEY` từ môi trường, không chứa secret. Script `deploy/scripts/start-interview-ai.ps1` đọc `AI_INTERVIEW_API_KEY` trong `backend/.env`, thiết lập UTF-8 và chạy LiteLLM ẩn ở cổng 8000. Chỉ chạy script khi cổng 8000 chưa có dịch vụ; giữ lệnh ngrok hiện có.
- Kiểm chứng trực tiếp qua URL ngrok và key env: HTTP 200, có lời chào/câu hỏi mẫu và SSE kết thúc `finish_reason=stop`. Chưa kiểm chứng lại phiên candidate 27 qua giao diện hoặc cấu hình task/key đã lưu trong Master AI.

- `AI_INTERVIEW_PROVIDER=OPENAI`, `AI_INTERVIEW_MODEL=vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M`.
- `AI_INTERVIEW_BASE_URL=https://linked-flagpole-many.ngrok-free.dev/v1/chat/completions`; key riêng qua `AI_INTERVIEW_API_KEY` trong môi trường chạy.
- Để trống `AI_INTERVIEW_CONVERSATION_MODEL`. Sinh câu hỏi, chấm điểm và hội thoại dùng cấu hình task; fallback env dùng Llama. Master AI/cache vẫn ưu tiên hơn fallback env, cần đồng bộ `INTERVIEW_GEN` và `INTERVIEW_NLP` nếu đang lưu model khác.
- Gemini chỉ phục vụ STT/TTS qua biến `AI_INTERVIEW_GEMINI_*` và `AI_INTERVIEW_TTS_MODEL`; không dùng key Llama cho speech.
- Load lại biến môi trường và khởi động lại backend. Trạng thái `Doing`: chưa kiểm chứng endpoint ngrok thật.


Với `schemaVersion = 2`, hệ thống chỉ sinh câu hỏi chính của process hiện tại. Mỗi câu được lưu cùng `referenceAnswer`
và `keyPoints` trong `rubric_json` trước khi candidate nhìn thấy câu hỏi; process kế tiếp chỉ được sinh sau khi process hiện
tại hoàn tất. Candidate API chỉ trả câu thuộc process đang chạy.

Đáp án mẫu, rubric, `correct_option` và `explanation` là private-by-default. Sau khi interview hoàn tất, backend chỉ trả
đáp án đúng/giải thích khi snapshot review cho phép `showCorrectAnswer` hoặc `showExplanationAfterInterview`.

Communication dùng text hoặc STT trình duyệt. Phiên voice yêu cầu consent trước khi bắt đầu. Candidate ghi âm, dừng và kiểm tra transcript trước khi gửi; bản ghi và câu trả lời được xử lý cùng thao tác. Recruiter được phân quyền Job xem transcript, audio và phản hồi sau khi phiên kết thúc.

Speech Signals đo năng lượng micro: thời lượng, thời gian có tiếng nói, khoảng dừng từ 600 ms và thời gian từ lúc câu xuất hiện tới tín hiệu lời nói đầu tiên; tốc độ từ/phút tính từ transcript và thời gian nói. Đây là chỉ số hỗ trợ, có thể bị ảnh hưởng bởi tiếng ồn và micro; không dùng để suy ra tính cách hay tự cộng vào điểm nội dung. Người trả lời văn bản không có chỉ số audio.

Audio tối đa 9 MB/câu, định dạng WebM/Ogg/MP4, tải lên kho Cloudinary authenticated; backend kiểm tra tenant, ownership, consent và chữ ký container. Recruiter nghe qua API có xác thực; không trả object key hay URL công khai. Hội thoại vận hành theo lượt, không hứa SLA độ trễ hoặc streaming hai chiều với API miễn phí.
