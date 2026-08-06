# Timer Control

**Epic:** FE-05 Online Technical Assessment  
**Trạng thái:** `To Do`  
**Code ID:** `ASSESS-04`

## Mục đích chức năng

Giới hạn thời gian làm bài; server là nguồn sự thật.

## Actor

- Candidate, System

## Luồng hoạt động

1. Start → `started_at` + duration.
2. FE countdown từ server remaining.
3. Auto-submit khi hết giờ.

## Business Rules

- Không tin timer client.
- Clock skew tolerance nhỏ.

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/attempts/{id}/timer` |
| POST | `/api/v1/attempts/{id}/submit` |

## Database liên quan

- `attempts.started_at`, `duration_seconds`, `submitted_at`

## UI mockup

- Google Stitch: **FE-05 Online Technical Assessment / Timer Control** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

ASSESS-01
