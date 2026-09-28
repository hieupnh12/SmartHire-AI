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
3. Recruiter cấu hình **CV Screening Weights** và **Gate Screening Weights** theo từng job (hai nhóm độc lập, mỗi nhóm tổng 100%).
4. Clone copy nội dung/skill/stage/screening config, không copy application.
5. Soft delete `deleted_at` + `ARCHIVED`.
6. Form job có `deadline` datetime và `screeningMode`; `AUTO` chạy sàng lọc khi hết hạn, `MANUAL` chờ recruiter xác nhận.

## Business Rules

- Staff trong tenant mới được quản lý.
- Không hard-delete khi đã có applicants.
- CV Screening Weights chỉ tính CV Score. Gate Screening Weights chỉ tổng hợp CV + AI Interview + Assessment.
- Backend từ chối weight âm, thiếu field, hoặc tổng ≠ 100%. Pass threshold 0–100.
- Job cũ (trước V13) được snapshot công thức CV trước đây (40/8/12/0/15/25, ngưỡng 60) và gate 40/35/25 ngưỡng 70 để scoring không gãy. Recruiter đổi được sau.

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/jobs` |
| GET | `/api/v1/jobs/departments` |
| POST | `/api/v1/jobs` |
| GET/PUT/DELETE | `/api/v1/jobs/{id}` |
| POST | `/api/v1/jobs/{id}/clone` |
| POST | `/api/v1/jobs/quick` |

Recruiter set `deadline` (ngày giờ). Hết hạn → job đóng, tự phân tích CV chưa chấm.

## Database liên quan

- `jobs` (V6: thông tin tuyển dụng; V15: deadline datetime; V16: `screening_mode`)
- `job_screening_configs` (V13: CV weights + Gate weights + thresholds theo `job_id`)

## UI mockup

- Job feed tại `/recruiter` hiển thị dữ liệu thật về phòng ban, chế độ lọc CV và funnel theo trạng thái ứng viên. `AUTO` xử lý sau hạn tuyển; `MANUAL` yêu cầu recruiter xác nhận. Job cũ mặc định `MANUAL`.

- Recruiter: `/recruiter/jobs`, `/recruiter/jobs/new`, `/recruiter/jobs/:id`
- Khi mở chi tiết từ bảng tin tuyển dụng, thanh điều hướng giữ `Việc làm` là mục chính; không hiển thị `Bảng điều khiển` trong thanh điều hướng của trang chức năng.
- Trang chi tiết job có nút menu ở đầu header để mở panel điều hướng gồm liên kết chung và các job được tạo gần đây.

## Phụ thuộc

AUTH-04
