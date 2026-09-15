# TENANT-16 — Workspace Admin suspend/reactivate tenant

## Mục đích và phạm vi

Mô tả thao tác chuyển trạng thái vận hành `ACTIVE ↔ SUSPENDED`, cập nhật có điều kiện trong master registry và đóng connection pool cục bộ. Không bao gồm retry tenant `FAILED/PROVISIONING`. Class diagram dùng góc nhìn thiết kế ứng dụng.

## Nguồn đối chiếu

- `docs/features/Authentication/Tenant-Onboarding.md`, `docs/api/API_GUIDE.md`
- `MasterTenantController.updateTenantStatus`, `MasterTenantService.updateTenantStatus`
- `TenantInfoRepository.changeOperationalStatus`, `TenantInfo`
- `DynamicMultiTenantConnectionProvider`, Master Admin Dashboard và `masterAdminApi`

## Actor, điều kiện và kết quả

Actor là `WORKSPACE_ADMIN`. Tenant hiện tại phải ở `ACTIVE` hoặc `SUSPENDED`; target cũng chỉ nhận hai giá trị này. Thành công lưu trạng thái mới, đóng pool tenant trong backend process hiện tại và trả metadata không chứa credential. Trạng thái provisioning không thể bị kích hoạt trực tiếp.

## Luồng sequence

1. Admin chọn tạm khóa hoặc mở khóa; security trả `401/403` nếu không đủ quyền.
2. Service kiểm tra target status; giá trị khác `ACTIVE/SUSPENDED` trả `400 INVALID_STATUS`.
3. Repository chạy conditional update chỉ khi trạng thái hiện tại thuộc tập vận hành. Không cập nhật được trả `409 INVALID_TENANT_STATE`, bao gồm tenant không tồn tại hoặc đang provisioning/failed theo contract code hiện tại.
4. Sau khi cập nhật, service đọc lại tenant để lấy code và metadata mới.
5. Provider evict và đóng Hikari pool của tenant nếu pool đang tồn tại trong process.
6. Controller trả `200`; UI cập nhật trạng thái. Transaction bắt đầu trước lúc suspend có thể hoàn tất, nhưng lần lấy connection mới sẽ kiểm tra trạng thái registry.

## Thành phần class và quan hệ

- Service association tới repository để cập nhật registry và tới provider để vô hiệu pool.
- Repository association tới `TenantInfo` và Master PostgreSQL.
- `TenantInfo ..> TenantOperationalStatus` là dependency ràng buộc giá trị; enum trong sơ đồ diễn giải invariant dù code đang lưu `String`.
- Provider `o-- HikariDataSource` là aggregation: provider giữ nhiều pool có vòng đời độc lập nhưng có thể đóng/loại khỏi cache.

Không có inheritance, realization hoặc composition. `DynamicMultiTenantConnectionProvider` được giữ trong sơ đồ dù là hạ tầng vì đóng pool là hiệu ứng cốt lõi của use case.

## Multi-tenant, transaction và bảo mật

- Thao tác chạy trong master security/domain, không set `TenantContext` và không truy cập tenant data.
- Conditional update giảm race giữa các admin và ngăn ghi đè trạng thái provisioning.
- Master DB là nguồn trạng thái authoritative; cache pool nằm riêng trên từng backend process. Mỗi lần cấp connection vẫn gọi `requireActive`, nên process khác cũng fail closed sau suspend.
- Không có secret/PII trong response; code hiện chưa ghi audit event nên sơ đồ không tự thêm.

## Giả định và trạng thái

Enum `TenantOperationalStatus` là phần tử conceptual để diễn đạt constraint của code, không phải Java enum hiện hữu.

**Review status:** `Complete with assumptions`

## Kết quả render

- `class-diagram.png` và `sequence-diagram.png` đã được render, kiểm tra trực quan và không bị cắt nội dung.
- Script đã xác minh cả hai ảnh có metadata 300 DPI.
