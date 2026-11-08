# Hiring Decision Management

**Epic:** Recruitment Workflow Management  
**Trạng thái:** `Doing`  
**Code ID:** `WF-03`

## Mục đích chức năng

Ghi nhận quyết định tuyển dụng (hire/reject/hold) + người duyệt, và cho ứng viên chấp nhận/từ chối offer.

## Actor

- Recruiter phụ trách Job (OWNER/PRIMARY_RECRUITER), Company Admin
- Candidate (phản hồi offer)
- System (thông báo web + email)

## Luồng hoạt động

1. Sau vòng phỏng vấn trực tiếp (`HUMAN_INTERVIEW`) hoặc khi đã có `OFFER`, recruiter mở hồ sơ ở `/recruiter/jobs/:id/applicants` → khối **Quyết định tuyển dụng**.
2. Chọn quyết định:
   - `HIRE`: `HUMAN_INTERVIEW` → `OFFER`, ứng viên nhận thông báo `APPLICATION_OFFER` (web + email). Nếu hồ sơ đã ở `OFFER` (ví dụ Lead Interviewer đã chốt đạt), chỉ ghi nhận người duyệt.
   - `REJECT`: → `REJECTED` (dùng luồng đóng hồ sơ hiện có, ứng viên nhận thông báo kết quả).
   - `HOLD`: không đổi trạng thái, chỉ lưu quyết định.
3. Ứng viên mở `/applications/:id`, khi trạng thái `OFFER` thấy khối phản hồi:
   - **Chấp nhận** → `HIRED` ngay.
   - **Từ chối** (lý do tùy chọn) → `WITHDRAWN`, `withdrawn_at`/`withdraw_reason` được ghi.
4. Người tạo Job và người phụ trách hồ sơ nhận thông báo `OFFER_ACCEPTED` / `OFFER_DECLINED` (web + email, tôn trọng cài đặt thông báo).

## Business Rules

- Chỉ người phụ trách Job (OWNER/PRIMARY_RECRUITER) hoặc Company Admin được ra quyết định (`CvAccess.requirePrimaryRecruiter`); recruiter chỉ được xem Job vẫn đọc được lịch sử quyết định.
- `HIRE` chỉ hợp lệ từ `HUMAN_INTERVIEW` hoặc `OFFER` → ngược lại `409 DECISION_NOT_ALLOWED`.
- `REJECT` và `HOLD` bắt buộc lý do → `400 DECISION_REASON_REQUIRED`.
- Hồ sơ đã `HIRED`/`REJECTED`/`FAILED`/`WITHDRAWN` hoặc đã lưu trữ không nhận quyết định mới → `409 APPLICATION_CLOSED`.
- Chỉ chính ứng viên phản hồi offer, và chỉ khi trạng thái `OFFER` → ngược lại `409 APPLICATION_NO_OFFER`.
- Quyết định của ứng viên không ghi vào `hiring_decisions` (cột `decided_by` là user nội bộ); nó nằm trong `application_status_history`.
- Thời gian chờ sau khi bị loại: **không áp dụng** (đã chốt bỏ).

## API liên quan

| Method | Path | Actor |
|---|---|---|
| POST | `/api/v1/applications/{id}/decisions` | Recruiter phụ trách / Admin |
| GET | `/api/v1/applications/{id}/decisions` | Staff có quyền xem Job |
| POST | `/api/v1/applications/{id}/offer-response` | Candidate |

Body `decisions`: `{ "decision": "HIRE|REJECT|HOLD", "reason": "≤2000 ký tự" }`.  
Body `offer-response`: `{ "accept": true|false, "reason": "≤255 ký tự" }` → trả `ApplicationDetail`.

## Database liên quan

- `hiring_decisions` (V2, entity `HiringDecision`) — không đổi schema.
- `applications`, `application_status_history`, `notifications`, `email_outbox` (purpose `APPLICATION_RESULT`).

## UI mockup

- Google Stitch: **Recruitment Workflow Management / Hiring Decision Management** — _[dán link]_
- Recruiter: `HiringDecisionPanel` trong panel hồ sơ ứng viên.
- Candidate: `OfferResponsePanel` trên trang chi tiết đơn.
- Icons: xem `DESIGN.md`

## Kiểm thử

- `HiringDecisionServiceTest`: HIRE → OFFER + thông báo, HIRE trên OFFER chỉ ghi nhận, HIRE sớm bị chặn, REJECT/HOLD cần lý do, hồ sơ đóng, candidate bị chặn, thông báo recruiter khi phản hồi.
- `ApplicantServiceTest`: chấp nhận → HIRED, từ chối → WITHDRAWN + lý do, không có offer → 409.
- Trạng thái `Doing` đến khi E2E trên tenant thật.

## Phụ thuộc

WF-02, RANK-03
