# CV Upload

**Epic:** AI-Powered CV Screening & Analysis  
**Trạng thái:** `To Do`  
**Code ID:** `CV-01`

## Mục đích chức năng

Upload CV (PDF/DOCX) gắn application/job.

## Actor

- Candidate, Recruiter

## Luồng hoạt động

1. Multipart upload → storage + `cvs`.
2. Status `UPLOADED`.
3. Optional auto-enqueue parse.

## Business Rules

- MIME/size whitelist.
- Job phải PUBLISHED khi candidate apply.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/cvs` |

## Database liên quan

- `cvs`

## UI mockup

- Google Stitch: **AI-Powered CV Screening & Analysis / CV Upload** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

JOB-05
