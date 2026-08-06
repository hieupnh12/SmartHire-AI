# Information Extraction

**Epic:** AI-Powered CV Screening & Analysis  
**Trạng thái:** `To Do`  
**Code ID:** `CV-03`

## Mục đích chức năng

Trích xuất thông tin có cấu trúc: education, experience, contacts, certifications.

## Actor

- System (AI)
- Recruiter (xem)

## Luồng hoạt động

1. Sau parse → queue `cv.extract`.
2. Lưu JSON structured vào `cv_extractions`.

## Business Rules

- Không overwrite manual edits trừ khi re-run có flag.
- PII chỉ role được phép xem.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/cvs/{id}/extract` |
| GET | `/api/v1/cvs/{id}/extraction` |

## Database liên quan

- `cv_extractions`

## UI mockup

- Google Stitch: **AI-Powered CV Screening & Analysis / Information Extraction** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

CV-02
