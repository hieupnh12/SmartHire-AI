# CV Parsing

**Epic:** AI-Powered CV Screening & Analysis  
**Trạng thái:** `Done`  
**Code ID:** `CV-02`

## Mục đích chức năng

Parse file CV thành text, recruiter xem được PDF đã upload. Nút sàng lọc gọi Gemini (hoặc heuristic) đánh giá so với JD của đúng job đó.

## Actor

- System worker
- Recruiter (nút Phân tích CV)

## Luồng hoạt động

1. Queue `cv.parse` khi upload (nếu RabbitMQ sống).
2. Extract text → `cv_documents`.
3. Status `PARSED` / `FAILED`.
4. `POST /cvs/{id}/parse` chạy parse → extract → analyze → match trên request và trả `CvDetail`.
5. Gemini nếu có `GEMINI_API_KEY` (biến môi trường, Spring không tự đọc `.env`); không có key thì `heuristic-v1`.
6. Prompt extract gửi kèm title + `job_skills` của tin ứng viên đã nộp; cấm invent skill.

## Business Rules

- Idempotent theo cvId.
- DLQ khi fail trên worker.
- Không cần Gemini để ra skill/điểm trên môi trường local.

## API liên quan

| Method | Path | Ghi chú |
|---|---|---|
| POST | `/api/v1/cvs/{id}/parse` | 200 `CvDetail` (pipeline đồng bộ) |
| GET | `/api/v1/cvs/{id}` | |

## Database liên quan

- `cvs`, `cv_documents`

## UI mockup

- Google Stitch: **AI-Powered CV Screening & Analysis / CV Parsing** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

CV-01
