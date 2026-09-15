# JOB-F01 — Create and Save Draft Job

## Mục đích và phạm vi

Tạo một tin tuyển dụng mới trong tenant hiện tại và lưu ở trạng thái `DRAFT`. Phạm vi gồm nội dung, hình thức làm việc, số lượng, deadline, lương, phòng ban và recruiter; chưa cấu hình matching, pipeline hoặc publish.

## Nguồn và trạng thái thiết kế

- Nguồn: `docs/features/Job-Recruitment/Job-CRUD.md`, `AGENTS.md`, `DESIGN.md`.
- Đây là thiết kế mục tiêu; không phụ thuộc code hoặc schema hiện tại.
- Actor: Recruiter, Admin.
- Tiền điều kiện: đã đăng nhập, có tenant hợp lệ và quyền tạo job; department và recruiter thuộc tenant.
- Hậu điều kiện: một `Job` mới được commit vào tenant DB với trạng thái `DRAFT` và version ban đầu.

## Luồng sequence

1. Recruiter gửi biểu mẫu qua Tenant Web; interceptor xác thực, phân quyền và thiết lập `TenantContext`.
2. Controller kiểm tra cấu trúc DTO. Nhánh dữ liệu sai trả `400` và không gọi service.
3. Service kiểm tra department và recruiter trong đúng tenant. Nhánh tham chiếu không hợp lệ trả `422`.
4. Service tạo aggregate `Job`, ép trạng thái `DRAFT`, repository ghi trong một transaction và trả `201`.
5. Interceptor luôn xóa tenant context trong `finally`, kể cả khi có lỗi.

## Class và connector

- `JobController` chỉ nhận/trả DTO và **dependency** `delegates` sang `JobCommandService`.
- `JobCommandServiceImpl` **realization** interface service; nó phụ thuộc ba repository để kiểm tra tham chiếu và lưu aggregate.
- `JobRepository`, `DepartmentRepository`, `UserRepository` **association có hướng** tới entity do từng repository quản lý và dependency tới tenant DB.
- `Job` **composition** `SalaryRange` vì khoảng lương không tồn tại độc lập; association tới `Department` và `User` thể hiện phòng ban và recruiter phụ trách.
- Các dependency tới `TenantContext` buộc mọi persistence chạy trong database đã resolve.

## Quyết định và giả định

- Database-per-tenant nên entity không cần `tenantId`; không có liên kết cross-tenant.
- Salary có currency và cờ hiển thị; timezone chưa ảnh hưởng vì deadline là ngày nghiệp vụ.
- Authorization đặt tại trusted server boundary; transaction bao trùm validate tham chiếu cuối cùng và insert.
- Không có async event trong lúc tạo draft vì draft chưa ảnh hưởng public view.

## Generated artifacts

- class-diagram.png — PNG 300 DPI.
- sequence-diagram.png — PNG 300 DPI.

**Review status:** Complete

