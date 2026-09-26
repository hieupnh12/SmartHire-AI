# AI Question Generation

**Epic:** AI Interview System  
**Trạng thái:** `To Do`  
**Code ID:** `INT-01`

## Mục đích chức năng

Sinh câu hỏi phỏng vấn theo JD + CV + level (RabbitMQ).

## Actor

- Recruiter, System

## Luồng hoạt động

1. `POST .../questions/generate` → queue `interview.questions`.
2. Lưu `interview_questions`.

## Business Rules

- Số câu giới hạn.
- Có thể edit trước khi start.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/interviews/{id}/questions/generate` |

## Database liên quan

- Model hiện hành: `ai_interviews`, `ai_questions` (FK `ai_interview_id`). Các bảng `legacy_v12_*` của model cũ đã bị V21 xóa cùng dữ liệu; không chuyển câu hỏi cũ sang model mới.

## UI mockup

- Google Stitch: **AI Interview System / AI Question Generation** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

JOB-05, CV-04
