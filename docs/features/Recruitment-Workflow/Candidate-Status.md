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
