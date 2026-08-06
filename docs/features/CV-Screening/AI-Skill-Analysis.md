# AI Skill Analysis

**Epic:** AI-Powered CV Screening & Analysis  
**Trạng thái:** `To Do`  
**Code ID:** `CV-04`

## Mục đích chức năng

AI phân tích skill/level từ CV so với taxonomy skills.

## Actor

- System, Recruiter

## Luồng hoạt động

1. Queue `cv.analysis`.
2. Skill list + confidence → `cv_skills` / `cv_analyses`.

## Business Rules

- Redis lock chống double-run.
- Lưu `model_version`.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/cvs/{id}/analyze` |

## Database liên quan

- `cv_analyses`, `cv_skills`

## UI mockup

- Google Stitch: **AI-Powered CV Screening & Analysis / AI Skill Analysis** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

CV-03
