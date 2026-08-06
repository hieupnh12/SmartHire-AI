# Coding Challenge

**Epic:** FE-05 Online Technical Assessment  
**Trạng thái:** `To Do`  
**Code ID:** `ASSESS-02`

## Mục đích chức năng

Bài coding: đề, nộp code, chạy test cases (sandbox/worker).

## Actor

- Recruiter, Candidate, System grader

## Luồng hoạt động

1. Candidate submit source.
2. Queue `assessment.code.grade`.
3. Chạy test → kết quả.

## Business Rules

- Timeout/memory limit.
- Không tin tưởng client-side grade.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/attempts/{id}/coding-submissions` |
| GET | `/api/v1/coding-submissions/{id}` |

## Database liên quan

- `coding_problems`, `test_cases`, `coding_submissions`

## UI mockup

- Google Stitch: **FE-05 Online Technical Assessment / Coding Challenge** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

ASSESS-01
