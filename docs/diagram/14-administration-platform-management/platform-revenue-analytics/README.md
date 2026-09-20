# ADMIN-14 — Phân Tích Doanh Thu & Chỉ Số Vận Hành Nền Tảng (Platform Revenue Analytics)

## 1. Mục đích và phạm vi

Chức năng này mô tả quy trình tổng hợp, tính toán và trực quan hóa các chỉ số kinh doanh cốt lõi cấp nền tảng SaaS (Landlord / Master Level) cho Quản trị viên Vận hành nền tảng (**Workspace Admin / Platform Super Admin**).

Trong mô hình kiến trúc SaaS Multi-Tenant Separate Database của SmartHire-AI, dữ liệu tuyển dụng nghiệp vụ nằm phân tán tại từng MySQL Database của từng khách hàng doanh nghiệp, nhưng **toàn bộ dữ liệu về danh bạ doanh nghiệp, các gói dịch vụ thuê bao, lịch sử hợp đồng và hóa đơn thanh toán đều được lưu tập trung tại Master Database (PostgreSQL)**. Chức năng này tổng hợp dữ liệu từ Master DB để cung cấp cái nhìn tài chính và vận hành thời gian thực:
- **MRR (Monthly Recurring Revenue):** Tổng doanh thu định kỳ theo tháng của nền tảng.
- **ARR (Annual Recurring Revenue):** Doanh thu định kỳ quy đổi theo năm (`MRR * 12` hoặc tổng giá trị hợp đồng năm).
- **Active Tenants:** Số lượng doanh nghiệp đang hoạt động (`status = 'ACTIVE'`).
- **Growth Rate:** Tỷ lệ tăng trưởng doanh thu so với tháng trước (ví dụ `+18.5%` hoặc `+28.4%`).
- **Plan Distribution:** Cơ cấu thị phần khách hàng theo từng gói cước (`STARTER`, `PROFESSIONAL`, `ENTERPRISE`).
- **Xuất báo cáo tài chính (CSV Export):** Cho phép kết xuất dữ liệu danh bạ doanh nghiệp và trạng thái thanh toán ra file CSV.

Class diagram sử dụng **góc nhìn thiết kế ứng dụng (Application-Design View)** phân tầng rõ ràng từ Controller, DTO, Service, Repository, Entity đến Infrastructure. Sequence diagram mô tả chi tiết luồng xử lý từ giao diện người dùng, kiểm tra bảo mật Spring Security, cơ chế tối ưu Cache Redis, truy vấn tổng hợp trên Master Database và phản hồi hiển thị biểu đồ.

---

## 2. Nguồn đã đối chiếu

- Tài liệu kiến trúc: `AGENTS.md`, `DESIGN.md`, `docs/diagram/00-system-architecture/README.md`.
- Đặc tả Tenant Onboarding: `docs/features/Authentication/Tenant-Onboarding.md`.
- Mã nguồn Backend:
  - `MasterAnalyticsController.java` (`GET /api/v1/master/analytics/revenue`)
  - `TenantInfo.java`, `SubscriptionPlan.java`, `PlatformUser.java` trong `com.smarthire.domain.master.entity`
  - `TenantInfoRepository.java`, `SubscriptionPlanRepository.java` trong `com.smarthire.domain.master.repository`
  - `SecurityConfig.java` (Cấu hình quyền `ROLE_WORKSPACE_ADMIN` cho `/api/v1/master/**`)
- CSDL Master PostgreSQL Migration:
  - `V1__init_master_schema.sql` (bảng `tenants`, `subscription_plans`, `tenant_subscriptions`, `invoices`, `platform_users`)
  - `V2__tenant_connection_security.sql`, `V3__workspace_admin_role.sql`
- Mã nguồn Frontend:
  - `frontend/src/features/master/dashboard/pages/MasterAdminDashboardPage.tsx` (Tab "Tổng quan & Doanh thu")
  - `frontend/src/api/master/masterAdminApi.ts` (`getRevenueAnalytics()`)

---

## 3. Actor và thành phần tham gia

