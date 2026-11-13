# Dashboard Charts

**Epic:** Recruitment Analytics Dashboard  
**Trạng thái:** `Done`
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
| GET | `/api/v1/analytics/recruiter/job-overview` |
| GET | `/api/v1/analytics/recruiter/pipeline` |
| GET | `/api/v1/analytics/recruiter/quality` |
| GET | `/api/v1/analytics/recruiter/job-insights` |

Các endpoint `/api/v1/analytics/recruiter/*` nhận thêm `jobId` (optional trên `workload`/`pipeline`/`quality`/`performance`, bắt buộc trên `job-overview` và `job-insights`); khi có `jobId`, backend kiểm tra quyền xem job của actor qua `CvAccess.requireJob` (404 nếu không tồn tại/đã xóa, 403 nếu không được phân quyền). Pipeline trả đủ 7 vòng hoạt động (gồm `HUMAN_INTERVIEW`), `reachedCount`, `avgHoursInStage` (Time-in-Stage), và thống kê `dropOffs` (`REJECTED`, `FAILED`, `WITHDRAWN`). Quality trả thêm `scoreDistributions` cho `OVERALL`, `CV_MATCH`, `ASSESSMENT`, `AI_INTERVIEW`. `job-insights` bổ sung Skill Gap (`job_skills` vs `cv_skills`/`cv_analyses`), lý do loại/rút đơn, tổng hợp Proctoring (`proctor_reports`/`proctor_events`), và đánh giá phỏng vấn AI & chuyên môn.

## Database liên quan

- read models / SQL aggregate

## UI mockup

- Frontend Admin: `/internal/admin/analytics` — biểu đồ tổng hợp toàn tenant theo phạm vi quản trị.
- Frontend Recruiter: `/recruiter/jobs/{jobId}/analytics` — biểu đồ vận hành trong Job workspace đã chọn.
- Google Stitch: **Recruitment Analytics Dashboard / Dashboard Charts** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

DASH-01
