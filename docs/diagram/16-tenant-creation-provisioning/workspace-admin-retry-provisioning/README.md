# TENANT-16 — Workspace Admin retry provisioning

## Mục đích và phạm vi

Mô tả việc Workspace Admin chạy lại quá trình cấp phát cho tenant `FAILED` hoặc `PROVISIONING` bị gián đoạn. Phạm vi gồm xác thực quyền, validation thông tin admin, khóa chống chạy đồng thời, tái sử dụng tài nguyên đã tạo, chạy Flyway, seed `TENANT_ADMIN` theo cách idempotent và cập nhật trạng thái cuối. Class diagram dùng góc nhìn thiết kế ứng dụng.

## Nguồn đối chiếu

- `docs/features/Authentication/Tenant-Onboarding.md`, `docs/api/API_GUIDE.md`
- `MasterTenantController`, `MasterTenantService`, `TenantProvisioningService`
- `TenantAdminRequest`, `TenantResponse`, `TenantInfo`, `TenantInfoRepository`
- `TenantDataSourceFactory`, migration master và tenant
- `frontend/src/api/master/tenantApi.ts`, Master Admin Dashboard

## Actor, điều kiện và kết quả

Actor là `WORKSPACE_ADMIN`. Tenant phải tồn tại và ở `FAILED` hoặc `PROVISIONING`; request phải dùng lại email admin ban đầu nếu admin đã được seed. Thành công tạo/migrate database riêng, bảo đảm có `TENANT_ADMIN` và chuyển tenant sang `ACTIVE`. Thất bại chuyển về `FAILED`, giữ tài nguyên đã tạo một phần và không xóa dữ liệu.

## Luồng sequence

1. Admin gửi `POST /api/v1/master/tenants/{id}/retry`; Spring Security trả `401/403` nếu không đủ quyền.
2. Controller validation DTO; lỗi đầu vào trả `400`.
3. Service kiểm tra tenant; không tồn tại trả `404 TENANT_NOT_FOUND`.
4. Provisioner thử lấy PostgreSQL session advisory lock theo tenant ID; lock bận trả `409 PROVISIONING_IN_PROGRESS`.
5. Tenant được đọc lại dưới lock. Nhánh trạng thái không phải `FAILED/PROVISIONING` trả `409 INVALID_TENANT_STATE`.
6. Nhánh hợp lệ đặt `PROVISIONING`, tái tạo hoặc tái sử dụng database/user, chạy Flyway idempotent và seed admin. Admin đã tồn tại đúng role được giữ nguyên.
7. Nhánh lỗi đặt `FAILED`, giải phóng lock và trả `503 TENANT_PROVISIONING_FAILED`; nhánh thành công đặt `ACTIVE`, giải phóng lock và trả metadata an toàn với `200`.

## Thành phần class và quan hệ

- `RetryProvisioningRoute ..> MasterTenantController`: dependency định tuyến HTTP.
- Controller phụ thuộc `TenantAdminRequest`, `TenantResponse` và association tới `MasterTenantService` để giữ HTTP layer mỏng.
- `MasterTenantService --> TenantInfoRepository`: association dùng repository để xác nhận tenant; `--> TenantProvisioningService` để điều phối retry.
- `TenantInfoRepository --> TenantInfo` và Master PostgreSQL: repository quản lý entity registry trong master DB.
- `TenantProvisioningService --> MasterDB`: association cần thiết vì advisory lock là trọng tâm bảo đảm đồng thời.
- Provisioner dùng `TenantDataSourceFactory`; factory kết nối/migrate Tenant DB, còn provisioner seed admin trực tiếp. Đây là dependency hạ tầng có chủ đích vì nó quyết định tính idempotent của retry.

Không có inheritance, realization, aggregation hoặc composition giữa các class ứng dụng. Tenant DB chứa dữ liệu của đúng một tenant nhưng không có foreign key xuyên database.

## Quyết định kiến trúc và bảo mật

- Master endpoint không dùng `TenantContext`; database đích được lấy từ registry theo tenant ID.
- Raw password là write-only, chỉ hash BCrypt được lưu trong tenant DB; credential DB không xuất hiện trong response hoặc sơ đồ.
- Không có distributed transaction giữa PostgreSQL và MySQL. Master status là dấu vết kết quả; retry giữ lại tài nguyên một phần.
- Advisory lock luôn được giải phóng trong `finally` hoặc khi connection đóng.

## Giả định và trạng thái

Không có giả định ngoài contract hiện tại. Không mô tả audit event vì code chưa ghi audit cho thao tác này.

**Review status:** `Complete`

## Kết quả render

- `class-diagram.png`: đã render và kiểm tra trực quan, không có nội dung bị cắt.
- `sequence-diagram.png`: đã render và kiểm tra trực quan, đầy đủ các nhánh lỗi và luồng thành công.
- Cả hai PNG đã được script xác minh metadata 300 DPI.

Lệnh render: `powershell -ExecutionPolicy Bypass -File .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/16-tenant-creation-provisioning/workspace-admin-retry-provisioning -Format Png -PngDpi 300 -PlantUmlJar <path-to-plantuml.jar>`.
