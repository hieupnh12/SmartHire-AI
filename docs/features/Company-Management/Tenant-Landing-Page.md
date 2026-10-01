# Tùy biến Landing Page / Career Page theo từng Tenant

**Epic:** Company Management  
**Trạng thái:** `Done`  
**Code ID:** `COMPANY-02`

## Mục đích chức năng

Cho phép **Tenant Admin** và nhân sự doanh nghiệp (HR) tùy biến chuyên sâu toàn bộ trang tuyển dụng công khai (Career Landing Page) của riêng tenant đó:
- Tải lên hình ảnh banner, căn chỉnh kích thước (chiều cao, bo góc, độ mờ overlay).
- Thiết lập bảng màu thương hiệu (Primary/Secondary color picker & presets), font chữ (Inter, Plus Jakarta Sans, Be Vietnam Pro...).
- Chỉnh sửa 100% nội dung câu chữ: tiêu đề, slogan, câu chuyện văn hóa công ty, ảnh hoạt động, số liệu nổi bật (Stats Builder).
- Quản lý danh sách chế độ đãi ngộ & phúc lợi (Benefits Builder) với icon sinh động.
- Quản lý hệ sinh thái công nghệ (Tech Stack tags) và trích dẫn đánh giá của nhân viên (Testimonials Builder).
- Chân trang (Footer), hotline, email tuyển dụng, liên kết mạng xã hội (LinkedIn, Facebook, GitHub...).
- Tối ưu hóa SEO & hiển thị chia sẻ mạng xã hội (Meta title, description, OG image).
- Hỗ trợ Live Preview xem trước thời gian thực trên cả giao diện Desktop và Mobile trước khi bấm Xuất bản.

## Actor

- **Tenant Admin / ADMIN / HR:** Xem, chỉnh sửa, tải ảnh, lưu nháp, xuất bản và khôi phục giao diện mẫu.
- **Ứng viên / Public Viewer:** Truy cập `subdomain.smarthire.top/career` hoặc `/jobs` để xem trang giới thiệu công ty và nộp hồ sơ ứng tuyển theo diện mạo thương hiệu của tenant.

## Luồng hoạt động

1. **Quản trị viên chỉnh sửa:**
   - Admin truy cập `/internal/admin/landing-page` (hoặc từ menu Doanh nghiệp -> Trang Tuyển Dụng).
   - Hệ thống tải cấu hình hiện tại từ Tenant DB qua `GET /api/v1/tenant/landing-page`.
   - Admin điều chỉnh các thông số (màu sắc, tải ảnh banner, sửa text, thêm bớt phúc lợi/số liệu). Khung Live Preview bên cạnh tự động cập nhật thời gian thực theo từng thao tác.
   - Admin chọn xem trước ở chế độ Desktop hoặc Mobile.
   - Khi hoàn tất, Admin bấm **"Lưu Nháp"** (chưa public) hoặc **"Xuất Bản Ngay"** (`PUT /api/v1/tenant/landing-page?publish=true`).
   - Backend lưu cấu hình vào bảng `landing_page_settings` của Tenant DB và tự động cập nhật / làm mới bộ nhớ đệm **Redis Cache**.

2. **Ứng viên truy cập:**
   - Ứng viên truy cập trang Career của tenant (`/career` hoặc `/jobs`).
   - FE gọi `GET /api/v1/public/landing`.
   - Backend kiểm tra Redis cache `cache:landing:{tenantCode}`. Nếu có cache, trả về ngay; nếu chưa có, đọc từ Tenant DB, lưu vào Redis (TTL 1 giờ) rồi trả về cho ứng viên.
   - FE render giao diện động với đầy đủ màu sắc, banner, văn hóa, đãi ngộ và danh sách việc làm.

## Business Rules

- Dữ liệu Landing Page thuộc sở hữu riêng của từng tenant và được lưu trữ hoàn toàn trong **Tenant DB** (bảng `landing_page_settings`), đảm bảo tính cô lập dữ liệu tuyệt đối (Data Isolation).
- Ảnh upload (banner, văn hóa, avatar) được validate định dạng (JPG, PNG, WEBP, GIF, SVG) và dung lượng tối đa 5MB, lưu trữ tại thư mục riêng của tenant (`storage/landing/{tenantCode}/`).
- Endpoint public ảnh `/api/v1/public/landing/images/{tenantCode}/{fileName}` được cấp quyền truy cập công khai và gắn header `Cache-Control` (7 ngày) để tối ưu CDN/Browser cache.
- Fallback an toàn: Nếu tenant chưa cấu hình hoặc cấu hình trống, hệ thống tự động sinh cấu hình mặc định chuẩn IT Enterprise, không bao giờ bị lỗi giao diện.
- Chỉ người dùng có vai trò `TENANT_ADMIN`, `ADMIN`, `HR` mới có quyền truy cập API quản trị và chỉnh sửa `/api/v1/tenant/landing-page/**`.

