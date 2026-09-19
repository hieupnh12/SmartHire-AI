# Recruitment Trend Analysis

**Epic:** Recruitment Analytics Dashboard  
**Trạng thái:** `Doing`
**Code ID:** `DASH-03`

## Mục đích chức năng

Phân tích xu hướng theo thời gian (applications, hires, scores).

## Actor

- Recruiter, Admin

## Luồng hoạt động

1. `GET /dashboard/trends?from&to&granularity=`.
2. FE line/area charts.

## Business Rules

- Granularity day/week/month.
- Max window (vd 365d).

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/dashboard/trends` |

## Database liên quan

- time-series aggregates

## UI mockup

- Frontend Admin: `/internal/admin/analytics` — xu hướng toàn doanh nghiệp.
- Frontend Recruiter: `/recruiter/analytics` — xu hướng chất lượng ứng viên và hiệu suất cá nhân.
- Google Stitch: **Recruitment Analytics Dashboard / Recruitment Trend Analysis** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

DASH-01
