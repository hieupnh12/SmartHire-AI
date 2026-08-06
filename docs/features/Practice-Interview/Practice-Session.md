# Practice Interview Session

**Epic:** AI Practice Interview for Candidates  
**Trạng thái:** `To Do`  
**Code ID:** `PRACT-01`

## Mục đích chức năng

Candidate luyện phỏng vấn AI không gắn hiring decision (sandbox).

## Actor

- Candidate

## Luồng hoạt động

1. Chọn topic/job-like template.
2. Generate questions + voice/text answers.
3. Không ảnh hưởng ranking job thật.

## Business Rules

- Tách biệt `practice_sessions` vs `interviews`.
- Quota/ngày optional.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/practice/sessions` |
| POST | `/api/v1/practice/sessions/{id}/answers` |

## Database liên quan

- `practice_sessions`, `practice_answers`

## UI mockup

- Google Stitch: **AI Practice Interview for Candidates / Practice Interview Session** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

INT-01, INT-02
