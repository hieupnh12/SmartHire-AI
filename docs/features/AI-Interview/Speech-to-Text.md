# Speech-to-Text và ghi âm Communication

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
3. Phòng hiển thị một câu chính; có thể bấm **Nghe câu hỏi** qua giọng đọc trình duyệt; Candidate bắt đầu micro. Trình duyệt STT tạo transcript, MediaRecorder thu âm, Web Audio đo tín hiệu.
4. Candidate dừng micro và kiểm tra hoặc sửa transcript. Nhập văn bản vẫn là phương án thay thế khi trình duyệt không hỗ trợ STT/micro.
5. Nếu bật Record Audio, gửi multipart `file` + JSON `answer` chứa transcript, duration, speechMetrics. Backend lưu object authenticated, xử lý câu trả lời và lưu metadata recording trong cùng transaction. Lỗi xử lý giữ câu trả lời chưa nộp để thử lại và dọn audio vừa upload.
6. NLP/LLM chấm bốn tiêu chí nội dung; hỏi bồi hoặc câu chính tiếp theo thích ứng từ câu trả lời. Mỗi câu chính có tối đa 0–3 hỏi bồi; tổng thời lượng dùng timer phiên.
7. Khi kết thúc, Recruiter xem transcript, bản ghi âm, chỉ số lời nói và phản hồi trong chi tiết phiên.

## Business Rules

- Hội thoại theo lượt; không stream audio hai chiều đến LLM. Không cam kết độ trễ từ provider miễn phí.
- STT phụ thuộc hỗ trợ của trình duyệt và quyền micro; micro cần HTTPS hoặc localhost. STT có thể dùng dịch vụ của trình duyệt.
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

Không thêm bảng/cột/migration: `ai_answers.answer_text`, `ai_interview_consents`, `ai_answer_recordings` (V40), `ai_feedbacks.evaluation_json` lưu `criteria`, `speechMetrics`, `wordsPerMinute`.

## UI mockup

Candidate: consent → bắt đầu → ghi âm/STT → dừng và kiểm tra transcript → gửi. Recruiter: chi tiết Communication → đánh giá AI/tín hiệu lời nói → nghe bản ghi và mở transcript.

### Phòng demo (tách biệt phiên thật)

- Candidate: `/interviews` hiển thị lịch AI Interview mẫu; nút **Vào AI Interview** mở `/interviews/demo` trong phòng riêng, kế thừa theme tenant.
- Phòng mẫu theo thiết kế được cung cấp: đồng hồ 18:45/25:00, mở từ câu 03/06, câu hỏi, transcript, lộ trình, mức micro và hồ sơ ứng viên minh họa. Hai câu đầu có câu trả lời mẫu sẵn.
- Có tạm dừng/tiếp tục mô phỏng, đọc câu hỏi/transcript bằng giọng trình duyệt (nếu hỗ trợ), nhập văn bản, gửi sang câu tiếp theo và kết thúc/xem lại câu đã gửi. Hết giờ tự kết thúc phiên mẫu.
- Dữ liệu demo chỉ giữ trong bộ nhớ của phiên; tải lại sẽ đặt lại. Demo không thu âm, truy cập camera, gọi STT/API, đồng bộ hoặc chấm điểm thực tế. Phiên thật vẫn có luồng STT/ghi âm như mô tả ở trên.

## Trạng thái

`Doing` — code và kiểm thử đã có; cần kiểm thử micro/STT trên trình duyệt và Cloudinary/LLM thật ở môi trường có cấu hình. Streaming hai chiều nằm trong phạm vi mở rộng tương lai.
