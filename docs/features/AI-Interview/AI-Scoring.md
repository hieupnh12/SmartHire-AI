# AI Interview Scoring

**Epic:** AI Interview System  
**Trạng thái:** `To Do`  
**Code ID:** `INT-04`

## Mục đích chức năng

Chấm điểm session phỏng vấn AI tổng hợp.

## Actor

- Recruiter, System

## Luồng hoạt động

1. `POST .../score` → `interview.score`.
2. Lưu overall + breakdown.

## Business Rules

- Idempotent re-score.
- Cập nhật overall candidate score.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/interviews/{id}/score` |

## Database liên quan

- Model hiện hành: `ai_interviews.overall_score` và `ai_feedbacks.score` (FK qua `ai_answers`). Bảng điểm legacy đã bị V21 xóa cùng dữ liệu; chưa có bảng `interview_scores` trong model mới.

## UI mockup

- Google Stitch: **AI Interview System / AI Interview Scoring** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

INT-03
