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

1. Candidate apply `POST /jobs/{id}/applications` tại `/jobs`. Trùng job+email → `409 APPLICATION_EXISTS` (WITHDRAWN thì reopen).
2. Recruiter xem `GET /api/v1/applications?jobId&q&status&source&archived&page&size`. Không chọn job thì trả mọi hồ sơ trong phạm vi job được phân công (admin thấy toàn tenant). Không gồm hồ sơ đã rút đơn (`WITHDRAWN`).
3. Chi tiết `GET /applications/{id}`: profile, mọi phiên bản CV, lịch sử.
4. PATCH notes/tags/assignee/source/referral; reject/archive/restore; candidate withdraw.
5. Candidate theo dõi `GET /applications/me` (không gồm `WITHDRAWN`). Upload PDF/DOCX (≤10MB) tại `/cv`; recruiter chọn job → chọn ứng viên → xem file CV và `POST /cvs/{id}/parse` để phân tích AI theo JD.
6. Chi tiết application trả `rounds` (CV / phỏng vấn AI / bài kiểm tra) từ dữ liệu thật. CV đạt ngưỡng → chuyển `INTERVIEW` và gửi mail mời `/interviews`.
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
| GET | `/api/v1/applications` |
| GET | `/api/v1/jobs/{id}/applications` |
| GET | `/api/v1/applications/me` |
| GET | `/api/v1/applications/{id}` |
| PATCH | `/api/v1/applications/{id}` |
| POST | `/api/v1/applications/{id}/status` · `/reject` · `/archive` · `/restore` · `/withdraw` |
| POST | `/api/v1/applications/{id}/cv-screening-decision` — recruiter cho qua / không đạt vòng CV (job `MANUAL`) |
| GET | `/api/v1/applications/{id}/history` |

## Database liên quan

- `applications` (+ referral, tags, assignee, archived_at, reject_reason, withdrawn_at, ai_interview_invited_at)
- `application_status_history`
- `email_outbox` (audit lời mời phỏng vấn AI)
- `cvs.retain_until`

## UI mockup

- Public viewer được xem danh sách và chi tiết job không cần đăng nhập; khi bấm ứng tuyển, người chưa đăng nhập được chuyển tới candidate login trước khi mở form CV.
- Candidate job list dùng `/applications/me` để hiển thị trạng thái đơn thật. Form ứng tuyển trên job detail tải toàn bộ CV đã lưu để candidate chọn một bản, hoặc cho tải PDF/DOC/DOCX mới; file mới được upload trước và `cvId` được gửi cùng request tạo application để liên kết đúng CV với đơn. Sau khi gửi thành công chuyển tới `/applications`.
- Trang `/applications` chỉ dùng dữ liệu của candidate hiện tại từ `/applications/me`, loại đơn `WITHDRAWN`, hỗ trợ tìm theo vị trí/phòng ban/địa điểm và lọc trạng thái. Mỗi thẻ hiển thị metadata job, ngày ứng tuyển, trạng thái và pipeline; trang `/applications/{id}` tải chi tiết thật từ API, gồm các vòng CV/AI interview/assessment và lịch sử trạng thái, không dùng dữ liệu mock.
- Tenant Admin xem job `PUBLISHED` và danh sách ứng viên tại `/internal/admin/recruitment` (chỉ xem).
- Từ Dashboard, recruiter bấm **Ứng viên mới** để mở panel nhóm hồ sơ `NEW` theo job. Chọn job mở `/recruiter/jobs/{jobId}/applicants?view=board`; chọn ứng viên thêm `applicationId` để mở đúng hồ sơ trên Bảng quy trình. Trang `/recruiter/applicants` vẫn là danh sách tổng hợp khi recruiter chủ động mở module Ứng viên, không còn là đích điều hướng của thẻ việc cần xử lý.
- Google Stitch: **Job Recruitment Management / Applicant Management** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

JOB-02, JOB-04, CV-01

## Trạng thái phỏng vấn trực tiếp (2026-10-07)

- Bổ sung `HUMAN_INTERVIEW` cho phỏng vấn người–người, tách khỏi `INTERVIEW` (phỏng vấn AI).
- Recruiter chuyển vòng qua API status hiện có hoặc bảng quy trình; UI hỗ trợ lọc và hiển thị trạng thái mới. Mỗi lần chuyển ghi `application_status_history`, không tạo lời mời AI khi chuyển sang `HUMAN_INTERVIEW`.
- DB lưu chuỗi `HUMAN_INTERVIEW` tại `applications.status` (VARCHAR(32)); không cần migration và không đổi dữ liệu cũ.
