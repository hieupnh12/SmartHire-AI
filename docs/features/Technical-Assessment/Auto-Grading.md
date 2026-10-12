# Auto Grading

**Epic:** FE-05 Online Technical Assessment  
**Trạng thái:** `Doing`
**Code ID:** `ASSESS-03`

## Mục đích chức năng

Tự chấm MCQ + coding; tổng điểm assessment.

## Actor

- System

## Luồng hoạt động

1. MCQ và MULTIPLE_CHOICE được chấm khi submit hoặc khi truy cập lượt hết hạn; nhiều đáp án cần chọn chính xác toàn bộ tập đáp án đúng (không điểm một phần).
2. Lưu điểm từng câu vào `answers.score`, đúng/sai vào `answers.is_correct`, tổng vào `submissions.score`.
3. Bài có ESSAY: lưu nội dung, để điểm câu/đúng-sai tự luận NULL, tổng điểm/passed NULL; SUBMITTED chờ chấm hoặc EXPIRED nếu hết hạn. Chưa có endpoint chấm tự luận, coding worker, regrade và tích hợp overall.

## Business Rules

- Deterministic grading.
- Đề đã publish không được sửa. Submit lặp trả kết quả cũ; không có API regrade trong bước hiện tại.
- Điểm thô: đúng nhận điểm câu, sai/bỏ trống nhận 0; candidate không được truyền điểm hoặc gọi API chấm riêng.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/submissions/{id}/submit_test` (candidate sở hữu) |
| GET | `/api/v1/submissions/{id}/get_submission` (candidate sở hữu) |
| GET | `/api/v1/submissions/{id}/get_result` (staff) |

## Database liên quan

- `answers`, `submissions`, `questions`, `options` theo V12.

## UI mockup

- Google Stitch: **FE-05 Online Technical Assessment / Auto Grading** — _[dán link]_
- Icons: xem `DESIGN.md`
- Candidate xem điểm thô/tổng điểm, kết quả ngưỡng đạt và thời điểm nộp sau hoàn tất; không hiển thị đáp án đúng.
- Màn hình kết quả dùng thẻ căn giữa, khối điểm nổi bật, nhãn đạt/chưa đạt, thời gian nộp và liên kết quay lại bài kiểm tra; các khối xếp dọc trên mobile. Bài chưa có điểm hiển thị “Đang chấm”, bài không có ngưỡng chỉ hiển thị “Đã chấm điểm”.

## Phụ thuộc

ASSESS-01, ASSESS-02
