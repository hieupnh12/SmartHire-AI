# CV Upload

**Epic:** AI-Powered CV Screening & Analysis  
**Trạng thái:** `Done`  
**Code ID:** `CV-01`

## Mục đích chức năng

Ứng viên nộp CV (PDF/DOCX) khi apply job đang tuyển. Recruiter không upload hộ; trang Sàng lọc CV chỉ đọc CV đã nộp.

## Actor

- Candidate (upload)
- Recruiter (xem / xóa CV trên job, không upload)

## Luồng hoạt động

1. Recruiter tạo và đăng job ở Quản lý tin tuyển.
2. Candidate chọn job PUBLISHED → multipart upload → storage + `cvs`.
3. Status `UPLOADED`.
4. Auto-enqueue parse; nếu RabbitMQ không chạy thì xử lý ngay trên request.
5. Recruiter/candidate có thể `DELETE /cvs/{id}` để gỡ CV test hoặc rút CV.

## Business Rules

- MIME/size whitelist.
- Job phải PUBLISHED khi candidate apply.
- Recruiter/HR/Admin gọi `POST /cvs` → `403 CV_UPLOAD_CANDIDATE_ONLY`.
- Xóa: candidate chỉ CV của mình; recruiter xóa CV thuộc job mình quản lý (gỡ document/extraction/analysis/skills/match_score, tách interview/ranking_source).

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/cvs` (candidate) |
| DELETE | `/api/v1/cvs/{id}` |
| GET | `/api/v1/jobs/published` |
| GET | `/api/v1/jobs/options` |

## Database liên quan

- `cvs`

## UI mockup

- Google Stitch: **AI-Powered CV Screening & Analysis / CV Upload** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

JOB-05
