# AI Question Generation

## AI Conversation triển khai ngày 2026-10-03

Phiên mới có `conversationVersion=1` trong snapshot; lưu InterviewSession/InterviewMessage, không tạo AiQuestion hoặc đáp án/rubric trước. GENERATING chốt Job/CV context; QUESTIONS_READY mở phòng. Start tạo lời chào và câu hỏi đầu. Mỗi lượt USER gửi lịch sử đầy đủ → Gemini native streamGenerateContent → phản hồi SSE thích ứng. Khi kết thúc hoặc hết thời gian, worker mới đánh giá toàn transcript. Phiên cũ không có marker giữ engine cũ.

Ngân sách lượt = số chủ đề × (1 + hỏi bồi), tối đa 40; thời lượng/ngôn ngữ/consent/ngưỡng đạt vẫn theo snapshot. AI hỏi một câu mỗi reply, lượt cuối chỉ kết thúc. Không có Next/Previous hoặc điểm từng câu ở phòng mới. API `POST .../{id}/conversation/turns` nhận `{requestId: UUID, content}`; event `delta{text}`, `done{ConversationResponse}`, `error{message}`. Khóa hàng attempt để tuần tự hóa; user + AI cùng transaction. Lỗi trước commit rollback lượt; retry cùng UUID nhận lượt đã commit nếu mất event done. Không gọi chấm điểm trong đường đối thoại.

Database: V44 có hai bảng/entity, FK CASCADE, UNIQUE thứ tự/request. UI chat giữ draft khi lỗi, micro qua WebSocket, nghe AI qua TTS API; Recruiter xem transcript/bản ghi theo quyền Job sau complete. Trạng thái `Doing`: đã kiểm chứng code/build và provider streaming/STT/TTS bằng nội dung tổng hợp; chưa E2E tài khoản candidate thật trên tenant migrate V44. Các phần Process V2/Spring AI dưới đây áp dụng snapshot legacy.

## Hotfix ổn định (2026-10-03)

- Xóa phiên: backend chỉ cho staff xóa phiên chưa có `startedAt`, trạng thái `CREATED`, `QUESTIONS_READY` hoặc `ERROR`; các trường hợp còn lại trả `409 / AI_INTERVIEW_LOCKED`. Menu Recruiter khóa nút xóa theo cùng điều kiện và có mô tả lý do. Hộp xác nhận hiển thị lỗi API, bao gồm lý do khóa bằng tiếng Việt nếu trạng thái thay đổi trong lúc thao tác. Không thay đổi quyền hoặc điều kiện xóa backend.

- Camera tạm thời tùy chọn: mặc định không yêu cầu quyền camera; ứng viên có thể chọn bật. Không có camera, từ chối quyền hoặc không mở được camera vẫn tiếp tục nếu microphone và chia sẻ toàn màn hình hợp lệ. Camera dừng không tính vi phạm. Microphone, chia sẻ toàn màn hình và fullscreen vẫn bắt buộc. Test giả lập bao gồm không bật camera và fallback khi camera lỗi; chưa E2E thiết bị thật, trạng thái `Doing`.

- Kiểm tra thiết bị candidate gồm hai thao tác: `Kiểm tra thiết bị` yêu cầu chia sẻ toàn bộ màn hình ngay từ click, rồi mở camera và microphone riêng để xác định thiết bị lỗi; `Bắt đầu phỏng vấn` vào fullscreen và mới gọi luồng start hiện có. Thu hồi stream khi kiểm tra thất bại, bỏ consent hoặc rời bước chuẩn bị. Lỗi thiết bị hiển thị hướng dẫn tiếng Việt kèm loại lỗi trình duyệt. Test giả lập kiểm tra thứ tự mở, phân biệt lỗi, cleanup, màn hình không hợp lệ và HTTPS; chưa xác nhận camera thật/E2E do phiên làm việc chưa kết nối trình duyệt. Trạng thái phần E2E: `Doing`.