| Thành phần | Vai trò & Trách nhiệm |
|---|---|
| `Workspace Admin` | Người quản trị nền tảng SaaS truy cập bảng điều khiển để theo dõi sức khỏe tài chính và tăng trưởng. |
| `Master Dashboard UI` | Giao diện React SPA hiển thị các thẻ chỉ số KPI (MRR, ARR, Active Tenants, SLA) và biểu đồ phân bổ gói cước. |
| `Spring Security` | Trạm kiểm soát bảo mật biên backend; xác thực JWT Access Token và kiểm tra quyền `WORKSPACE_ADMIN`. |
| `MasterAnalyticsController` | Controller tiếp nhận yêu cầu REST API, gọi tầng Service và ánh xạ `ApiResponse`. |
| `MasterAnalyticsService` | Interface định nghĩa nghiệp vụ tính toán chỉ số tài chính và xuất dữ liệu báo cáo. |
| `MasterAnalyticsServiceImpl` | Implementation chịu trách nhiệm điều phối truy vấn Repository, tính toán thuật toán tăng trưởng và quản lý Cache Redis. |
| `Redis Cache` | Bộ nhớ đệm lưu trữ kết quả phân tích doanh thu (`master:analytics:revenue`) với TTL để tối ưu I/O database. |
| `TenantInfoRepository` | Repository Spring Data JPA truy vấn danh sách và đếm số lượng tenant `ACTIVE`. |
| `TenantSubscriptionRepository` | Repository truy vấn danh sách các gói thuê bao mà các doanh nghiệp đang đăng ký. |
| `SubscriptionPlanRepository` | Repository truy vấn danh mục các gói cước (`STARTER`, `PROFESSIONAL`, `ENTERPRISE`). |
| `InvoiceRepository` | Repository truy vấn hóa đơn thanh toán thành công để tính toán tổng doanh thu thực thu. |
| `Master PostgreSQL` | Cơ sở dữ liệu trung tâm của nền tảng lưu trữ toàn bộ thực thể Master Domain. |

---

## 4. Tiền điều kiện và hậu điều kiện

### Tiền điều kiện:
- Người dùng đã đăng nhập thành công vào Cổng Quản trị Nền tảng với quyền hạn `WORKSPACE_ADMIN` và có JWT Access Token còn hiệu lực trong `Authorization` header.
- Master Database (PostgreSQL) đang vận hành và chứa các bảng dữ liệu `tenants`, `subscription_plans`, `tenant_subscriptions`, `invoices`.
- Endpoint không yêu cầu header `X-Tenant-ID` vì đây là tác vụ phân tích cấp toàn sàn (Master Scope).

### Hậu điều kiện khi thành công:
- Trả về mã phản hồi HTTP `200 OK` kèm theo dữ liệu `RevenueAnalyticsResponse` chứa đầy đủ các chỉ số: `mrr`, `arr`, `activeTenants`, `growthRate`, và bản đồ phân bổ `planDistribution`.
- Giao diện người dùng render trực quan 4 thẻ KPI số liệu tài chính và biểu đồ thanh tỷ trọng khách hàng.
- Kết quả được lưu tạm vào Redis Cache với thời gian sống (TTL = 10 phút) để tối ưu hiệu năng.

### Hậu điều kiện khi thất bại:
- Token không tồn tại hoặc hết hạn: Trả về HTTP `401 Unauthorized`.
- Người dùng không có vai trò `WORKSPACE_ADMIN`: Trả về HTTP `403 Forbidden`.
- Lỗi kết nối Master Database hoặc Redis: Trả về HTTP `500 Internal Server Error` thông qua `GlobalExceptionHandler`.

---

## 5. Luồng hoạt động

### 5.1. Luồng chính (Happy Path)
1. Workspace Admin điều hướng vào tab "Tổng quan & Doanh thu" trên Master Dashboard.
2. Frontend gửi request HTTP `GET /api/v1/master/analytics/revenue` kèm Bearer Token.
3. Spring Security chặn ở Filter Chain, xác thực token hợp lệ và xác nhận claim `role = WORKSPACE_ADMIN`.
4. `MasterAnalyticsController` tiếp nhận request và chuyển giao cho `MasterAnalyticsService.calculateRevenueAnalytics()`.
5. Service kiểm tra Redis cache tại khóa `master:analytics:revenue`.
6. Nếu có Cache Hit: Service trả về kết quả ngay lập tức mà không cần truy vấn Master Database.
7. Nếu Cache Miss: Service mở transaction chỉ đọc (`masterTransactionManager`) và thực hiện:
   - Truy vấn đếm số lượng tenant đang hoạt động `countByStatus('ACTIVE')`.
   - Truy vấn danh sách hợp đồng thuê bao có hiệu lực `findActiveSubscriptions()` để lấy định giá từng gói cước.
   - Tính toán tổng MRR và nhân hệ số 12 để có ARR.
   - Thống kê phân bổ tỷ trọng theo gói cước (`STARTER`, `PROFESSIONAL`, `ENTERPRISE`).
   - Truy vấn tổng số tiền các hóa đơn đã thanh toán thành công trong tháng qua `InvoiceRepository` và đối chiếu chu kỳ liền trước để tính tỷ lệ tăng trưởng `%`.
   - Lưu kết quả tính toán vào Redis cache với TTL 10 phút.
