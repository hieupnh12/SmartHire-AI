# TENANT-16 — Workspace Admin view tenant directory and details

## Mục đích và phạm vi

Gộp hai thao tác đọc có cùng actor và mô hình dữ liệu: tải danh sách tenant và xem chi tiết một tenant. Phạm vi gồm authorization, đọc master registry, ánh xạ safe response, tìm kiếm/lọc phía client và nhánh không tìm thấy. Không bao gồm provisioning, đổi trạng thái hoặc đọc Tenant MySQL. Class diagram dùng góc nhìn thiết kế ứng dụng.

## Nguồn đối chiếu

- `docs/features/Authentication/Tenant-Onboarding.md`, `docs/api/API_GUIDE.md`
- `SecurityConfig`, `MasterTenantController`, `MasterTenantService`
- `TenantInfoRepository`, `TenantInfo`, `TenantResponse`
- `masterAdminApi.ts`, `MasterAdminDashboardPage.tsx`
- Master migration tạo bảng `tenants`

## Actor, điều kiện và kết quả

Actor là platform user có role `WORKSPACE_ADMIN`. Với danh sách, hệ thống trả toàn bộ tenant registry hiện tại và UI tự tìm kiếm/lọc theo từ khóa/trạng thái. Với chi tiết, tenant ID phải tồn tại; nếu không trả `404 TENANT_NOT_FOUND`. Cả hai response chỉ chứa metadata an toàn.

## Luồng sequence

1. Admin mở Tenant Directory; security kiểm tra master JWT và role, trả `401/403` nếu không đạt.
2. Controller gọi `getAllTenants`; repository đọc bảng `tenants` và trả entity list.
3. Controller map từng entity sang `TenantResponse`, trả `200`; UI lọc/tìm kiếm trên danh sách đã tải rồi hiển thị.
4. Fragment `opt` xảy ra khi admin chọn một tenant. UI gọi endpoint chi tiết và security kiểm tra lại request.
5. Service tìm theo ID. Nhánh empty trả `404 TENANT_NOT_FOUND`; nhánh thành công map safe response và hiển thị detail panel.

Không có ghi dữ liệu, async, retry, tenant context hoặc tenant DB access.

## Thành phần class và quan hệ

- Dashboard phụ thuộc route vì gọi hai API; route dependency tới controller.
- Controller association tới service và dependency với nhiều `TenantResponse` khi trả list hoặc một response khi trả detail.
- Service association tới repository để đọc registry; repository association tới `TenantInfo` và Master PostgreSQL.
- `TenantResponse ..> TenantInfo` là mapping dependency, không phải inheritance hay entity exposure.

Không có realization, aggregation hoặc composition. Multiplicity `0..*` phản ánh list có thể rỗng; API chi tiết trả đúng một response hoặc lỗi.

## Bảo mật, riêng tư và vận hành

- Hai endpoint nằm dưới `/api/v1/master/**` và yêu cầu `WORKSPACE_ADMIN`.
- DTO loại bỏ `dbUrl`, `dbUsername`, `dbPassword`; không expose entity trực tiếp.
- Search/status filter hiện nằm ở client, không có pagination hoặc server-side filter trong contract. Với số tenant lớn đây là điểm có thể mở rộng, nhưng không được tự thêm vào sơ đồ hiện tại.
- Code chưa có audit event cho thao tác đọc; sơ đồ không giả định audit.

## Giả định và trạng thái

Hai endpoint được gộp vì cùng mục tiêu quan sát tenant registry; detail là nhánh tùy chọn sau khi xem danh sách. UI hiện có thể mở detail từ object trong list, nhưng API `GET /{id}` vẫn được mô hình hóa vì đó là contract backend chính thức.

**Review status:** `Complete`

## Kết quả render

- `class-diagram.png` và `sequence-diagram.png` đã được render, kiểm tra trực quan và không bị cắt nội dung.
- Script đã xác minh cả hai ảnh có metadata 300 DPI.
