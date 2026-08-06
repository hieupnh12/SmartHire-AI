# AI Feedback Generation

**Epic:** AI Practice Interview for Candidates  
**Trạng thái:** `To Do`  
**Code ID:** `PRACT-02`

## Mục đích chức năng

Sinh feedback luyện tập sau session (async).

## Actor

- Candidate, System

## Luồng hoạt động

1. Queue `practice.feedback`.
2. Lưu feedback + tips.

## Business Rules

- Tone constructive.
- Không lộ đáp án ideal nguyên văn nếu policy.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/practice/sessions/{id}/feedback` |
| GET | `/api/v1/practice/sessions/{id}/feedback` |

## Database liên quan

- `practice_feedbacks`

## UI mockup

- Google Stitch: **AI Practice Interview for Candidates / AI Feedback Generation** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

PRACT-01
