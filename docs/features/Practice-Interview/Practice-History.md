# Practice History Management

**Epic:** AI Practice Interview for Candidates  
**Trạng thái:** `To Do`  
**Code ID:** `PRACT-03`

## Mục đích chức năng

Xem lịch sử luyện tập, điểm, tiến bộ theo thời gian.

## Actor

- Candidate

## Luồng hoạt động

1. `GET /practice/sessions`.
2. Detail + feedback.
3. Optional progress chart.

## Business Rules

- Chỉ owner xem.
- Soft delete history.

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/practice/sessions` |
| GET | `/api/v1/practice/sessions/{id}` |
| DELETE | `/api/v1/practice/sessions/{id}` |

## Database liên quan

- `practice_sessions`

## UI mockup

- Google Stitch: **AI Practice Interview for Candidates / Practice History Management** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

PRACT-02
