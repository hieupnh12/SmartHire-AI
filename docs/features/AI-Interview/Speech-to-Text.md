# Speech-to-Text Integration

**Epic:** AI Interview System  
**Trạng thái:** `To Do`  
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

- Google Stitch: **AI Interview System / Speech-to-Text Integration** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

INT-01