- Candidate gọi API bắt đầu theo application: sinh câu đầu trực tiếp qua service xử lý hiện có, không đợi scheduler 15 giây; worker vẫn là cơ chế phục hồi cho phiên đang chờ. Trả `QUESTIONS_READY` khi sinh xong, hoặc `ERROR` khi lỗi; thao tác bắt đầu tiếp theo vẫn kiểm tra consent và thời gian khả dụng.
- Parser Process V2 gán index thiếu theo vị trí, difficulty thiếu thành `medium`, keyPoints thiếu/rỗng lấy các đoạn từ referenceAnswer (tối đa 6, mỗi đoạn tối đa 2000 ký tự). Bỏ trường thừa và dữ liệu lựa chọn ở câu OPEN. Không sửa JSON nguồn; vẫn chặn số lượng/index trùng, câu trống/trùng, thiếu referenceAnswer, loại bài sai và đáp án trắc nghiệm sai.
- Log client có task, HTTP status, loại exception và stack trace đã lọc; không ghi response body, key hoặc nội dung ứng viên. Lỗi timeout có loại exception/cause để phân biệt với lỗi parse.
- `.env` backend dùng `gemini-2.5-flash`, read timeout 10 giây mỗi lần gọi. Retry 429/502/503/504 tối đa 3 lần nên tổng thời gian có thể vượt 10 giây; không cam kết SLA 10 giây cho toàn request. Key hiện có được giữ, chưa xác minh bằng cuộc gọi Google thực tế. Cấu hình Master DB/cache vẫn được ưu tiên hơn env.
- Kiểm chứng: 59 test thuộc parser, candidate, client, process engine và Communication pass; `git diff --check` không có lỗi whitespace trong phần hotfix. Key env hiện có không khớp định dạng Google API key thông thường; cần thay key hợp lệ trong môi trường chạy rồi kiểm chứng phiên thật, bao gồm cấu hình Master DB/cache ưu tiên.

## Phạm vi còn lại của AI Conversation

- Nhịp hỏi (2026-10-03): mở đầu bằng một câu dễ về dự án/công việc quen thuộc do ứng viên chọn; sau câu trả lời đầu chỉ hỏi một chi tiết cơ bản từ ví dụ đó. Từ câu trả lời thứ hai mới mở rộng dần sang kiến thức, lập luận và tình huống chuyên sâu khi ứng viên thể hiện sẵn sàng; nếu lúng túng thì làm rõ hoặc đơn giản hóa. Mỗi lượt một câu, không ghép nhiều câu hỏi con. Không thêm lượt/thời lượng; lượt cuối vẫn chỉ kết thúc. Phiên đã lưu lời mở đầu giữ nguyên nội dung đó, các lượt tiếp theo áp dụng nhịp mới. Đây là chỉ dẫn cho AI, chưa xác minh chất lượng hội thoại với provider thật; trạng thái `Doing`.

Chat session/message, streaming text, chấm toàn phiên và STT/TTS backend đã triển khai. Audio chunk được ghép thành một lượt thu âm hoàn chỉnh rồi chuyển ngữ; chưa có Live Audio hai chiều/barge-in/nhận dạng tức thời từng fragment. Cần E2E tenant thật và vận hành quota trước Done.

## Communication hiện hành (2026-10-02)

Spring AI `ChatClient` gọi Gemini qua endpoint tương thích OpenAI (`/v1beta/openai/chat/completions`) bằng Gemini API key. Sinh câu đầu, câu thích ứng, hỏi bồi và đáp án mẫu dùng cấu hình `INTERVIEW_GEN`; chấm câu trả lời dùng `INTERVIEW_NLP`. Giữ nguyên snapshot, thứ tự và format Communication. Phản hồi phải hoàn tất (`finish_reason = stop`) và là JSON object trước khi kiểm tra rubric.

