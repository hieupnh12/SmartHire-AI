# NLP Response Analysis

## Phiên Conversation mới (2026-10-03)

Đối thoại và đánh giá được tách: mỗi lượt chỉ dùng Gemini native streaming để phản hồi/hỏi tiếp từ lịch sử InterviewMessage. Không gọi NLP grading hoặc rubric trước trong đường này. Sau complete/hết hạn, worker INTERVIEW_NLP gửi toàn transcript và snapshot để đánh giá bốn tiêu chí, xác minh trích dẫn từ USER message và tổng hợp report POST_SESSION. Model/key native theo Configuration Guide. Phiên không có `conversationVersion=1` tiếp tục luồng từng câu dưới đây; không backfill lịch sử. Trạng thái `Doing`, cần E2E tenant thật trước Done.

**Epic:** AI Interview System  
**Trạng thái:** `Doing`
**Code ID:** `INT-03`

## Mục đích chức năng

Phân tích nội dung transcript trong quy trình Communication theo bốn tiêu chí: kiến thức chuyên môn, giải quyết vấn đề, lập luận và giao tiếp. Spring AI tích hợp Gemini; backend kiểm tra bằng chứng và tính điểm.

## Actor

- Candidate (gửi transcript), System (phân tích), Recruiter (xem kết quả).

## Luồng hoạt động

1. Candidate gửi transcript đã kiểm tra qua API text hoặc multipart audio-answer của phiên hiện tại.
2. Process Engine V2 gọi Spring AI `ChatClient` theo cấu hình `INTERVIEW_NLP`, gửi câu hỏi, transcript, rubric và cấu hình Communication. Chấm từng câu trong luồng lưu câu trả lời hiện hành; không tạo queue `interview.nlp` mới.
3. Gemini trả điểm từng ý chính và bốn tiêu chí kèm evidence. Backend yêu cầu evidence có thật trong transcript; bằng chứng không có nhận 0, dữ liệu lỗi làm tác vụ thất bại.
4. Lưu điểm/nhận xét vào `ai_feedbacks`; sinh hỏi bồi/câu tiếp theo qua `INTERVIEW_GEN` theo snapshot, số câu và giới hạn đã cấu hình.
5. Kết thúc phiên, tổng hợp báo cáo; Recruiter xem transcript, phản hồi và tín hiệu lời nói tham khảo.

## Business Rules

- Tách tác vụ sinh và chấm; key DB admin được ưu tiên, fallback key Interview riêng ở backend.
- Không expose raw prompt lỗi cho client.
- Không chấm giọng/accent/tính cách; tín hiệu lời nói không tự cộng điểm nội dung. Không lấy nội dung CV chưa được ứng viên trả lời làm bằng chứng chấm.
- Retry tối đa 3 lượt gọi cho HTTP 429/502/503/504; lỗi xác thực/JSON/rubric không retry. Lỗi provider không quy thành lỗi năng lực ứng viên.
- Giữ format Communication và chính sách ẩn feedback khi candidate đang làm bài.

## API liên quan

`PUT /api/v1/ai-interviews/{id}/questions/{questionId}/answer`, `POST .../audio-answer`, `GET /api/v1/ai-interviews/{id}`. Sinh phiên/tổng hợp cuối phiên tiếp tục dùng worker hiện có, mang `X-Tenant-ID` và thiết lập `TenantContext`.

## Database liên quan

- `ai_answers.answer_text`, `speech_metrics_json` (V42); `ai_questions.rubric_json`; `ai_feedbacks.score`, `evaluation_json` (criteria/keyPoints/feedback/speechMetrics); `ai_interviews.report_json`. Không thêm bảng NLP riêng.

## UI mockup

- Giữ phòng Communication hiện hành: STT/ghi âm → kiểm tra transcript → gửi → chấm và chuẩn bị câu kế tiếp. Recruiter xem report bốn tiêu chí, nhận xét, transcript và tín hiệu lời nói trong drawer chi tiết; dùng token/icon từ `DESIGN.md`.

## Phụ thuộc

INT-02

## Trạng thái triển khai

`Doing` — tích hợp Spring AI và kiểm thử mô phỏng provider đã có; cần kiểm thử Gemini, micro/STT, Cloudinary và migration trên môi trường thực tế.
