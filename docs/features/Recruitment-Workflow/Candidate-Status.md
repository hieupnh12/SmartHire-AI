# Candidate Status Management

**Epic:** Recruitment Workflow Management  
**Trạng thái:** `Done`  
**Code ID:** `WF-02`

## Mục đích chức năng

Status ứng viên: NEW, IN_REVIEW, ASSESSMENT, INTERVIEW (AI), HUMAN_INTERVIEW (người–người), OFFER, HIRED, REJECTED, FAILED, WITHDRAWN.

## Actor

- Recruiter, Candidate (withdraw)

## Luồng hoạt động

1. PATCH/POST status (`/applications/{id}/status`, `/reject`, `/withdraw`).
2. Ghi `application_status_history`.
3. Recruiter archive/restore; candidate theo dõi trên `/applications` (không gồm đơn đã rút).

## Business Rules

- Transition matrix hợp lệ.
- Reject/hired cần lý do optional.

## API liên quan

| Method | Path |
|---|---|
| PATCH | `/api/v1/applications/{id}/status` |
| GET | `/api/v1/applications/{id}/status-history` |

## Database liên quan

- `applications.status`, `application_status_history`

## UI mockup

- Google Stitch: **Recruitment Workflow Management / Candidate Status Management** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

WF-01

## Tích hợp AI Interview (2026-09-27)

- Chuyển sang `INTERVIEW` tạo lời mời AI Interview và notification cho candidate trong cùng transaction, không lặp lại nếu đã có phiên.
- CV screening tự động ghi lịch sử với `changed_by = NULL` (system); không yêu cầu SecurityContext của người dùng trong RabbitMQ worker. TenantContext vẫn bắt buộc.
- Thao tác chuyển vòng thủ công của recruiter sử dụng `POST /api/v1/applications/{id}/status`; API này cũng có thể tạo lời mời còn thiếu cho hồ sơ đã ở `INTERVIEW`.

## Trạng thái phỏng vấn trực tiếp (2026-10-07)

- Bổ sung `HUMAN_INTERVIEW` cho phỏng vấn người–người, tách khỏi `INTERVIEW` (phỏng vấn AI).
- Recruiter chuyển vòng qua API status hiện có hoặc bảng quy trình; UI hỗ trợ lọc và hiển thị trạng thái mới. Mỗi lần chuyển ghi `application_status_history`, không tạo lời mời AI khi chuyển sang `HUMAN_INTERVIEW`.
- DB lưu chuỗi `HUMAN_INTERVIEW` tại `applications.status` (VARCHAR(32)); không cần migration và không đổi dữ liệu cũ.

## Quy tắc ứng tuyển phía ứng viên (2026-10-12)

**Trạng thái:** `Done` (trừ thời gian chờ sau khi bị loại và ứng viên từ chối offer — `To Do`).

### Business Rules

1. **Một việc một lúc:** mỗi ứng viên chỉ có một đơn chưa kết thúc trong công ty (mọi trạng thái trừ `REJECTED`, `FAILED`, `WITHDRAWN`; `HIRED` cũng chặn). Nộp đơn khác trả `409 APPLICATION_ACTIVE_EXISTS`; recruiter tạo đơn thủ công cũng bị chặn. Kiểm tra dưới khoá hàng ứng viên để chống nộp đồng thời.
2. **Bị loại là hết cơ hội với job đó:** trượt vòng lọc CV (tự động hoặc recruiter quyết định) chuyển `REJECTED`; trượt AI Interview (hết lượt) là `FAILED`. Đơn `REJECTED`/`FAILED` không nộp lại được (`409 APPLICATION_CLOSED`) và recruiter không chuyển tiếp được; `restore` chỉ bỏ lưu trữ, không đổi trạng thái.
3. **Rút đơn:** chỉ khi `status ∈ {NEW, IN_REVIEW}` và `cv_screening_status = PENDING`; sau đó trả `409 APPLICATION_WITHDRAW_LOCKED`. Ứng viên chọn lý do (tuỳ chọn, ≤ 255 ký tự) lưu ở `withdraw_reason`. Đơn đã rút được nộp lại đúng job đó (reset kết quả lọc CV, xoá lý do rút).
4. **Đóng đơn tự động:** đơn ở `NEW`/`IN_REVIEW`/`ASSESSMENT`/`HUMAN_INTERVIEW` không đổi trong 30 ngày bị đóng `REJECTED` với lý do "quá thời hạn xử lý"; khi job bị xoá, mọi đơn chưa kết thúc bị đóng `REJECTED`. Chạy theo `ApplicationMaintenanceScheduler` (mặc định phút 15 mỗi giờ, từng tenant ACTIVE).
5. **Thông báo kết quả:** khi đơn thành `REJECTED`, ứng viên nhận thông báo web `APPLICATION_REJECTED` và email (`email_outbox.purpose = APPLICATION_RESULT`), tôn trọng cài đặt loại `APPLICATION`. Lý do gửi ứng viên là câu cố định theo ngữ cảnh, không lộ ghi chú nội bộ của recruiter.
6. **Lưu trữ CV:** khi đơn kết thúc, CV của đơn có hạn lưu 180 ngày (`cvs.retain_until`); quá hạn thì xoá file và nội dung trích xuất, giữ điểm số.
7. **Chống nhiều tài khoản:** số điện thoại được chuẩn hoá và không trùng giữa hai ứng viên (`409 PHONE_ALREADY_USED`).
8. **Xoá dữ liệu cá nhân:** ứng viên không còn đơn đang xét (trừ `HIRED`) có thể yêu cầu xoá: xoá file CV, liên kết Google, ẩn danh email/họ tên, khoá tài khoản. Đăng ký lại cùng email sẽ khôi phục tài khoản (lịch sử đơn cũ vẫn áp dụng quy tắc 2).

### API

| Method | Path | Ghi chú |
|---|---|---|
| POST | `/api/v1/applications/{id}/withdraw` | Body tuỳ chọn `{ "reason": "..." }` |
| DELETE | `/api/v1/tenant/auth/profile` | Ứng viên yêu cầu xoá dữ liệu cá nhân |

Response đơn bổ sung `withdrawable` (summary + detail) và `withdrawReason` (detail).

### Database

- V52: `applications.withdraw_reason`, index `idx_app_candidate_status`, `idx_app_status_updated`, `idx_cvs_retain_until`.
- Cấu hình: `APPLICATION_STALE_DAYS` (30), `APPLICATION_CV_RETENTION_DAYS` (180), `APPLICATION_MAINTENANCE_CRON`.

### UI

- Trang "Đơn ứng tuyển": hộp thoại rút đơn có chọn lý do; đơn đã qua lọc CV hiện gợi ý không thể rút; thêm nhãn/lọc `FAILED`.
- Trang tuyển dụng công ty: chặn nộp khi đang có đơn khác.
- Tài khoản ứng viên: mục "Xoá dữ liệu cá nhân".
- Pipeline recruiter: cột `FAILED`; đơn đã kết thúc không đổi trạng thái được.