Communication tích hợp bốn tiêu chí nội dung: kiến thức chuyên môn, giải quyết vấn đề, lập luận và giao tiếp. Các tiêu chí này thuộc cùng một phiên Communication; năm quy trình đã hoãn vẫn không được bật.

Mặc định Adaptive Questions bật: chỉ sinh một câu chính trước; khi câu trả lời được chấm và hết hỏi bồi, sinh câu chính kế tiếp từ Job, snapshot và câu trả lời vừa gửi. Bật hỏi bồi tối đa 1/chủ đề theo mặc định (cho phép 0–3). Nếu tắt thích ứng thì sinh trước bộ câu chính.

Chấm điểm yêu cầu evidence là đoạn có thật trong transcript; evidence không tồn tại nhận 0. Điểm câu trung bình bốn tiêu chí, report tổng hợp `communicationCriteria`. `speechMetrics` và tốc độ từ/phút là chỉ số hỗ trợ Recruiter, không tự cộng vào điểm nội dung. Audio/transcript xem qua API có xác thực sau khi hoàn tất.


> **Phạm vi hiện tại (2026-10-02):** Chỉ Communication đang hoạt động. Năm quy trình còn lại và Mini Assessment được khóa để phát triển trong tương lai. Phiên mới chỉ sinh/chấm Communication (100% trọng số); snapshot cũ không được viết lại. Xem [hướng dẫn cấu hình](AI-Interview-Configuration-Guide.md).


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

- Job chưa lưu cấu hình AI Interview mặc định bật tự tạo lời mời khi CV đạt. API cấu hình và luồng mời/kiểm tra điều kiện dùng cùng mặc định này. Sau khi lưu, `enabled` được tôn trọng (kể cả `false`); không tự ghi đè lựa chọn đã lưu hoặc snapshot phiên cũ.
- **Process V2 — cấu hình là hợp đồng sinh bài:** tổng câu hỏi chính lấy từ các process bật (1–30 toàn phiên, 1–10/process), không chỉnh số tổng độc lập. Cấu hình chuẩn hóa loại bỏ metadata DOM/UI (`__fields`, nhãn form), chuyển số/boolean về đúng kiểu; giữ snapshot của phiên. Technical Knowledge dùng `single`/`multiple`/`mixed` thực sự: 4 phương án, Single có 1 đáp án đúng, Multiple có 2–3, Mixed luân phiên; tắt Multiple Correct Answers thì Mixed chỉ sinh Single, chọn Multiple mà tắt quyền này bị từ chối. Xáo trộn phương án phải ánh xạ lại đáp án chuẩn.
- Mỗi slot có chỉ số, loại bài, độ khó và Job Skills đã chọn (phân bổ bao phủ danh sách). Context Job/CV được chốt vào `context_snapshot_json`; AI nhận JD, trách nhiệm, kinh nghiệm tối thiểu, cấu hình chung và cấu hình process đã chuẩn hóa. `verifyAgainstCV=false` ở Practical Experience loại bằng chứng CV khỏi yêu cầu sinh/chấm. Communication dùng ngôn ngữ đã chọn; các yêu cầu solution/explanation/STAR/role/result/alternatives/trade-offs được gửi trong hợp đồng. Kết quả sai slot, loại bài, độ khó, số đáp án, trùng phương án/câu hỏi hoặc thiếu rubric bị từ chối trước khi lưu.
- Đáp án lựa chọn V2 gửi trong `answerText` dưới dạng JSON `{"selectedOptions":[0,2],"explanation":"..."}`; V1 giữ chuỗi chỉ số `0`–`3`. Backend kiểm tra Single chỉ chọn 1, không trùng/ngoài 0–3, có giải thích khi yêu cầu. Không bắt buộc giải thích: đúng toàn bộ tập đáp án = 100, khác = 0, không gọi AI. Có giải thích: 70% độ chính xác lựa chọn + 30% rubric giải thích; chỉ chấm điểm cho bằng chứng trích đúng văn bản ứng viên.
- Hỏi bồi V2 sinh theo câu trả lời đã lưu, theo `followUpEnabled`, `maxFollowUp`/`followUpDepth` (0–3 mỗi câu chính). Hỏi bồi gắn `parent_question_id`, nằm ngay sau câu chính và không tăng số câu chính; chỉ kết thúc process sau chuỗi hỏi bồi cuối. Câu đã chấm không được sửa, ứng viên trả lời theo thứ tự. Backend trả các chặng đã hoàn thành và chặng hiện tại; chặng tương lai chưa mở vẫn kín.
- Điểm V2 dùng trọng số năng lực trong cấu hình chung; Technical Reasoning thuộc Problem Solving. Trọng số chuẩn hóa theo các năng lực có process bật, không dùng `process.weight` cũ làm nguồn thứ hai. Process bật chưa làm = 0 điểm. Quyền xem đáp án/giải thích Technical Knowledge lấy từ snapshot process, các bài còn lại dùng review chung; không trả feedback/đáp án chuẩn cho candidate khi đang làm.
- API câu hỏi bổ sung `correctOptions` (chỉ trả khi có quyền sau kết quả), `multipleChoice`, `explanationRequired`, `difficulty`, `hint`, `questionRole`, `responseMode`, `language`. Các trường đáp án nhiều lựa chọn nằm trong `rubric_json`; không đổi schema/entity.
- UI hiển thị rõ **ví dụ minh họa**, không coi preview tĩnh là bài AI đã sinh. Thời lượng áp dụng là thời lượng chung của phiên; các mốc 15/20/3 phút trong mockup không phải timer riêng. Speech dùng nhận dạng giọng nói của trình duyệt thành văn bản để ứng viên kiểm tra và lưu; không lưu audio. Lưu file audio và hội thoại realtime chưa khả dụng: UI khóa, backend từ chối cấu hình bật; không cho lưu setting không thực hiện được.

