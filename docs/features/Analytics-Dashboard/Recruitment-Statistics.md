# Recruitment Statistics

**Epic:** Recruitment Analytics Dashboard  
**Trạng thái:** `To Do`  
**Code ID:** `DASH-01`

## Mục đích chức năng

KPI: open jobs, applicants, hire rate, avg time-to-hire, avg scores.

## Actor

- Recruiter, Admin

## Luồng hoạt động

1. `GET /dashboard/summary`.
2. Redis cache + invalidate by events.

## Business Rules

- Scope theo org.
- Candidate 403.

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/dashboard/summary` |

## Database liên quan

- aggregates từ jobs/applications/scores; Redis cache

## UI mockup

- Google Stitch: **Recruitment Analytics Dashboard / Recruitment Statistics** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

WF-01
