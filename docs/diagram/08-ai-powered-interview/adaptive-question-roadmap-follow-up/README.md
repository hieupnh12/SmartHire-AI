# FE08-F03 — Sinh câu hỏi thích ứng, lộ trình và hỏi bồi

- Feature: `08 / AI-Powered Interview`; chức năng `INT-01`, hội thoại liên quan `INT-03`.
- Góc nhìn: application design, đối chiếu code hiện tại ngày 16/10/2026; không phải kiến trúc mục tiêu.
- Trạng thái: `Complete`.

## Phạm vi và kết luận đối chiếu

Sơ đồ mô tả phiên mới `conversationVersion=1`: candidate bắt đầu phiên Communication, worker chuẩn bị câu mở đầu, sau đó AI sinh một câu tiếp theo theo lịch sử trả lời qua SSE. Lộ trình hiển thị được ánh xạ từ snapshot cấu hình; không phải một bộ lộ trình nhiều chặng vừa được AI sinh.

**AI đề xuất lộ trình hiện chưa hoạt động:** `AiInterviewConfigService.suggest()` kiểm tra quyền job rồi ném HTTP 409 `AI_INTERVIEW_PROCESS_UNAVAILABLE`. Vì vậy không vẽ bước sinh lộ trình thành công. `InterviewPolicies.communicationPolicy()` chỉ bật Communication; `snapshot()` đánh dấu phiên hội thoại mới. Giới hạn hỏi bồi từng câu được đưa vào instruction; model hội thoại không lưu loại MAIN/FOLLOW_UP hoặc bộ đếm hỏi bồi theo câu. Server kiểm soát tổng lượt và deadline, không bảo đảm cứng số hỏi bồi từng câu.

`AiInterviewProcessEngine` vẫn có `generateFollowUp()` với parent question và bộ đếm, nhưng thuộc nhánh snapshot không dùng conversation. Không trộn nhánh đó với `InterviewSession`/`InterviewMessage`. Bộ sơ đồ cũ `../ai-interview-question-generation/` là góc nhìn thiết kế mục tiêu, được giữ nguyên. Không bao gồm STT/TTS, bản ghi, chấm điểm cuối phiên hay chia sẻ feedback.

## Nguồn đã đọc

- `DESIGN.md`, skill enterprise-uml-diagram và ba tài liệu references của skill.
- `docs/features/AI-Interview/Question-Generation.md`, `Speech-to-Text.md`, `NLP-Response-Analysis.md`; `docs/api/API_GUIDE.md` và annotation OpenAPI trên controller. Khi tài liệu lịch sử khác code, bộ này mô tả code và ghi rõ sai khác ở trên.
- `backend/src/main/java/com/smarthire/tenant/aiInterview/`: controller `AiInterviewController`, `InterviewConversationController`; service `AiInterviewService`, `AiInterviewConfigService`, `AiInterviewEvaluationService`, `InterviewConversationService`, `InterviewPolicies`, `AiInterviewProcessEngine`; mapper `AiInterviewMapper`; client `InterviewConversationClient`; DTO request/response hội thoại.
- `backend/src/main/java/com/smarthire/messaging/`: `AiInterviewWorker`, `AiInterviewWorkDispatcher`, `TenantJobExecutor`; `AiInterviewWorkService` nằm trong package service aiInterview.
- Entity `InterviewSession`, `InterviewMessage`; migration tenant V39 và V44. V44 quy định UNIQUE/FK của phiên và tin nhắn.

## Actor, tiền điều kiện và kết quả

Actor chính là candidate sở hữu application; recruiter đã cấu hình phiên trước đó. Phiên Communication mới đã có snapshot, đủ điều kiện, nằm trong cửa sổ thực hiện; voice cần consent nếu bật. HTTP phải có xác thực và tenant hợp lệ trước truy vấn.

Thành công khởi tạo: có session và ASSISTANT message, timer bắt đầu sau khi có lời mở đầu. Thành công một lượt: lưu cặp USER/ASSISTANT và tăng candidateTurns; SSE done xác nhận sau commit. Retry requestId đã lưu và cùng nội dung trả lịch sử cũ, không gọi AI lại. Lỗi provider không tạo câu thành công giả; phần lượt mới rollback. Text delta trước done chỉ là tạm thời.

## Diễn giải sequence

Các nhóm dưới đây bao quát các tương tác có đánh số tự động trong sơ đồ:

