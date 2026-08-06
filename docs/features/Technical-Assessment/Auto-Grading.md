# Auto Grading

**Epic:** FE-05 Online Technical Assessment  
**Trạng thái:** `To Do`  
**Code ID:** `ASSESS-03`

## Mục đích chức năng

Tự chấm MCQ + coding; tổng điểm assessment.

## Actor

- System

## Luồng hoạt động

1. MCQ chấm ngay khi submit.
2. Coding chờ worker.
3. Cập nhật `attempt_scores` → overall.

## Business Rules

- Deterministic grading.
- Regrade khi sửa đáp án (audit).

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/attempts/{id}/grade` |
| GET | `/api/v1/attempts/{id}/score` |

## Database liên quan

- `attempt_scores`

## UI mockup

- Google Stitch: **FE-05 Online Technical Assessment / Auto Grading** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

ASSESS-01, ASSESS-02
