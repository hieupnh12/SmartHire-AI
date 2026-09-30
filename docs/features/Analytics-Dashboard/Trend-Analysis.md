# Recruitment Trend Analysis

**Epic:** Recruitment Analytics Dashboard  
**Trạng thái:** `Done`
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
| GET | `/api/v1/analytics/recruiter/quality` |

## Database liên quan

- `candidate_quality_snapshots` lưu lịch sử điểm dạng append-only; dữ liệu được giới hạn theo recruiter hiện tại.

## UI mockup

- Frontend Admin: `/internal/admin/analytics` — xu hướng toàn doanh nghiệp.
- Frontend Recruiter: `/recruiter/jobs/{jobId}/analytics` — xu hướng chất lượng ứng viên và hiệu suất trong Job workspace đã chọn.
- Google Stitch: **Recruitment Analytics Dashboard / Recruitment Trend Analysis** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

DASH-01