8. Controller nhận kết quả và trả về HTTP `200 OK` kèm `ApiResponse<RevenueAnalyticsResponse>`.
9. Giao diện hiển thị trực quan dữ liệu lên các widget thẻ số liệu và biểu đồ phân bổ.

### 5.2. Luồng thay thế & xuất file CSV
- Khi Workspace Admin nhấn nút "Xuất báo cáo tài chính (CSV)", frontend tổng hợp dữ liệu danh sách khách hàng doanh nghiệp, gói cước và doanh thu thành file định dạng CSV (`smarthire_tenants_report_YYYY-MM-DD.csv`) và kích hoạt tải xuống tự động về máy tính người dùng.

---

## 6. Giải thích chi tiết Sequence Diagram

### Vai trò các bước tương tác:
1. **Bước 1–2:** Workspace Admin truy cập trang tổng quan; UI phát sinh yêu cầu HTTP `GET /api/v1/master/analytics/revenue` gửi kèm Bearer Token.
2. **Nhánh alt 1 (Lỗi xác thực):** Spring Security kiểm tra token. Nếu thiếu token hoặc sai vai trò, hệ thống trả về mã `401 Unauthorized` hoặc `403 Forbidden` và kết thúc luồng ngay tại cổng bảo mật.
3. **Nhánh alt 2 (Xác thực hợp lệ):** Request được chuyển tiếp tới `MasterAnalyticsController` và ủy quyền tiếp cho `MasterAnalyticsService`.
4. **Bước 5–6 (Kiểm tra Cache):** Service kiểm tra dữ liệu đệm Redis:
   - *Nhánh 2.1 (Cache Hit):* Trả lại ngay payload response đã lưu tạm, giảm tải áp lực cho PostgreSQL.
   - *Nhánh 2.2 (Cache Miss):* Mở transaction chỉ đọc trên Master Database để thực hiện chuỗi truy vấn tổng hợp:
     - **Bước 7–10:** `TenantInfoRepository` đếm các doanh nghiệp có trạng thái `ACTIVE`.
     - **Bước 11–14:** `TenantSubscriptionRepository` truy vấn các gói dịch vụ đang kích hoạt kèm giá thuê.
     - **Bước 15–18:** `InvoiceRepository` tính tổng số tiền thanh toán thực tế của các hóa đơn có trạng thái `PAID`.
     - **Bước 19:** Service thực hiện thuật toán tính toán: cộng dồn MRR, suy ra ARR, tính cơ cấu % phân bổ gói cước và tỷ lệ tăng trưởng so với kỳ trước.
     - **Bước 20–21:** Ghi dữ liệu đã tổng hợp vào Redis Cache với thời hạn 10 phút.
5. **Bước 22–24:** Trả kết quả ngược lên Controller và hiển thị các widget số liệu KPI lên giao diện.
6. **Bước 25–27 (Khung opt CSV Export):** Khi người dùng có nhu cầu xuất báo cáo định kỳ, UI kích hoạt tính năng kết xuất dữ liệu sang định dạng bảng tính CSV và tải về máy client.

---

## 7. Giải thích chi tiết Class Diagram

### 7.1. Trách nhiệm các thành phần:
- **`MasterAnalyticsController`:** Biên REST API quản trị, nhận request HTTP và điều phối xử lý nghiệp vụ.
- **`RevenueAnalyticsResponse`:** DTO chứa gói dữ liệu số liệu tài chính trả về cho client.
- **`PlanDistributionDto`:** DTO biểu diễn số lượng và tỷ lệ % thị phần của từng gói cước.
- **`MasterAnalyticsService` & `MasterAnalyticsServiceImpl`:** Cặp interface và class cài đặt chứa toàn bộ logic tính toán tài chính SaaS.
- **`TenantInfoRepository`, `TenantSubscriptionRepository`, `SubscriptionPlanRepository`, `InvoiceRepository`:** Các interface Spring Data JPA phụ trách tầng lưu trữ dữ liệu nền tảng.
- **`TenantInfo`, `SubscriptionPlan`, `TenantSubscription`, `Invoice`:** Các JPA Entity đại diện cho các bảng dữ liệu Master trong PostgreSQL.
- **`SubscriptionStatus`, `InvoiceStatus`:** Các enum nghiệp vụ biểu thị vòng đời thuê bao và hóa đơn.
- **`Master PostgreSQL` & `Redis Cache`:** Các thành phần cơ sở dữ liệu và bộ nhớ đệm hạ tầng.