- Ngay khi CV Screening `PASSED`, hệ thống chuyển Application sang `INTERVIEW`, tự tạo phiên và sinh câu hỏi theo snapshot cấu hình Job. Notification và Email phải nêu thời gian có thể bắt đầu, hạn hoàn thành, thời lượng và số lần thực hiện.

- Cấu hình hợp lệ khi: tổng trọng số = 100%; kỹ năng chọn thuộc Job; tổng số câu các chặng = `questionCount`; mỗi chặng chỉ dùng nhóm năng lực có trọng số > 0 và kỹ năng đã chọn; lộ trình bao phủ mọi nhóm năng lực có trọng số và mọi kỹ năng đã chọn (Communication luôn được coi là bao phủ). Mini Assessment cần Technical Knowledge > 0% và ít nhất một Job Skill. Một kỹ năng có thể nằm ở nhiều chặng.
- Số câu trắc nghiệm cấu hình riêng với số câu hỏi–đáp. Giai đoạn thử nghiệm dùng 3 câu (có thể chọn 4); cấu hình hỗ trợ 3–10.
- Cấu hình và lộ trình chốt theo phiên khi tạo bộ câu hỏi; sửa Job chỉ ảnh hưởng phiên mới. Job cũ chưa có lộ trình dùng một chặng mặc định bao phủ mọi nhóm có trọng số và mọi Job Skill.
- Đáp án trắc nghiệm chỉ nằm ở backend; candidate không nhận `correctOption`/`explanation`, recruiter chỉ thấy sau khi có kết quả.
- Candidate không nhận nội dung câu hỏi trước khi bấm bắt đầu (`questions` rỗng khi `startedAt` null); chỉ nhận `roadmap` (tên chặng, loại `OPEN`/`MCQ`, số câu) và `durationMinutes` từ snapshot để xem trước lộ trình.
- Phiên theo lộ trình không cho thêm/xoá câu thủ công và chỉ cho sửa câu chữ của câu hỏi–đáp (`AI_INTERVIEW_PLANNED`), để không phá rubric. Sửa câu chữ sẽ xoá đáp án mẫu cũ; lúc chấm AI viết lại đáp án mẫu theo câu mới.
- Mỗi application có thể có nhiều lần làm (lịch sử giữ đủ); retry sinh câu/chấm điểm do lỗi hệ thống dùng lại phiên, **không** tiêu hao lượt.
- Phiên `ERROR` chưa có câu hỏi: candidate gọi lại bước 3 hoặc recruiter gọi `POST .../questions/generate` để sinh lại.
- Process Engine V2 giữ chặng ở `PENDING` cho đến khi bộ câu hỏi được kiểm tra và lưu thành công. Lỗi provider/validation không rollback trạng thái `ERROR` do worker ghi; retry khôi phục chặng bị kẹt `GENERATING` và dùng lại snapshot của chặng, không tạo thêm lượt làm.
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
| POST | `/api/v1/ai-interviews/{id}/proctor-events` | Candidate (owner, phiên đang làm) |
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
- Recruiter: `/recruiter/jobs/:id/ai-interviews`. Candidate: `/interviews` và `/interviews/:id`.
- Recruiter đã nối API cấu hình, sinh lại câu hỏi, thử chấm lại và lịch sử xử lý; trang chi tiết tự tải lại mỗi 5 giây. Các trạng thái `GENERATING`, `PASSED`, `ERROR` được hiển thị đúng. Điểm và trạng thái chỉ đọc, không có dữ liệu giả.
- Panel "Cấu hình AI Interview": thiết lập phiên, trọng số (mẫu Mặc định/Junior/Senior, hiển thị tổng), Job Skills, Mini Assessment (số câu, tỷ trọng, vị trí) và trình chỉnh lộ trình (thêm/xoá/đổi thứ tự chặng, nút "AI đề xuất lộ trình"). Validation phía FE khớp backend.
- Candidate `/interviews`: danh sách lời mời dùng dữ liệu thật từ `GET /api/v1/ai-interviews/me`, có thống kê tổng lời mời/cần thực hiện/đã hoàn thành; mỗi thẻ hiển thị vị trí, trạng thái, cửa sổ thực hiện, thời lượng, số câu, lần làm và điểm nếu có. CTA thay đổi theo trạng thái (`Bắt đầu`, `Tiếp tục`, `Xem kết quả`); trang có skeleton, lỗi tải lại, trạng thái hết hạn và empty state dẫn sang `/applications`.
- CTA phiên chưa hoàn tất dùng nhãn `Bắt đầu`; trước khi backend bắt đầu tính giờ, candidate phải đồng ý và bật fullscreen, microphone cùng chia sẻ toàn bộ màn hình; camera tạm thời tùy chọn. Phiên đang làm sau khi tải lại cũng khóa nội dung cho đến khi khôi phục giám sát.
- Phiên lỗi khi sinh câu hỏi hiển thị nút `Thử chuẩn bị lại câu hỏi`; candidate có thể yêu cầu backend đưa chính phiên đó về hàng đợi sinh câu hỏi mà không mất lượt. Bước kiểm tra thiết bị chỉ xuất hiện sau khi phiên chuyển sang `QUESTIONS_READY`.
- Route chi tiết luôn dùng khung phòng thi: header trạng thái, thời lượng/đồng hồ và pipeline được hiển thị cả trước khi bắt đầu hoặc khi sinh câu hỏi lỗi. Countdown chỉ chạy khi backend đã chuyển phiên sang `IN_PROGRESS`; không giả lập thời gian hay câu hỏi khi đề chưa được sinh.
- Trạng thái tải route có skeleton toàn trang; lỗi API có màn hình `Không thể tải phòng thi` với tải lại/quay về danh sách. Lỗi sinh đề có màn hình khôi phục riêng, nêu rõ đồng hồ chưa chạy và lượt thi chưa bị trừ; CTA ở danh sách đổi thành `Khôi phục phòng thi` thay vì giả là bắt đầu được ngay.
- Khi mở một phiên lỗi sinh đề nhưng chưa bắt đầu, frontend tự yêu cầu backend khôi phục đúng một lần rồi tiếp tục polling 15 giây; candidate vẫn có nút thử lại thủ công nếu request khôi phục thất bại. Khung phòng thi không bị thay bằng trang lời mời.
- Candidate `/interviews/:id` (bố cục 2 cột theo mockup phòng phỏng vấn): header sticky có mã phiên, trạng thái kết nối, đồng hồ "còn lại / tổng" theo `expiresAt` + `durationMinutes` của backend và nút "Kết thúc" (nộp bài, xác nhận "câu trống tính 0 điểm"); bên dưới là pipeline 3 vòng và navigator các chặng. Cột trái hiện **từng câu một** (tiến độ "Câu hỏi 03 / 06", chip chặng/kỹ năng, thẻ AI Interviewer, gợi ý trả lời an toàn, ô trả lời văn bản "Lưu & tiếp tục" hoặc trắc nghiệm lưu ngay, nút câu trước/sau); cột phải có thẻ **SmartHire AI Interviewer** (tiến độ, hình thức văn bản, trạng thái bảo toàn câu trả lời, trọng tâm câu hiện tại) và **Lộ trình phỏng vấn** (% hoàn thành; mỗi chặng hiển thị "01. Tên chặng" (gộp các câu trong cùng chặng, kèm số câu đã lưu) với trạng thái Đã nộp + "Thời lượng" (`answerDuration`, frontend gửi số giây cộng dồn mỗi lần lưu) / Hiện tại + "Đang trả lời (mm:ss)" / Chưa làm + "Ước tính ~N phút" (`durationMinutes` chia đều số câu); khối Mini Assessment không đánh số, ghi "N câu hỏi nhanh ngay sau chặng X", đặt đúng vị trí trong lộ trình; bấm để chuyển câu) và quy định phòng thi. Trước khi bắt đầu, trang hiển thị thẻ lời mời (số câu hỏi–đáp, số câu trắc nghiệm, thời gian, ngưỡng đạt) và lộ trình từ `roadmap`. Sau khi nộp: kết quả, nút "Làm lại" khi `canRetry`, danh sách câu trả lời.
- Mockup có ghi âm/nhận diện giọng nói, đọc câu hỏi (TTS), đo micro, xác minh camera/CCCD: **chưa triển khai** vì backend chưa có Speech-to-Text (INT-02); phiên hiện trả lời bằng văn bản.
- Sau mỗi lần thêm/sửa/xóa câu hỏi, backend đếm số câu: đủ số lượng cấu hình thì tự chuyển `QUESTIONS_READY`, chưa đủ thì `CREATED`. API cập nhật phiên từ chối sửa trạng thái/điểm thủ công.
- Lỗi provider được hiển thị bằng thông báo an toàn theo HTTP status (ví dụ 503: tạm thời không khả dụng), không lộ nội dung phản hồi hoặc API key.

