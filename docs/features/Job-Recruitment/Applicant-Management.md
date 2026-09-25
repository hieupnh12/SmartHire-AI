# Applicant Management

**Epic:** Job Recruitment Management  
**Trạng thái:** `Done`  
**Code ID:** `JOB-05`

## Mục đích chức năng

Quản lý application theo job: apply từ candidate, lọc/phân trang, hồ sơ tổng hợp, CV nhiều phiên bản, nguồn/referral, tag/ghi chú/phụ trách, phát hiện trùng, rút đơn, reject/archive/restore, lịch sử, thời hạn lưu CV 24 tháng. Recruiter không tạo ứng viên thủ công.

## Actor

- Recruiter, Admin
- Candidate (apply, theo dõi, rút đơn, upload CV)

## Luồng hoạt động

1. Candidate apply `POST /jobs/{id}/applications` (career hoặc `/candidate/jobs`). Trùng job+email → `409 APPLICATION_EXISTS` (WITHDRAWN thì reopen).
2. Recruiter xem `GET /jobs/{id}/applications?q&status&source&archived&page&size` — không gồm hồ sơ đã rút đơn (`WITHDRAWN`).
3. Chi tiết `GET /applications/{id}`: profile, mọi phiên bản CV, lịch sử.
4. PATCH notes/tags/assignee/source/referral; reject/archive/restore; candidate withdraw.
5. Candidate theo dõi `GET /applications/me` (không gồm `WITHDRAWN`). Upload PDF/DOCX (≤10MB) tại `/candidate/cv`; recruiter chọn job → chọn ứng viên → xem file CV và `POST /cvs/{id}/parse` để phân tích AI theo JD.
6. Chi tiết application trả `rounds` (CV / phỏng vấn AI / bài kiểm tra) từ dữ liệu thật. CV đạt ngưỡng → chuyển `INTERVIEW` và gửi mail mời `/candidate/interviews`.
7. Recruiter bấm ứng viên trên danh sách → dialog hồ sơ (không còn panel chung trang). Sàng lọc CV cũng mở dialog.

## Business Rules

- 1 application / (job, candidate). Flag `duplicate` khi ứng viên có >1 application trên tenant.
- Recruiter chỉ job staff được truy cập.
- CV `retain_until` = 24 tháng; sau hạn `410 CV_EXPIRED`.
- Recruiter không `POST /cvs`.
- Recruiter không tạo ứng viên thủ công trên UI. List quản lý ứng viên không hiện `WITHDRAWN`.
- CV screening đạt → gửi một lần email mời phỏng vấn AI; không gửi lại nếu `ai_interview_invited_at` đã có.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/jobs/{id}/applications` |
| GET | `/api/v1/jobs/{id}/applications` |
| GET | `/api/v1/applications/me` |
| GET | `/api/v1/applications/{id}` |
| PATCH | `/api/v1/applications/{id}` |
| POST | `/api/v1/applications/{id}/status` · `/reject` · `/archive` · `/restore` · `/withdraw` |
| GET | `/api/v1/applications/{id}/history` |

## Database liên quan

- `applications` (+ referral, tags, assignee, archived_at, reject_reason, withdrawn_at, ai_interview_invited_at)
- `application_status_history`
- `email_outbox` (audit lời mời phỏng vấn AI)
- `cvs.retain_until`

## UI mockup

- Google Stitch: **Job Recruitment Management / Applicant Management** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

JOB-02, JOB-04, CV-01
