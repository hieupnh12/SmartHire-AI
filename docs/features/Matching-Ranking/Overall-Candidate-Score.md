# Overall Candidate Score

**Epic:** Candidate-Job Matching & Ranking  
**Trạng thái:** `To Do`  
**Code ID:** `RANK-03`

## Mục đích chức năng

Tổng hợp điểm overall: CV match + assessment + interview (+ weights cấu hình).

## Actor

- Recruiter, System

## Luồng hoạt động

1. Aggregate khi từng cột điểm cập nhật.
2. Hiển thị trên applicant detail + ranking.

## Business Rules

- Weight cấu hình per job hoặc global.
- Missing component → partial score + flag.

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/applications/{id}/overall-score` |

## Database liên quan

- `overall_scores`

## UI mockup

- Google Stitch: **Candidate-Job Matching & Ranking / Overall Candidate Score** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

RANK-01, ASSESS-03, INT-04