## Kiểm chứng triển khai

- 2026-10-02 (kiểm tra Communication/Candidate): sửa mẫu JSON sinh câu tự luận để không yêu cầu `options`/`correctOptions`; độ khó `adaptive` phải được AI chuyển thành `easy`, `medium` hoặc `hard`. Validator chấp nhận trường trắc nghiệm không có dữ liệu (`null`/mảng rỗng), vẫn từ chối dữ liệu trắc nghiệm thực sự và giữ rubric riêng tư. Có test hồi quy cho đầu ra Communication này. Đây là lỗi tiềm năng trong contract đầu ra, chưa xác nhận là nguyên nhân của phiên lỗi trên giao diện; cần đọc `GENERATION_FAILED.detail` của đúng tenant/phiên để kết luận. Phòng `/interviews/demo` không gọi AI; phòng phiên thật gọi API chấm nội dung, hỏi bồi và sinh câu chính thích ứng. Chưa kiểm chứng E2E phiên thật trong lần kiểm tra này.

- 2026-10-02 (bản đồng bộ cấu hình V2): 73 test backend pass và build frontend (`tsc --noEmit` + Vite) pass. Bao phủ đúng loại một/nhiều đáp án, giải thích bắt buộc, số câu dạng chuỗi, kỹ năng, giới hạn follow-up, điểm trọng số, và sinh lại bản nháp an toàn. Hai lần thử provider thật ở bước chẩn đoán trả HTTP 503; chưa xác minh toàn phiên bằng Gemini và trình duyệt.
- Recruiter được **Sinh lại theo cấu hình** cho phiên Process V2 chưa bắt đầu/chưa có câu trả lời. API giữ snapshot và lượt; bộ cũ chỉ được thay trong transaction sau khi toàn bộ đầu ra chặng mới hợp lệ. Lỗi provider giữ bộ cũ để kiểm tra nhưng phiên không được coi sẵn sàng. Phiên đã bắt đầu hoặc có đáp án bị chặn. Response phiên thêm `processBased` để hiển thị đúng thao tác.

