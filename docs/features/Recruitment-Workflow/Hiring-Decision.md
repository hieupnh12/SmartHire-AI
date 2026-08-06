# Hiring Decision Management

**Epic:** Recruitment Workflow Management  
**Trạng thái:** `To Do`  
**Code ID:** `WF-03`

## Mục đích chức năng

Ghi nhận quyết định tuyển dụng (hire/reject/hold) + approver.

## Actor

- Recruiter, Admin

## Luồng hoạt động

1. Submit decision form.
2. Lock application terminal state.
3. Analytics + email.

## Business Rules

- Terminal states không reopen trừ Admin.
- Cần quyền quyết định.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/applications/{id}/decisions` |
| GET | `/api/v1/applications/{id}/decisions` |

## Database liên quan

- `hiring_decisions`

## UI mockup

- Google Stitch: **Recruitment Workflow Management / Hiring Decision Management** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

WF-02, RANK-03
