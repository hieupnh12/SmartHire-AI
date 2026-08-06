# Anti-cheating Detection

**Epic:** FE-05 Online Technical Assessment  
**Trạng thái:** `To Do`  
**Code ID:** `ASSESS-05`

## Mục đích chức năng

Ghi nhận tín hiệu gian lận (tab blur, paste, multi-focus) và gắn risk score.

## Actor

- System, Recruiter (xem)

## Luồng hoạt động

1. FE gửi events `POST /attempts/{id}/proctor-events`.
2. BE aggregate risk.
3. Recruiter xem báo cáo.

## Business Rules

- Events append-only.
- Risk không auto-fail trừ khi policy bật.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/attempts/{id}/proctor-events` |
| GET | `/api/v1/attempts/{id}/proctor-report` |

## Database liên quan

- `proctor_events`, `proctor_reports`

## UI mockup

- Google Stitch: **FE-05 Online Technical Assessment / Anti-cheating Detection** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

ASSESS-01
