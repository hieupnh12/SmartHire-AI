# JOB-F02 — Search and View Jobs

## Mục đích và phạm vi

Cho Recruiter/Admin tìm kiếm, lọc, phân trang danh sách job, xem chi tiết và số application tổng hợp theo job.

## Nguồn và điều kiện

- Nguồn: `Job-CRUD.md`, yêu cầu mục tiêu 3.3 và quy tắc multi-tenant trong `AGENTS.md`.
- Actor: Recruiter, Admin. Thiết kế target, không bám code hiện tại.
- Tiền điều kiện: tenant hợp lệ; principal có scope toàn tenant, department hoặc các job được giao.
- Hậu điều kiện: trả page/detail DTO an toàn; không thay đổi dữ liệu.

## Luồng sequence

1. Interceptor xác thực, phân quyền, đặt tenant context; lỗi trả `401/403`.
2. Controller chuyển filter hoặc ID tới service.
3. Service suy ra `JobAccessScope` từ principal, không tin recruiter/department scope do client tự gửi.
4. Repository truy vấn jobs cùng application aggregate và pagination trong tenant DB.
5. Detail không tồn tại hoặc ngoài scope đều trả `404`; kết quả hợp lệ được map sang DTO và trả `200`.
6. Tenant context được xóa trong `finally`.

## Class và connector

- Controller **dependency** tới request/response DTO và service.
- `JobQueryServiceImpl` **realization** `JobQueryService`, phụ thuộc query repository để giữ query logic khỏi controller.
- Repository có association đọc `Job`, aggregate `Application` và dependency `reads from` tới tenant DB.
- Association `Job 1 — 0..* Application` giải thích nguồn của `applicationCount`; `JobStatus` là kiểu enum của Job.
- Không trả Entity trực tiếp; `JobListItemResponse` và `JobDetailResponse` là projection API riêng.

## Quyết định và giả định

- Search là đồng bộ; sort/page phải có giới hạn kích thước tại API.
- Số application lấy theo snapshot transaction/query hiện tại, không cam kết realtime tuyệt đối.
- Query không được nhận tenant ID làm điều kiện tùy ý; connection tenant đã được resolver chọn.

## Generated artifacts

- class-diagram.png — PNG 300 DPI.
- sequence-diagram.png — PNG 300 DPI.

**Review status:** Complete