## API liên quan

| Method | Path | Quyền hạn | Mô tả |
|---|---|---|---|
| `GET` | `/api/v1/public/landing` | Public (PermitAll) | Lấy cấu hình Landing Page công khai của tenant (có Redis Cache) |
| `GET` | `/api/v1/public/landing/images/{tenantCode}/{fileName}` | Public (PermitAll) | Phục vụ file ảnh banner/văn hóa đã upload |
| `GET` | `/api/v1/tenant/landing-page` | `TENANT_ADMIN`, `ADMIN`, `HR` | Lấy cấu hình đầy đủ (kể cả trạng thái draft/published) cho trang quản trị |
| `PUT` | `/api/v1/tenant/landing-page` | `TENANT_ADMIN`, `ADMIN`, `HR` | Cập nhật cấu hình và xuất bản / lưu nháp |
| `POST` | `/api/v1/tenant/landing-page/reset` | `TENANT_ADMIN`, `ADMIN`, `HR` | Khôi phục về template mặc định ban đầu |
| `POST` | `/api/v1/tenant/landing-page/upload-image` | `TENANT_ADMIN`, `ADMIN`, `HR` | Tải lên file ảnh từ máy tính (Multipart Form Data) |

## Database liên quan

- **Tenant DB:** Bảng `landing_page_settings`
  - `id`: BIGINT (PK)
  - `config_json`: JSON (Toàn bộ cây cấu hình chi tiết)
  - `is_published`: BOOLEAN
  - `published_at`: TIMESTAMP
  - `created_at`: TIMESTAMP
  - `updated_at`: TIMESTAMP
- **Migration:** `backend/src/main/resources/db/migration/tenant/V13__create_landing_page_settings.sql`

## UI Mockup & Điều hướng

- Route Quản trị: `/internal/admin/landing-page` (hoặc `/tenant/admin/landing-page`)
- Route Ứng viên: `/career` hoặc `/jobs`
- Menu Admin: `adminNav` -> Doanh nghiệp -> `nav.landingPage` (Icon `LayoutTemplate`)
- Career page ưu tiên job discovery ngay sau hero: job sắp hết hạn trong 7 ngày, preview việc đang mở và CTA tới `/jobs`; chỉ dùng dữ liệu thật từ public jobs API.
- `/jobs` hỗ trợ tìm kiếm qua query `q`, lọc phòng ban trên tập kết quả đầy đủ và không tạo giá trị giả cho salary/location/work mode khi API không trả dữ liệu.
- Header career dùng tenant logo/name, mega-menu mở bằng hover, focus hoặc click và chỉ liên kết tới route đang tồn tại. Khi candidate đã xác thực, cụm đăng nhập được thay bằng notification, hồ sơ ứng tuyển và menu tài khoản; mobile dùng menu xếp dọc.
- Header chỉ render một shared floating panel cho toàn bộ mega-menu. Panel dùng chung điểm neo ở góc trái của vùng điều hướng (vị trí panel `Việc làm`), chuyển tiếp `width`/`height` theo nội dung, cross-fade content và trượt mũi tên theo chính giữa nav item đang active; khi rê ngang qua nav, khung panel không bị đóng/mở lại. Bố cục bên trong dùng hai cột gọn, divider dọc, tiêu đề màu tenant, icon và mật độ hàng thống nhất. Riêng `Tạo CV` hiển thị nhóm mẫu CV theo style/vị trí ở bên trái, công cụ CV và Cover Letter ở bên phải. Mục đã có chức năng dùng route candidate hiện có; mục mới chưa có backend chỉ hiển thị UI mẫu và không điều hướng tới route lỗi.
- Bộ chọn ngôn ngữ trên career header dùng biến thể icon gọn. Bên phải nút đăng nhập có CTA `Nhà tuyển dụng`, đưa người dùng từ tenant subdomain về platform domain chính để bắt đầu luồng đăng ký nhà tuyển dụng.
- Toàn bộ public career page dùng theme đã publish từ `landing_page_settings.config_json`: `primaryColor` cho hero/CTA/active/tint, `primaryHover` chỉ cho trạng thái hover, `secondaryColor` cho neutral/footer, cùng `fontFamily`, `darkModeHero` và `borderRadius`. Trang public luôn tải lại cấu hình khi được mở; card và section sinh sắc độ phụ từ semantic CSS variables để thay đổi màu trong Landing Editor áp dụng đồng bộ toàn trang.
