# Recruitment Statistics

**Epic:** Recruitment Analytics Dashboard  
**Trạng thái:** `Doing`
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

`summary` đếm trên bảng có sẵn, không cache Redis: `openJobs` là job `PUBLISHED` chưa xóa, `newApplicants` là đơn tạo trong 30 ngày (chưa lưu trữ, chưa rút), `interviewsScheduled` là lịch `PROPOSED` hoặc `CONFIRMED`. Candidate nhận 403. Hire rate và điểm trung bình chưa trả về.

## Database liên quan

- aggregates từ jobs/applications/scores; Redis cache

## UI mockup

- Frontend: `/internal/admin/analytics` — giao diện thống kê theo tab ngang, hiện dùng dữ liệu mẫu trong khi chờ API DASH-01/DASH-02.
- Google Stitch: **Recruitment Analytics Dashboard / Recruitment Statistics** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

WF-01
