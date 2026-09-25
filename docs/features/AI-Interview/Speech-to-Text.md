# Speech-to-Text Integration

**Epic:** AI Interview System  
**Trạng thái:** `Doing`
**Code ID:** `INT-02`

## Mục đích chức năng

Chuyển audio câu trả lời thành transcript để NLP scoring.

## Actor

- Candidate, System

## Luồng hoạt động

1. Upload/stream audio.
2. Queue `interview.stt`.
3. Lưu transcript.

## Business Rules

- Ngôn ngữ cấu hình (vi/en).
- Giữ audio URL + transcript.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/interviews/{id}/voice` |

## Database liên quan

- `interview_answers.audio_url`, `transcript`

## UI mockup

- Candidate: `/candidate/interviews` hiển thị lịch AI Interview mẫu; nút **Vào AI Interview** mở `/candidate/interviews/demo` trong phòng riêng, kế thừa theme tenant.
- Phòng mẫu theo thiết kế được cung cấp: đồng hồ 18:45/25:00, mở từ câu 03/06, câu hỏi, transcript, lộ trình, mức micro và hồ sơ ứng viên minh họa. Hai câu đầu có câu trả lời mẫu sẵn.
- Có tạm dừng/tiếp tục mô phỏng, đọc câu hỏi/transcript bằng giọng trình duyệt (nếu hỗ trợ), nhập văn bản, gửi sang câu tiếp theo và kết thúc/xem lại câu đã gửi. Hết giờ tự kết thúc phiên mẫu.
- Dữ liệu chỉ giữ trong bộ nhớ của phiên; tải lại sẽ đặt lại. Chưa thu âm, truy cập camera, gọi STT/API, đồng bộ hoặc chấm điểm thực tế. Trạng thái `Doing` chỉ phản ánh phần UI mẫu, tích hợp STT chưa hoàn tất.

- Google Stitch: **AI Interview System / Speech-to-Text Integration** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

INT-01