1. Candidate yêu cầu bắt đầu qua UI. Security/tenant boundary xác thực và chọn tenant datasource; Controller/Service khóa attempt, kiểm tra owner, application, trạng thái, availability và consent. Nhánh từ chối trả 403/404/409; không xếp việc chuẩn bị.
2. Nhánh cho phép commit IN_PROGRESS nhưng startedAt/expiresAt vẫn null, ghi OPENING_QUEUED; response 200 có roadmap từ mapper. HTTP cleanup giải phóng context. Không vẽ service publish trực tiếp vì code dùng dispatcher định kỳ.
3. `opt` chỉ chạy khi admission thành công và opening còn chờ: dispatcher chọn việc pending trong tenant active, RabbitMQ truyền ID và X-Tenant-ID, worker khôi phục context bằng TenantJobExecutor rồi gọi Evaluation.process(). Master tenant registry chỉ phục vụ dispatcher; không có join master–tenant và không đưa thành lifeline riêng.
4. Evaluation khóa attempt và kiểm tra lại điều kiện để message lặp không mở lại phiên. initialize kiểm tra session hiện có; `opt session absent` mới gọi AI với snapshot/context để lấy câu đầu. Thành công lưu session và message, đặt timer/deadline. Lỗi domain/provider được Evaluation bắt và ghi ERROR/OPENING_FAILED. Khối worker được giải phóng context dù thành công hay lỗi.
5. UI lấy conversation qua HTTP đã xác thực/resolve tenant, Controller gọi get() kiểm tra quyền rồi đọc transcript. Khi chưa chuẩn bị xong có thể nhận lỗi chưa sẵn sàng; không giả định start response đã chứa câu đầu.
6. `loop` diễn tả các lượt khi opening đã sẵn sàng, chưa hết hạn và chưa hoàn tất. Candidate gửi UUID requestId cùng câu trả lời; controller validate và kiểm tra quyền sơ bộ bằng get(), mở SSE 200, chạy task executor với tenant và authentication đã capture. Context HTTP gốc được clear độc lập.
7. Service trong transaction khóa/kiểm tra quyền attempt, đọc session và lịch sử. `alt` thứ nhất: ID và nội dung trùng thì trả done với dữ liệu đã commit. `else` lỗi ID trùng nội dung khác, trạng thái, thời hạn hoặc ngân sách lượt: phát lỗi an toàn, không gọi AI. Service thực tế còn kiểm tra active trước khởi tạo lượt mới; kiểm tra idempotency được ưu tiên trước requireActive.
8. Nhánh hợp lệ xây prompt từ snapshot, job/CV context, history và câu trả lời. AI điều chỉnh độ sâu, chủ đề và nhịp hỏi; delta được chuyển qua callback tới SSE trong lúc sinh, chưa chứng minh dữ liệu đã lưu. Client là adapter gọi provider, không phải candidate gọi AI trực tiếp.
9. Nhánh provider thành công lưu USER/ASSISTANT và tăng bộ đếm trong cùng transaction; controller phát done sau commit. Nhánh provider/disconnect thất bại rollback phần lượt mới; gửi error nếu kết nối còn mở. UI giữ nháp để thử cùng ID; timeout/network có thể mất done sau commit, được xử lý bằng nhánh idempotency.
10. Cuối task, TenantJobExecutor cleanup tenant và controller finally cleanup SecurityContext. Đủ lượt trả dialogueComplete cho UI; thao tác kết thúc và chấm điểm là use case khác, không giả định đạt maxTurns tự chấm trong turn().

Sơ đồ nhóm controller/service bắt đầu, dispatcher/broker/worker và security/context để giữ khả năng đọc. Có 11 lifeline vì cần phân biệt HTTP, hàng đợi chuẩn bị opening và SSE; các tên ghép là nhóm runtime, không phải lớp mới.

## Diễn giải class và toàn bộ quan hệ

Các lớp service là class thực tế, không thêm interface/Impl không có trong code. Repository là interface. Package và style dùng chung FE08; DTO tách entity; các trường chỉ giữ phần cần cho use case.

