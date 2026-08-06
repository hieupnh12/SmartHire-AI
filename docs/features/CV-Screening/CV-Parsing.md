# CV Parsing

**Epic:** AI-Powered CV Screening & Analysis  
**Trạng thái:** `To Do`  
**Code ID:** `CV-02`

## Mục đích chức năng

Parse file CV thành text/structured blocks (async RabbitMQ).

## Actor

- System worker

## Luồng hoạt động

1. Queue `cv.parse`.
2. Extract text → `cv_documents`.
3. Status `PARSED` / `PARSE_FAILED`.

## Business Rules

- Idempotent theo cvId.
- DLQ khi fail.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/cvs/{id}/parse` |
| GET | `/api/v1/cvs/{id}` |

## Database liên quan

- `cvs`, `cv_documents`

## UI mockup

- Google Stitch: **AI-Powered CV Screening & Analysis / CV Parsing** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

CV-01
