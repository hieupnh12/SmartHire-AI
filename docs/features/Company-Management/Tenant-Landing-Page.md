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
| `GET` | `/api/v1/public/jobs/{id}` | Public (PermitAll) | Lấy dữ liệu vị trí cho trang chi tiết việc làm công khai |
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
- Career page ưu tiên job discovery bằng search-first hero: thanh tìm kiếm từ khóa và địa điểm, card phòng ban dùng logo tenant ở tiêu đề, dấu chấm thương hiệu thống nhất và số vị trí đang mở lấy từ public jobs; banner ba slide có điều khiển dừng/trước/sau. Slider dừng khi hover/focus và không tự chạy khi người dùng bật reduced motion.
- `/jobs` dùng bố cục job-board riêng: hero tìm kiếm, sidebar bộ lọc sticky trên desktop và thu gọn trên mobile, danh sách kết quả dạng card ngang dễ quét. Trang hỗ trợ query `q`, lọc theo phòng ban, địa điểm, hình thức làm việc, kỹ năng/công nghệ, loại công việc, mức lương, kinh nghiệm, học vấn và trạng thái nhận hồ sơ trên tập kết quả đầy đủ; có đếm kết quả, đặt lại bộ lọc và empty state có hướng dẫn, đồng thời không tạo giá trị giả khi API không trả dữ liệu.
- Mỗi job dùng URL công khai riêng `/jobs/:jobId`. Tiêu đề và CTA `Xem chi tiết` điều hướng tới trang này thay cho popup; trang chi tiết tải `GET /api/v1/public/jobs/{id}`, hiển thị mô tả, trách nhiệm/yêu cầu và quyền lợi theo danh sách có dấu đầu dòng, kỹ năng, khối thông tin chung có icon, hồ sơ và liên hệ doanh nghiệp, hướng dẫn tìm việc an toàn, việc làm liên quan và CTA ứng tuyển. Trạng thái loading, không tìm thấy và đã ngừng nhận hồ sơ được xử lý riêng.
- Footer dùng chung cho `/career`, `/jobs` và `/jobs/:jobId`; hiệu ứng reveal luôn được khởi tạo trên các route này để nội dung không bị giữ ở trạng thái ẩn.
- Khối `Việc làm nổi bật` dùng card hai cột trên desktop và một cột trên mobile, cho phép chuyển tiêu chí lọc nhanh giữa địa điểm, mức lương và kinh nghiệm bằng cùng một mẫu dropdown tùy biến, đồng thời chỉ hiển thị dữ liệu public job thật. Lọc địa điểm tách riêng thành phố và hình thức làm việc; tên thành phố phổ biến được chuẩn hóa để tránh lựa chọn trùng lặp. Lương VND được rút gọn sang đơn vị `triệu` và được ưu tiên thị giác trên card ứng viên. Candidate đã đăng nhập có tab `Phù hợp với bạn`: nếu chưa có CV ở trạng thái `ANALYZED`, hệ thống hiển thị CTA tới `/cv`; khi đã có CV, FE xếp việc theo số kỹ năng giao nhau giữa CV và public job, đồng thời ghi rõ đây là đối chiếu kỹ năng trực tiếp chứ không phải quyết định tuyển dụng.
- Từ khối `Việc làm nổi bật` đến footer, mỗi section có phân cấp thị giác riêng bằng surface/tint thương hiệu, card tương tác và nhịp nội dung rõ ràng. Các section xuất hiện nhẹ khi đi vào viewport; hiệu ứng bị vô hiệu hóa và nội dung hiển thị ngay khi người dùng bật `prefers-reduced-motion`.
- Các route public `/career`, `/jobs` và `/jobs/:jobId` dùng Lenis để tạo cuộn quán tính nhẹ cho thiết bị có con trỏ chính xác (`pointer: fine`), với thời lượng khoảng `1.05s`. Touch/mobile giữ cuộn native, vùng listbox/modal không bị can thiệp và `prefers-reduced-motion` luôn tắt smooth scrolling.
- Nội dung dưới danh sách việc làm đi theo luồng career site doanh nghiệp: EVP và số liệu tenant, phúc lợi, quy trình tuyển dụng, câu chuyện nhân viên, FAQ và CTA xem toàn bộ việc làm. Số vị trí/phòng ban được tính từ public jobs, không dùng số liệu tuyển dụng giả.
- Các section public dùng chung nhịp chiều rộng, khoảng cách và nền trắng/xám xen kẽ; job card giữ chiều cao đồng đều và có CTA rõ, quy trình tuyển dụng có timeline, FAQ có quan hệ `aria-controls`, còn footer gồm mô tả thương hiệu, điều hướng nhanh, liên hệ và mạng xã hội có accessible label.
- Header career dùng tenant logo/name, mega-menu mở bằng hover, focus hoặc click và chỉ liên kết tới route đang tồn tại. Khi candidate đã xác thực, cụm đăng nhập được thay bằng notification, hồ sơ ứng tuyển và menu tài khoản; mobile dùng menu xếp dọc.
- Header chỉ render một shared floating panel cho toàn bộ mega-menu. Panel dùng chung điểm neo ở góc trái của vùng điều hướng (vị trí panel `Việc làm`), chuyển tiếp `width`/`height` theo nội dung, cross-fade content và trượt mũi tên theo chính giữa nav item đang active; khi rê ngang qua nav, khung panel không bị đóng/mở lại. Bố cục bên trong dùng hai cột gọn, divider dọc, tiêu đề màu tenant, icon và mật độ hàng thống nhất. Riêng `Tạo CV` hiển thị nhóm mẫu CV theo style/vị trí ở bên trái, công cụ CV và Cover Letter ở bên phải. Mục đã có chức năng dùng route candidate hiện có; mục mới chưa có backend chỉ hiển thị UI mẫu và không điều hướng tới route lỗi.
- Mọi mục và tiêu đề nhóm `Mẫu CV theo style` / `Mẫu CV theo vị trí IT` dẫn tới cùng một trang public `/cv-templates` (không cần đăng nhập, dùng `CareerNavigationLayout` nên kế thừa màu tenant từ landing config). Mục đã chọn được truyền qua query `style` hoặc `position` và trở thành bộ lọc được chọn sẵn; tiêu đề nhóm mở trang không lọc. Trang có 2 tầng lọc chip giữ trạng thái trên URL, số mẫu phù hợp, lưới preview dựng bằng màu primary của tenant và trạng thái rỗng.
- Phân loại mẫu (tham khảo cv.f8.edu.vn), trang `candidate/cv/pages/CvTemplatesPage.tsx`, dữ liệu tĩnh tại `candidate/shared/constants/cvTemplates.ts`:
  - Style `simple` (Đơn giản, 1-2 cột tối giản, chuẩn ATS): Basic, Simple, Crisp, Chicken. Style `impressive` (Ấn tượng, màu nhấn, thẻ, icon, nổi bật Portfolio/Projects): Cascade, Rabbit, Iconic, Concept, Enfold. Style `professional` (Chuyên nghiệp, corporate, tông trầm): Vibes, Newsweek, Decker, Bubbles, Message.
  - Vị trí IT (`position`) → mẫu khuyên dùng: `backend` (Lập trình Backend) → Basic, Simple, Crisp; `frontend` (Lập trình Frontend) → Cascade, Enfold, Concept; `fullstack` (Fullstack / Di động) → Rabbit, Iconic, Simple; `qa` (Kiểm thử phần mềm) → Simple, Basic, Newsweek; `pm` (Quản lý dự án / BA) → Vibes, Message, Decker; `intern` (Thực tập / Mới ra trường) → Chicken, Concept, Rabbit. Nhãn menu/bộ lọc dùng tiếng Việt kèm thuật ngữ ngành; chức danh trong ảnh preview giữ tiếng Anh như CV IT thực tế. Bubbles không gắn vị trí, chỉ hiện khi lọc theo style.
- CTA `Dùng mẫu này` mở trình tạo CV `/cv/builder?template=<id>` (xem [CV-Builder](../CV-Screening/CV-Builder.md)); `Quản lý CV của tôi` dẫn tới `/cv` (candidate đăng nhập).
- Bộ chọn ngôn ngữ trên career header dùng biến thể icon gọn. Bên phải nút đăng nhập có CTA `Nhà tuyển dụng`, đưa người dùng từ tenant subdomain về platform domain chính để bắt đầu luồng đăng ký nhà tuyển dụng.
- Toàn bộ public career page dùng theme đã publish từ `landing_page_settings.config_json`: `primaryColor` cho hero/CTA/active/tint, `primaryHover` chỉ cho trạng thái hover, `secondaryColor` cho neutral/footer, cùng `fontFamily`, `darkModeHero` và `borderRadius`. Trang public luôn tải lại cấu hình khi được mở; card và section sinh sắc độ phụ từ semantic CSS variables để thay đổi màu trong Landing Editor áp dụng đồng bộ toàn trang.
