# CV Upload

**Epic:** AI-Powered CV Screening & Analysis  
**Trạng thái:** `Done`  
**Code ID:** `CV-01`

## Mục đích chức năng

Ứng viên nộp CV (PDF, DOC, DOCX) khi apply job đang tuyển. Recruiter không upload hộ; trang Sàng lọc CV chỉ đọc CV đã nộp.

## Actor

- Candidate (upload)
- Recruiter (xem / xóa CV trên job, không upload)

## Luồng hoạt động

1. Recruiter tạo và đăng job ở Quản lý tin tuyển.
2. Candidate tải CV ở **CV của tôi** (không chọn job). Khi apply: Xem chi tiết JD → Apply (chọn CV đã có, tải từ máy, hoặc sang trang CV của tôi).
3. Status `UPLOADED`.
4. Auto-enqueue parse; nếu RabbitMQ không chạy thì xử lý ngay trên request.
5. Recruiter/candidate có thể `DELETE /cvs/{id}` để gỡ CV test hoặc rút CV. Candidate xóa ngay trên danh sách **CV của tôi**.

## Business Rules

- MIME/size whitelist.
- Job phải PUBLISHED khi candidate apply.
- Apply bằng CV đã có: hệ thống tạo **bản sao CV riêng cho đơn đó** (`cvs.is_application_copy = TRUE`, file riêng), rồi parse → match theo JD của job. CV gốc trong kho và CV của các đơn trước không bị đổi, nên một CV nộp nhiều job thì mỗi job giữ điểm sàng lọc riêng. Bản sao không hiện trong **CV của tôi**.
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

- `cvs` (`storage_key`, `file_url`)

## Lưu file

- Chỉ **Cloudinary**. PDF: `resource_type=image`, public id `cv_{subdomain}_{cvId}`. DOC/DOCX: `raw`. Lưu `secure_url`. Xem qua `GET /api/v1/cvs/{id}/file` (URL public, nếu 401 thì tải bằng API có chữ ký). Xóa trên web gọi Cloudinary `destroy`. Gói Free: bật **Allow delivery of PDF and ZIP files** trong Cloudinary Security.
- Bắt buộc `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` trong `backend/.env`. Không ghi file CV xuống đĩa máy.

## UI mockup

- Google Stitch: **AI-Powered CV Screening & Analysis / CV Upload** — _[dán link]_
- Icons: xem `DESIGN.md`
- Trang candidate `/cv` (**Quản lý CV**, `candidate/cv/pages/MyCvPage.tsx`) dùng màu tenant từ career layout: header có thống kê tổng CV / đã phân tích / đang xử lý và liên kết `/cv-templates`; cột trái gồm vùng kéo thả hoặc chọn file (PDF, DOC, DOCX) và danh sách CV có badge trạng thái tiếng Việt; cột phải hiển thị chi tiết CV (xem trước file, thông tin trích xuất, tóm tắt AI, kỹ năng), banner khi đang xử lý hoặc lỗi, nút Phân tích/Phân tích lại và Xóa. CV đầu tiên được chọn tự động; xóa CV dùng `ConfirmDialog` dùng chung thay cho hộp thoại trình duyệt. Nút **Tạo CV mới** mở trình tạo CV; CV tạo bằng builder có thêm nút **Chỉnh sửa** (xem [CV-Builder](CV-Builder.md)).

## Phụ thuộc

JOB-05
