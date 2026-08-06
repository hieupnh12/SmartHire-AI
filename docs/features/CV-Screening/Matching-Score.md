# Candidate Matching Score

**Epic:** AI-Powered CV Screening & Analysis  
**Trạng thái:** `To Do`  
**Code ID:** `CV-05`

## Mục đích chức năng

Tính điểm khớp CV ↔ Job (skills weighted + experience).

## Actor

- Recruiter, System

## Luồng hoạt động

1. Queue `cv.matching` hoặc sync nếu nhẹ.
2. Lưu `match_scores` + Redis cache.

## Business Rules

- Cần CV analyzed + job skills.
- Score 0–100 + breakdown.

## API liên quan

| Method | Path |
|---|---|
| GET/POST | `/api/v1/jobs/{jobId}/cvs/{cvId}/match` |

## Database liên quan

- `match_scores`

## UI mockup

- Google Stitch: **AI-Powered CV Screening & Analysis / Candidate Matching Score** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

CV-04, JOB-03
