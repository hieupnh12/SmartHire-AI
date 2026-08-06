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

Nội bộ worker + `GET /api/v1/interviews/{id}` gồm analysis.

## Database liên quan

- `interview_answer_analyses`

## UI mockup

- Google Stitch: **AI Interview System / NLP Response Analysis** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

INT-02