| Nguồn → đích | Loại và ý nghĩa |
|---|---|
| AiInterviewController → AiInterviewService; InterviewConversationController → InterviewConversationService | Association có hướng: controller giữ service và ủy quyền nghiệp vụ. |
| AiInterviewController → AiInterviewResponse; InterviewConversationController → ConversationTurnRequest/ConversationResponse | Dependency: dùng contract request/response; response hội thoại được controller chuyển trong SSE. |
| InterviewConversationController → TenantJobExecutor; AiInterviewWorker → TenantJobExecutor | Association: chạy công việc async trong tenant đã chọn, cleanup sau task. |
| AiInterviewService → AiInterviewRepository/AiInterviewMapper | Association: khóa/cập nhật attempt và ánh xạ response; không trả entity trực tiếp. |
| AiInterviewMapper → AiInterviewResponse/RoadmapStep | Dependency: tạo DTO và các bước từ policy snapshot, không gọi AI để sinh roadmap. |
| AiInterviewResponse → RoadmapStep | Association 0..*: response chứa danh sách bước; không dùng composition để khẳng định vòng đời riêng. |
| AiInterviewWorker → AiInterviewEvaluationService | Association: listener ủy quyền xử lý opening/sinh/chấm theo trạng thái; chỉ opening trong sequence này. |
| AiInterviewEvaluationService → AiInterviewRepository/InterviewConversationService | Association: khóa attempt, điều phối và khởi tạo hội thoại; ghi trạng thái lỗi nếu chuẩn bị thất bại. |
| InterviewConversationService → AiInterviewRepository/InterviewSessionRepository/InterviewMessageRepository | Association: kiểm tra quyền và quản lý session/lịch sử qua repository tenant. |
| InterviewConversationService → InterviewConversationClient | Association: adapter sinh câu trả lời AI từ instruction/history và callback delta. |
| InterviewConversationService → InterviewPolicies/ConversationResponse | Dependency: đọc snapshot policy và tạo DTO kết quả. |
| Ba repository → entity tương ứng | Association quản lý persistence: AiInterviewRepository/AiInterview, InterviewSessionRepository/InterviewSession, InterviewMessageRepository/InterviewMessage. |
| Ba repository → Dedicated Tenant MySQL | Dependency persistence biểu diễn bằng đường có hướng: JPA đọc/ghi qua datasource tenant; không phải biến field MySQL trong repository. |
| InterviewSession → AiInterview | Association: mỗi session thuộc đúng một attempt; một attempt có 0..1 session nhờ UNIQUE V44. |
| InterviewMessage → InterviewSession | Association: mỗi message thuộc một session; session có 0..* message. FK V44 CASCADE; không suy luận composition từ cascade. |

Không sử dụng inheritance, realization, aggregation hoặc composition vì use case không cần và code không có service interface tương ứng. Kiểu AiInterviewStatus/Message trong chữ ký được rút gọn; không mở rộng inventory enum/nested DTO ngoài phạm vi.

## Multi-tenant, transaction, privacy và audit

Toàn bộ dữ liệu nghiệp vụ trong DB tenant riêng. RabbitMQ phải mang X-Tenant-ID; HTTP, Rabbit worker và SSE task cleanup context riêng. Không thêm tenant_id vào entity. Transaction initialize tham gia Evaluation.process(); turn là transaction riêng, done sau commit. UNIQUE `(session_id, sequence_no)` và `(session_id, client_request_id)` dựa trên SQL V44. Session UNIQUE ai_interview_id và hai FK đều có CASCADE.

Snapshot/job/CV/câu trả lời là dữ liệu không tin cậy trong prompt; không đưa giá trị PII, key, token vào diagram. Model được hướng dẫn không lộ rubric/đáp án và không chấm ngay trong dialogue. Audit opening có OPENING_QUEUED, STARTED hoặc OPENING_FAILED; không tự thêm audit từng tin nhắn khi code không có. Quota/rate-limit/metering và consent vẫn do hạ tầng hiện có; không vẽ nội bộ vì không phải trọng tâm.

## Giả định, giới hạn và render

Không giả định AI đề xuất lộ trình đã triển khai. Khả năng hỏi bồi theo prompt không đồng nghĩa backend xác minh cứng từng câu. Đây là mô tả code, chưa phải chứng nhận E2E provider/browser. Không sửa hành vi ứng dụng hay trạng thái feature.

Artifacts mới: `class-diagram.puml`, `sequence-diagram.puml`, README này. Đã tạo class-diagram.png và sequence-diagram.png theo yêu cầu người dùng; ảnh của bộ cũ không đại diện bộ mới. Kiểm tra syntax bằng:

```powershell
.agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/08-ai-powered-interview/adaptive-question-roadmap-follow-up -PlantUmlJar .agents/skills/enterprise-uml-diagram/tools/plantuml.jar -ValidateOnly
```

Sau khi người dùng đồng ý render: dùng cùng lệnh, thay `-ValidateOnly` bằng `-Format Png -PngDpi 300`, xác minh metadata 300 DPI và kiểm tra ảnh. Không tạo SVG.

Kiểm chứng 16/10/2026: ValidateOnly bằng JAR có sẵn trong skill thành công cho cả hai file PlantUML; không tạo ảnh. Đã đối chiếu mapper roadmap, controller SSE, transaction turn và UNIQUE/FK V44. Đã render bằng JAR có sẵn, xác minh cả hai PNG có metadata 300 DPI và mở ảnh kiểm tra bố cục: class 7492×3228 px, sequence 7230×5805 px; không thấy nội dung bị cắt.

