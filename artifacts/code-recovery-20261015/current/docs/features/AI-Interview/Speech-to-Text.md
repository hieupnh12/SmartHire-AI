# Speech-to-Text và ghi âm Communication

## STT/TTS backend cho Conversation mới (2026-10-03)

Phiên `conversationVersion=1` dùng MediaRecorder và Gemini STT/TTS API phía backend, không dùng SpeechRecognition/speechSynthesis. Candidate consent trước start, nhận Redis ticket single-use 60s gắn actor/tenant/attempt rồi mở `/ws/interview-voice?ticket=...`, không đưa JWT vào URL. Server ready; client gửi start{mimeType}, binary chunks 250ms (≤256KB/message, tổng≤9MB), end. Pool 3–10 ghép container hoàn chỉnh và gọi STT sau end dưới tenant/security context; luôn clear khi kết thúc. Audio WebM/Ogg/MP4 được kiểm tra MIME/container, owner, consent và deadline.

UI hiện transcript bản nháp để candidate sửa/kiểm tra; chỉ bấm Gửi mới commit USER message và sinh AI reply SSE. Text là phương án thay thế khi micro/STT lỗi. FE tự dừng sau 5 phút; timeout chuyển ngữ 60s. Chưa có Live Audio hai chiều/barge-in/partial transcript; fragment không được gửi độc lập cho Gemini.

TTS chỉ đọc ASSISTANT message đã lưu và đúng attempt qua backend API; trả WAV trực tiếp hoặc đóng gói PCM 24kHz mono 16-bit thành WAV. Browser chỉ phát file, không dùng Web Speech API. Nếu Record Audio bật, blob được upload riêng sau khi USER message commit; lỗi upload giữ blob để retry, transcript đã commit vẫn giữ. Cloudinary authenticated, key không ra DTO; candidate/recruiter có quyền chỉ đọc audio sau complete.

| Method | API mới | Ý nghĩa |
|---|---|---|
| POST | `/api/v1/ai-interviews/{id}/conversation/voice-ticket` | Ticket single-use |
| WebSocket | `/ws/interview-voice?ticket=...` | start/binary/end → transcript{text}/error{message} |
| POST | `/api/v1/ai-interviews/{id}/conversation/messages/{messageId}/speech` | WAV TTS cho tin AI |
| POST multipart | `/api/v1/ai-interviews/{id}/conversation/messages/{messageId}/recording` | Part file, lưu audio USER đã commit |
| GET | `/api/v1/ai-interviews/{id}/conversation/messages/{messageId}/recording` | Audio riêng tư sau complete |

Database V44: InterviewSession/InterviewMessage, message content và recording_key/mime/size nullable; consent vẫn dùng V40. UI `/interviews/:id` có chat, Micro/Dừng, trạng thái chuyển ngữ, textarea transcript và Nghe AI; Recruiter drawer có transcript/bản ghi. Unit kiểm tra chunk/tenant cleanup/ticket replay/size/container/STT/WAV; provider streaming/STT/TTS trả HTTP 200 bằng nội dung tổng hợp. Trạng thái `Doing`: cần migrate V44 và E2E micro thật trên tenant. Các phần dưới áp dụng engine legacy, tiếp tục browser STT và ai_answer_recordings cho snapshot cũ.

**Epic:** AI Interview System
**Trạng thái:** `Doing`
**Code ID:** `INT-02`

## Mục đích chức năng

STT chuyển giọng nói thành transcript; NLP/LLM dùng transcript để phỏng vấn thích ứng và chấm nội dung. Ghi âm và tín hiệu lời nói hỗ trợ Recruiter xem xét sau phiên.

## Actor

Candidate, Recruiter được phân quyền Job, System.

## Luồng hoạt động

1. Recruiter chọn Speech/Text, ngôn ngữ, Adaptive Questions, hỏi bồi, Record Audio và Speech Signals trong Communication.
2. Candidate đồng ý dùng micro/STT và lưu audio trước khi bắt đầu phiên voice.
3. Phòng hiển thị một câu chính; có thể bấm **Nghe câu hỏi** qua giọng đọc trình duyệt; Candidate bắt đầu micro. Trình duyệt STT hiển thị transcript tạm thời và thêm đoạn nhận dạng hoàn tất vào câu trả lời; MediaRecorder thu âm, Web Audio đo tín hiệu. UI hiển thị thời gian ghi âm và trạng thái có/chưa có tín hiệu lời nói.
4. Candidate dừng micro và kiểm tra hoặc sửa transcript. Nhập văn bản vẫn là phương án thay thế khi trình duyệt không hỗ trợ STT/micro.
5. Nếu bật Record Audio, gửi multipart `file` + JSON `answer` chứa transcript, duration, speechMetrics. Backend lưu object authenticated, xử lý câu trả lời và lưu metadata recording trong cùng transaction. Lỗi xử lý giữ câu trả lời chưa nộp để thử lại và dọn audio vừa upload.
6. NLP/LLM chấm bốn tiêu chí nội dung; hỏi bồi hoặc câu chính tiếp theo thích ứng từ câu trả lời. Mỗi câu chính có tối đa 0–3 hỏi bồi; tổng thời lượng dùng timer phiên.
7. Khi kết thúc, Recruiter xem transcript, bản ghi âm, chỉ số lời nói và phản hồi trong chi tiết phiên.