- 2026-10-02: Kiểm chứng sinh câu hỏi thực tế trên backend local sau khi khởi động lại với code hiện tại và RabbitMQ hoạt động: Gemini sinh/lưu 4 câu cho chặng đầu đúng số lượng snapshot, phiên chuyển `QUESTIONS_READY`, `error_message` được xóa, `attempt_number` giữ nguyên. Các chặng sau vẫn `PENDING` theo Process V2. Chỉ kiểm chứng bước sinh chặng đầu; chưa kiểm chứng trả lời/chấm điểm toàn phiên và mọi tùy chọn cấu hình.

- 2026-10-02: 57 test AI Interview pass (client, cấu hình, rubric, worker, Process Engine và candidate). Test retry mô phỏng provider lỗi rồi thành công, kiểm tra giữ snapshot/số câu/kỹ năng và khôi phục chặng `GENERATING`; kiểm tra transaction cho phép worker lưu lỗi. Chưa xác minh phiên thực tế với Gemini.

- 2026-10-02: Snapshot Process Engine V2 chấp nhận metadata UI dư trong cấu hình process; log lỗi parse ghi rõ thao tác và loại exception nhưng không ghi payload/PII.

- Sửa lỗi nút nộp bị khóa sau khi lưu đủ câu: xóa trạng thái chưa lưu của câu ngay trong callback lưu thành công, trước khi tự chuyển sang câu tiếp theo. Lưu thất bại hoặc còn thay đổi chưa lưu vẫn khóa nộp bài.

- 2026-09-29: 48 test liên quan AI Interview/rubric pass, gồm sinh Mini Assessment theo lô, chấm trắc nghiệm/câu trống không gọi AI, snapshot, giới hạn thời gian và đề xuất lại lộ trình.
- Kiểm tra render pass: gộp nhiều câu trong một chặng, giữ riêng chặng trùng tên, vị trí Mini Assessment và tiến độ.
- Mẫu Junior: 45/20/15/10/10; Senior: 20/35/25/10/10 theo thứ tự năm nhóm năng lực ở trên. Recruiter được chỉnh lại.
- Lộ trình hiển thị một mục cho mỗi chặng, kèm số câu đã lưu; Mini Assessment ghi vị trí sau chặng tương ứng.
- Phiên đã có snapshot dùng cấu hình và deadline đã chốt, kể cả khi cấu hình Job thay đổi.
- Chưa xác minh E2E với Gemini/MySQL và trình duyệt. Build TypeScript toàn frontend bị chặn bởi lỗi ngoài module Interview.

## Phụ thuộc

JOB-05, CV-04
