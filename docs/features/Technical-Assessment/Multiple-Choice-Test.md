# Multiple Choice Test

**Epic:** FE-05 Online Technical Assessment  
**Trạng thái:** `To Do`  
**Code ID:** `ASSESS-01`

## Mục đích chức năng

Tạo/làm bài trắc nghiệm kỹ thuật gắn job/stage.

## Actor

- Recruiter (tạo), Candidate (làm)

## Luồng hoạt động

1. Recruiter tạo bank câu hỏi + đề.
2. Candidate start attempt.
3. Submit answers.

## Business Rules

- Randomize order optional.
- 1 active attempt / assignment (policy).

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/assessments` |
| POST | `/api/v1/assessments/{id}/attempts` |
| POST | `/api/v1/attempts/{id}/answers` |

## Database liên quan

- `assessments`, `questions`, `question_options`, `attempts`, `attempt_answers`

## UI mockup

- Google Stitch: **FE-05 Online Technical Assessment / Multiple Choice Test** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

JOB-04
