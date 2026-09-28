# Recruitment Stage Management

**Epic:** Job Recruitment Management  
**Trạng thái:** `Done`  
**Code ID:** `JOB-04`

## Mục đích chức năng

Định nghĩa pipeline stages cho từng job (Applied → Screening → Assessment → Interview → Offer → Hired).

## Actor

- Recruiter, Admin

## Luồng hoạt động

1. Mỗi job có đúng 6 giai đoạn catalog (mã `stage_code`: APPLIED … HIRED).
2. Primary Recruiter / Tenant Admin kéo thả sắp xếp 4 giai đoạn giữa; ẩn/hiện bằng `active` (không xóa bản ghi).
3. APPLIED và HIRED luôn cố định, luôn `active`.

## Business Rules

- Không thêm/xóa/đổi tên giai đoạn ngoài catalog.
- Không ẩn APPLIED/HIRED.
- Không ẩn giai đoạn đang còn ứng viên (`applications.stage_id`).
- Ứng viên mới vào giai đoạn active đầu tiên theo `sort_order`.

## API liên quan

| Method | Path |
|---|---|
| GET/PUT | `/api/v1/jobs/{id}/stages` |

## Database liên quan

- `recruitment_stages`

## UI mockup

- **Thiết lập quy trình:** `/recruiter/jobs/:id` — khối **Quy trình tuyển dụng** (Primary Recruiter hoặc Tenant Admin được sửa; co-recruiter chỉ xem).
- **Pipeline kanban:** `/recruiter/jobs/:id/pipeline` — vận hành board (demo); hiển thị link về thiết lập stage thật.
- Icons: xem `DESIGN.md`

## Phụ thuộc

JOB-01
