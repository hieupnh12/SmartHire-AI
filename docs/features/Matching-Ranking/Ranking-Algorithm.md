# Candidate Ranking Algorithm

**Epic:** Candidate-Job Matching & Ranking  
**Trạng thái:** `To Do`  
**Code ID:** `RANK-01`

## Mục đích chức năng

Xếp hạng applicants của một job theo nhiều tín hiệu (match, assessment, interview).

## Actor

- Recruiter, System

## Luồng hoạt động

1. `GET /api/v1/jobs/{id}/rankings`.
2. Tính/ cập nhật bảng xếp hạng khi có event score mới.
3. FE bảng sort theo rank.

## Business Rules

- Công thức versioned (`ranking_version`).
- Tie-break: updated_at / experience.

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/jobs/{id}/rankings` |
| POST | `/api/v1/jobs/{id}/rankings/recompute` |

## Database liên quan

- `candidate_rankings`

## UI mockup

- Google Stitch: **Candidate-Job Matching & Ranking / Candidate Ranking Algorithm** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

CV-05
