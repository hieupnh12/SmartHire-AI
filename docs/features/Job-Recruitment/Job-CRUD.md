# Create / Update / Delete Job

**Epic:** Job Recruitment Management  
**Trạng thái:** `Done`  
**Code ID:** `JOB-01`

## Mục đích chức năng

Recruiter quản lý vòng đời tin tuyển dụng: tạo nháp, sửa, clone, xóa (soft delete).

## Actor

- Recruiter, Admin, HR

## Luồng hoạt động

1. CRUD qua `/api/v1/jobs`.
2. Tạo mặc định `DRAFT`, skill mẫu (nếu bỏ trống) và pipeline Applied → Hired.
3. Clone copy nội dung/skill/stage, không copy application.
4. Soft delete `deleted_at` + `ARCHIVED`.

## Business Rules

- Staff trong tenant mới được quản lý.
- Không hard-delete khi đã có applicants.

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/jobs` |
| POST | `/api/v1/jobs` |
| GET/PUT/DELETE | `/api/v1/jobs/{id}` |
| POST | `/api/v1/jobs/{id}/clone` |
| POST | `/api/v1/jobs/quick` |

## Database liên quan

- `jobs` (V6: department, work_mode, headcount, deadline, salary_*, responsibilities, benefits, experience, education)

## UI mockup

- Job feed tại `/recruiter` hiển thị phòng ban và chế độ lọc CV. `AUTO` mô tả thời điểm xử lý sau hạn tuyển; `MANUAL` yêu cầu recruiter cho phép lọc và xác nhận trước khi chuyển giai đoạn. API/schema hiện cần bổ sung `screeningMode` để lưu cấu hình; job cũ được hiển thị theo chế độ thủ công.

- Recruiter: `/recruiter/jobs`, `/recruiter/jobs/new`, `/recruiter/jobs/:id`
- Khi mở chi tiết từ bảng tin tuyển dụng, thanh điều hướng giữ `Việc làm` là mục chính; không hiển thị `Bảng điều khiển` trong thanh điều hướng của trang chức năng.
- Trang chi tiết job có nút menu ở đầu header để mở panel điều hướng gồm liên kết chung và các job được tạo gần đây.

## Phụ thuộc

AUTH-04
