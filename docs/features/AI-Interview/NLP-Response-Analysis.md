# NLP Response Analysis

**Epic:** AI Interview System  
**Trạng thái:** `To Do`  
**Code ID:** `INT-03`

## Mục đích chức năng

Phân tích ngữ nghĩa câu trả lời: relevance, depth, soft-skills signals.

## Actor

- System

## Luồng hoạt động

1. Sau STT → queue `interview.nlp`.
2. Lưu analysis JSON per answer.

## Business Rules

- Model versioned.
- Không expose raw prompt lỗi cho client.

## API liên quan

Nội bộ worker + `GET /api/v1/ai-interviews/{id}` (session detail; NLP analysis worker chưa gắn).

## Database liên quan

- Model hiện hành: câu trả lời ở `ai_answers`, phản hồi ở `ai_feedbacks`. Chưa có bảng phân tích NLP chuyên biệt thay thế `interview_answer_analyses`; bảng legacy đã bị V21 xóa cùng dữ liệu. Cần chốt schema phân tích khi triển khai worker.

## UI mockup

- Google Stitch: **AI Interview System / NLP Response Analysis** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

INT-02