## Business Rules

- Hội thoại theo lượt; không stream audio hai chiều đến LLM. Không cam kết độ trễ từ provider miễn phí.
- STT phụ thuộc hỗ trợ của trình duyệt và quyền micro; micro cần HTTPS hoặc localhost. STT có thể dùng dịch vụ của trình duyệt.
- Khi STT thiếu hỗ trợ hoặc bị gián đoạn, ghi âm vẫn hoạt động nếu trình duyệt hỗ trợ; Candidate nhập/kiểm tra transcript trước khi gửi. Transcript tạm thời không tự coi là nội dung đã nhận dạng hoàn tất.
- WebM/Ogg/MP4, tối đa 9 MB/câu; kiểm tra MIME và chữ ký container. Không nhận object key do client tùy ý cung cấp.
- Speech Signals gồm thời lượng, voiced/silence milliseconds, khoảng dừng ≥ 600 ms, response latency và tốc độ từ/phút nói. Đo năng lượng micro là ước lượng; tiếng ồn và micro ảnh hưởng kết quả.
- Không giả lập chỉ số từ text, không dùng giọng/accent để suy ra tính cách, không tự cộng tín hiệu vào điểm nội dung.
- Audio Cloudinary authenticated; chỉ API backend kiểm tra tenant và quyền Job được phát audio sau phiên. Không trả public URL.

## API liên quan

| Method | Path | Ý nghĩa |
|---|---|---|
| POST | `/api/v1/ai-interviews/{id}/voice/consent` | Candidate consent |
| POST multipart | `/api/v1/ai-interviews/{id}/questions/{questionId}/audio-answer` | Gửi audio + transcript |
| PUT | `/api/v1/ai-interviews/{id}/questions/{questionId}/answer` | Text/transcript khi không lưu audio |
| GET | `/api/v1/ai-interviews/{id}/answers/{answerId}/recording/info` | Recruiter xem metadata |
| GET | `/api/v1/ai-interviews/{id}/answers/{answerId}/recording/audio` | Recruiter phát audio |

## Database liên quan

V42 thêm `ai_answers.speech_metrics_json` (JSON nullable), entity `AiAnswer` ánh xạ cùng thay đổi. `ai_answers.answer_text` lưu transcript đã kiểm tra; `ai_interview_consents`, `ai_answer_recordings` (V40) lưu consent/audio. `ai_feedbacks.evaluation_json` vẫn lưu `criteria`, `speechMetrics`, `wordsPerMinute` để tương thích báo cáo cũ. Không thêm bảng hoặc khóa ngoại.

API trả câu trả lời bổ sung `speechMetrics` kiểu object hoặc null; không lộ feedback/đáp án mẫu trong lúc làm bài. Recruiter xem thêm thời gian im lặng và tỷ lệ có tiếng nói, ưu tiên dữ liệu đã lưu trên câu trả lời; phiên cũ đọc metrics từ feedback.

## UI mockup

Candidate: consent → bắt đầu → ghi âm/STT → dừng và kiểm tra transcript → gửi. Recruiter: chi tiết Communication → đánh giá AI/tín hiệu lời nói → nghe bản ghi và mở transcript.

### Phòng demo (tách biệt phiên thật)

- Candidate: `/interviews` hiển thị lịch AI Interview mẫu; nút **Vào AI Interview** mở `/interviews/demo` trong phòng riêng, kế thừa theme tenant.
- Phòng mẫu theo thiết kế được cung cấp: đồng hồ 18:45/25:00, mở từ câu 03/06, câu hỏi, transcript, lộ trình, mức micro và hồ sơ ứng viên minh họa. Hai câu đầu có câu trả lời mẫu sẵn.
- Có tạm dừng/tiếp tục mô phỏng, đọc câu hỏi/transcript bằng giọng trình duyệt (nếu hỗ trợ), nhập văn bản, gửi sang câu tiếp theo và kết thúc/xem lại câu đã gửi. Hết giờ tự kết thúc phiên mẫu.
- Dữ liệu demo chỉ giữ trong bộ nhớ của phiên; tải lại sẽ đặt lại. Demo không thu âm, truy cập camera, gọi STT/API, đồng bộ hoặc chấm điểm thực tế. Phiên thật vẫn có luồng STT/ghi âm như mô tả ở trên.

## Trạng thái

`Doing` — code và kiểm thử đã có; cần kiểm thử micro/STT trên trình duyệt và Cloudinary/LLM thật ở môi trường có cấu hình. Streaming hai chiều nằm trong phạm vi mở rộng tương lai.
