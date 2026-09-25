# Auto Grading

**Epic:** FE-05 Online Technical Assessment  
**Trạng thái:** `Doing`
**Code ID:** `ASSESS-03`

## Mục đích chức năng

Tự chấm MCQ + coding; tổng điểm assessment.

## Actor

- System

## Luồng hoạt động

1. MCQ một đáp án đúng được chấm ngay khi submit hoặc khi truy cập lượt đã hết hạn.
2. Lưu điểm từng câu vào `answers.score`, đúng/sai vào `answers.is_correct`, tổng vào `submissions.score`.
3. Coding worker, regrade và tích hợp overall chưa triển khai trong bước này.

## Business Rules

- Deterministic grading.
- Đề đã publish không được sửa. Submit lặp trả kết quả cũ; không có API regrade trong bước hiện tại.
- Điểm thô: đúng nhận điểm câu, sai/bỏ trống nhận 0; candidate không được truyền điểm hoặc gọi API chấm riêng.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/submissions/{id}/submit` (candidate sở hữu) |
| GET | `/api/v1/submissions/{id}` (candidate sở hữu) |
| GET | `/api/v1/submissions/{id}/result` (staff) |

## Database liên quan

- `answers`, `submissions`, `questions`, `options` theo V12.

## UI mockup

- Google Stitch: **FE-05 Online Technical Assessment / Auto Grading** — _[dán link]_
- Icons: xem `DESIGN.md`
- Candidate xem điểm thô/tổng điểm, kết quả ngưỡng đạt và thời điểm nộp sau hoàn tất; không hiển thị đáp án đúng.

## Phụ thuộc

ASSESS-01, ASSESS-02
