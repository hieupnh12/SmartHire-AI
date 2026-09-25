# Recruitment Pipeline

**Epic:** Recruitment Workflow Management  
**Trạng thái:** `Doing`  
**Code ID:** `WF-01`

## Mục đích chức năng

Luồng tuyển dụng theo job: Apply → sàng lọc CV → phỏng vấn AI → technical test (code + trắc nghiệm) → điểm tổng. Recruiter xem kết quả các vòng rồi quyết định phỏng vấn trực tiếp (online/offline). Kanban kéo-thả chưa làm.

## Actor

- Recruiter, Candidate, System (auto-advance khi CV đạt)

## Luồng hoạt động

1. Candidate apply; trạng thái `NEW` (Đã apply).
2. Recruiter/system sàng lọc CV (`IN_REVIEW`). Điểm ≥ 60 và không thiếu skill bắt buộc → `INTERVIEW` (phỏng vấn AI). Không tự reject nếu chưa đạt.
3. Sau phỏng vấn AI → `ASSESSMENT` (technical test). Module interview/test chưa triển khai.
4. Recruiter xem điểm các vòng (Matching / overall) rồi quyết định F2F / offer.

## Business Rules

- Không auto-reject khi CV chưa đạt.
- Recruiter list không gồm `WITHDRAWN`.

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/jobs/{id}/applications` |
| GET | `/api/v1/applications/me` |
| POST | `/api/v1/applications/{id}/status` |

## Database liên quan

- `applications.status`, `match_scores`

## UI mockup

- Frontend `/recruiter/jobs/{jobId}/pipeline`: preview Kanban 7 giai đoạn trong Job workspace, tìm kiếm, ngưỡng AI score, chế độ chi tiết/gọn, summary và drawer lưu trữ. `jobId` lấy từ URL, không chọn lại Job trong màn hình. Dữ liệu hiện là preview; chưa bật kéo-thả hoặc ghi trạng thái backend.
- Google Stitch: **Recruitment Workflow Management / Recruitment Pipeline** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

JOB-04, JOB-05, CV-05
