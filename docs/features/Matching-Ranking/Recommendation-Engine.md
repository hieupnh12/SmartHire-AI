# Recommendation Engine

**Epic:** Candidate-Job Matching & Ranking  
**Trạng thái:** `To Do`  
**Code ID:** `RANK-02`

## Mục đích chức năng

Gợi ý job cho candidate / gợi ý candidate cho recruiter.

## Actor

- Candidate, Recruiter, System

## Luồng hoạt động

1. Async `recommend.jobs` / `recommend.candidates`.
2. Lưu `recommendations` TTL Redis + MySQL.

## Business Rules

- Không recommend job CLOSED.
- Respect privacy settings.

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/recommendations/jobs` |
| GET | `/api/v1/jobs/{id}/recommendations/candidates` |

## Database liên quan

- `recommendations`

## UI mockup

- Google Stitch: **Candidate-Job Matching & Ranking / Recommendation Engine** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

RANK-01
