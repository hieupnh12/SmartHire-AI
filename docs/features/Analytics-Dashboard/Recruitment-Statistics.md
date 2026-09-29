# Recruitment Statistics

**Epic:** Recruitment Analytics Dashboard  
**Trạng thái:** `Done`
**Code ID:** `DASH-01`

## Mục đích chức năng

KPI: open jobs, applicants, hire rate, avg time-to-hire, avg scores.

## Actor

- Recruiter, Admin

## Luồng hoạt động

1. Recruiter gọi `GET /analytics/recruiter/workload` hoặc `GET /analytics/recruiter/performance` với `from`, `to`.
2. Backend lấy recruiter từ phiên đăng nhập và giới hạn dữ liệu theo job/application được phân công.

## Business Rules

- Scope theo org.
- Candidate 403.

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/dashboard/summary` |
| GET | `/api/v1/dashboard/action-items` |
| GET | `/api/v1/analytics/recruiter/workload` |
| GET | `/api/v1/analytics/recruiter/performance` |

`summary` đếm trên bảng có sẵn, không cache Redis: `openJobs` là job `PUBLISHED` chưa xóa, `newApplicants` là đơn tạo trong 30 ngày (chưa lưu trữ, chưa rút), `interviewsScheduled` là lịch `PROPOSED` hoặc `CONFIRMED`. Candidate nhận 403. Hire rate và điểm trung bình chưa trả về.

## Database liên quan

- aggregates từ jobs/applications/scores; Redis cache

## UI mockup

- Frontend Recruiter: `/recruiter` — dashboard hai cột gồm "Việc cần xử lý" và job feed mở rộng. Các KPI tổng hợp nằm phía trên job feed; không hiển thị thêm panel phân tích bên phải để tránh lặp lại cùng dữ liệu. Báo cáo chi tiết được xem trong Job workspace đã chọn tại `/recruiter/jobs/{jobId}/analytics`.
- Các mục "Việc cần xử lý" mở trang danh sách trong cùng tab và áp dụng sẵn bộ lọc qua query string: ứng viên mới, CV chờ sàng lọc, lịch sắp tới, job nháp và job sắp hết hạn. Trang đích dùng tiêu đề gọn và nhãn bộ lọc, không lặp breadcrumb hoặc đoạn hướng dẫn dài. Thanh ngữ cảnh "Việc cần xử lý · Tổng hợp mọi vị trí" thay thanh module Job và cho phép chuyển trực tiếp giữa năm hàng đợi. Hàng đợi tổng hợp tự hiển thị dữ liệu của mọi job, không yêu cầu recruiter chọn job trước.
- Điều hướng bàn phím tại job feed: từ ô tìm kiếm job nhấn `↓` để vào card đầu tiên, dùng `↑`/`↓` để chuyển card và `Enter` để mở workspace của job đang focus.
- Dashboard áp dụng graceful degradation: lỗi action-items, summary, job feed hoặc danh sách phòng ban chỉ ảnh hưởng vùng tương ứng; vùng còn lại tiếp tục hoạt động và mỗi vùng lỗi có thao tác thử lại riêng.
- Frontend: `/internal/admin/analytics` — giao diện thống kê theo tab ngang, hiện dùng dữ liệu mẫu trong khi chờ API DASH-01/DASH-02.
- Google Stitch: **Recruitment Analytics Dashboard / Recruitment Statistics** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

WF-01
