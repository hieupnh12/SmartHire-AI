# Candidate Status Management

**Epic:** Recruitment Workflow Management  
**Trạng thái:** `Done`  
**Code ID:** `WF-02`

## Mục đích chức năng

Status ứng viên: NEW, IN_REVIEW, ASSESSMENT, INTERVIEW, OFFER, HIRED, REJECTED, WITHDRAWN.

## Actor

- Recruiter, Candidate (withdraw)

## Luồng hoạt động

1. PATCH/POST status (`/applications/{id}/status`, `/reject`, `/withdraw`).
2. Ghi `application_status_history`.
3. Recruiter archive/restore; candidate theo dõi trên `/candidate/applications` (không gồm đơn đã rút).

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
