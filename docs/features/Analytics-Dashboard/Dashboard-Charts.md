# Dashboard Charts

**Epic:** Recruitment Analytics Dashboard  
**Trạng thái:** `To Do`  
**Code ID:** `DASH-02`

## Mục đích chức năng

API dữ liệu biểu đồ (funnel, distribution scores, source).

## Actor

- Recruiter, Admin

## Luồng hoạt động

1. `GET /dashboard/charts?type=`.
2. FE render charts (theo DESIGN).

## Business Rules

- Giới hạn range ngày.
- Aggregation server-side.

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/dashboard/charts` |

## Database liên quan

- read models / SQL aggregate

## UI mockup

- Google Stitch: **Recruitment Analytics Dashboard / Dashboard Charts** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

DASH-01