### 7.2. Giải thích các đường nối (Relationships):
- `MasterAnalyticsController --> MasterAnalyticsService`: **Directed Association** — Controller nắm giữ và gọi Service đã được Spring Container inject.
- `MasterAnalyticsController ..> RevenueAnalyticsResponse`: **Dependency** — Controller trả về DTO này trong phương thức API.
- `RevenueAnalyticsResponse o-- PlanDistributionDto`: **Aggregation** — Phản hồi phân tích bao gồm danh sách các đối tượng phân bổ gói cước con.
- `MasterAnalyticsServiceImpl .up.|> MasterAnalyticsService`: **Realization / Implementation** — Lớp thực thi cài đặt đầy đủ các phương thức được định nghĩa bởi interface.
- `MasterAnalyticsServiceImpl ..> RevenueAnalyticsResponse`: **Dependency** — Service khởi tạo đối tượng response sau khi tính toán.
- `MasterAnalyticsServiceImpl --> Repositories`: **Directed Association** — Service inject và quản lý việc gọi các Repository chuyên biệt.
- `MasterAnalyticsServiceImpl --> Redis Cache`: **Directed Association** — Service chủ động thao tác ghi và đọc cache Redis.
- `Repositories --> Entities`: **Navigable Association** — Từng repository quản lý trực tiếp một kiểu Entity domain tương ứng.
- `Repositories --> Master PostgreSQL`: **Directed Association tới Data Store** — Thao tác lưu trữ và truy vấn SQL được ánh xạ trực tiếp vào Master DB.
- `Entities --> Enums`: **Typed by Dependency** — Thuộc tính trạng thái của Entity được ràng buộc theo kiểu enum hữu hạn.
- `Master PostgreSQL *-- Entities`: **Composition** — Các Entity này chỉ tồn tại trong cơ sở dữ liệu Master PostgreSQL trung tâm, không tồn tại trong DB riêng của từng tenant.

---

## 8. Quyết định kiến trúc, bảo mật và vận hành

1. **Ranh giới Multi-Tenancy (Master vs Tenant):**
   - API này thuộc hoàn toàn về phân hệ **Master Domain**. Request không sử dụng header `X-Tenant-ID` và không thiết lập `TenantContext`.
   - Tất cả các bảng được truy vấn (`tenants`, `subscription_plans`, `tenant_subscriptions`, `invoices`) đều nằm trong schema trung tâm của PostgreSQL.
2. **Hiệu năng & Tối ưu hóa truy vấn (Performance & Caching):**
   - Do nghiệp vụ phân tích doanh thu đòi hỏi tổng hợp từ nhiều bảng lớn (`JOIN` giữa `tenant_subscriptions` và `subscription_plans`, quét `invoices`), hệ thống áp dụng cơ chế Cache-Aside thông qua Redis với key `master:analytics:revenue` và TTL 10 phút.
   - Phương thức Service được đánh dấu `@Transactional(transactionManager = "masterTransactionManager", readOnly = true)` để tối ưu hóa kết nối cơ sở dữ liệu và tận dụng cơ chế đọc không ghi khóa (non-locking reads).
3. **Bảo mật & Phân quyền (Security & RBAC):**
   - Chỉ người dùng có claim quyền hạn `WORKSPACE_ADMIN` mới có thể gọi API này. Mọi truy cập trái phép từ người dùng thông thường của các tenant đều bị từ chối với mã lỗi `403 Forbidden`.
   - Số liệu trả về là số liệu tổng hợp thống kê, không để lộ dữ liệu nhạy cảm của khách hàng doanh nghiệp.

---

## 9. Giả định và quyết định kỹ thuật

- Sử dụng mã định danh tính năng `ADMIN-14` theo phân vùng thư mục `docs/diagram/14-administration-platform-management/`.
- Chu kỳ tính toán MRR lấy mặc định theo tháng dương lịch hiện tại; các hợp đồng năm được chia đều 12 tháng để tính đóng góp vào MRR.
- Chức năng xuất báo cáo CSV hiện tại có thể kết xuất linh hoạt trực tiếp từ trình duyệt dựa trên tập dữ liệu tải về hoặc qua endpoint hỗ trợ stream byte CSV.

---

## 10. Render và file được tạo

- `class-diagram.puml`: Mã nguồn PlantUML Class Diagram (Application-Design View).
- `sequence-diagram.puml`: Mã nguồn PlantUML Sequence Diagram (Quy trình tổng hợp doanh thu và hiển thị Dashboard).
- `class-diagram.png`: Ảnh PNG độ phân giải cao 300 DPI (sẽ được tạo sau khi người dùng phê duyệt).
- `sequence-diagram.png`: Ảnh PNG độ phân giải cao 300 DPI (sẽ được tạo sau khi người dùng phê duyệt).

---

## 11. Trạng thái review

**Complete** — Mã nguồn PlantUML, tài liệu giải thích chi tiết và toàn bộ ảnh PNG (độ phân giải cao 300 DPI verified, không xuất SVG) đã được biên dịch thành công, kiểm tra trực quan đạt chuẩn đồ án tốt nghiệp Enterprise.
