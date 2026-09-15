# Gán & Nâng/Hạ Gói Dịch vụ Tenant (assign-tenant-subscription)

## 1. Mục đích và phạm vi
Chức năng cho phép Quản trị viên Nền tảng (**Workspace Admin**) gán gói dịch vụ hoặc thay đổi gói (Upgrade / Downgrade Plan) cho một Doanh nghiệp (Tenant) cụ thể:
- Lấy thông tin gói dịch vụ hiện tại của Doanh nghiệp.
- Cập nhật trạng thái gói cũ sang `UPGRADED` hoặc `CANCELLED`.
- Kích hoạt bản ghi đăng ký mới trong `tenant_subscriptions` với thời hạn và tự động gia hạn (`autoRenew`).
- Khởi tạo hóa đơn thu phí tương ứng (`invoices`) với trạng thái thanh toán.
- Đồng bộ hóa hạn ngạch mới sang Redis Cache (`tenant:{code}:quota:limits`) và phát sự kiện RabbitMQ `TenantQuotaSyncEvent` để hệ thống Tenant DB nhận biết hạn mức mới tức thì.

## 2. API Endpoints
- `GET /api/v1/master/tenants/{id}/subscription` — Xem thông tin gói đang hoạt động của Tenant.
- `POST /api/v1/master/tenants/{id}/subscription` — Gán hoặc chuyển đổi sang gói thuê bao mới.

## 3. Database & Lưu trữ
- **Master PostgreSQL DB**: Bảng `tenant_subscriptions`, `invoices`, `subscription_plans`, `tenants`.
- **Redis Cache**: Lưu trữ hạn mức tức thời phục vụ kiểm tra hạn ngạch phân tán mà không gây nghẽn Master DB.
- **RabbitMQ**: Phát `smarthire.tenant.quota.sync` để các worker đồng bộ trạng thái.

## 4. Danh sách sơ đồ
- `class-diagram.puml` / `class-diagram.png`: Sơ đồ lớp kiến trúc đa tầng (đã loại bỏ Routing & Boundary).
- `sequence-diagram.puml` / `sequence-diagram.png`: Sơ đồ tuần tự thể hiện vòng đời gán gói, cập nhật DB, ghi hóa đơn và đồng bộ quota sang Redis/RabbitMQ.
