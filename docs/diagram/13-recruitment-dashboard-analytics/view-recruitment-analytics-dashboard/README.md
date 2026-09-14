# FE13-F01 — Xem Recruitment Analytics Dashboard

- **Feature:** `FE13 / DASH-01..03`
- **Function:** `view-recruitment-analytics-dashboard`
- **Góc nhìn:** Application design theo kiến trúc mục tiêu khi dự án hoàn thành
- **Trạng thái:** `Complete`

## Mục đích và phạm vi

Recruiter hoặc Tenant Admin xem KPI, số ứng viên theo stage, funnel, thời gian xử lý, tỷ lệ nhận offer, hiệu quả nguồn, phân phối điểm, hiệu quả job/recruiter và xu hướng theo ngày, tháng hoặc quý. Một bộ lọc chung gồm thời gian, timezone, job, department và recruiter được áp dụng cho toàn bộ kết quả. Drill-down và export là hai function riêng.

## Nguồn đã đối chiếu

- `DESIGN.md`.
- `docs/features/Analytics-Dashboard/Recruitment-Statistics.md` (`DASH-01`).
- `docs/features/Analytics-Dashboard/Dashboard-Charts.md` (`DASH-02`).
- `docs/features/Analytics-Dashboard/Trend-Analysis.md` (`DASH-03`).
- Yêu cầu FE13 do người dùng cung cấp. Code hiện tại chỉ được xem để nhận diện ranh giới dự án; UML mô tả thiết kế đích, không bị giới hạn bởi scaffold.

## Actor, điều kiện và kết quả

- **Actor:** `RECRUITER`, `TENANT_ADMIN`.
- **Tiền điều kiện:** đã xác thực; tenant active; request mang tenant identity; filter thời gian hợp lệ.
- **Hậu điều kiện:** dashboard trả cùng một `metricVersion`, timezone và filter; không thay đổi dữ liệu nghiệp vụ.
- **Kết quả lỗi:** 401 khi chưa xác thực, 403 khi thiếu quyền hoặc filter ngoài tenant, 400 khi thời gian/timezone/granularity sai.

## Trách nhiệm trong sequence

1. Frontend thu thập một `AnalyticsFilter` dùng chung cho mọi widget.
2. Security và interceptor xác thực role, resolve tenant, sau đó đặt `TenantContext` trước mọi truy vấn.
3. Controller validate hình thức và chuyển request sang service; controller không tính metric.
4. `TimezoneService` chuyển biên ngày địa phương sang UTC và kiểm tra giới hạn khoảng thời gian. Nhánh `alt` trả 400 nếu đầu vào không hợp lệ.
5. Service kiểm tra job, department và recruiter thuộc tenant hiện tại. Nhánh `alt` trả 403 trước khi aggregate nếu filter không thuộc phạm vi.
6. `MetricDefinitionService` cấp công thức đang hiệu lực và version để mọi kênh cho cùng kết quả.
7. Cache key gồm tenant, normalized filter và metric version. Nhánh cache hit trả snapshot; nhánh miss đọc tenant DB, tính metric rồi cache với TTL hữu hạn.
8. Frontend render KPI/charts hoặc empty state. Interceptor luôn clear `TenantContext` trong `finally`, kể cả lỗi.

## Trách nhiệm và quan hệ trong class diagram

- `DashboardAnalyticsRoute` là boundary khái niệm và có **dependency** `defines routes` tới controller; nó mô tả endpoint chứ không khẳng định tồn tại route class riêng trong Spring.
- Controller **dependency** vào request/response DTO và **association** tới `DashboardAnalyticsService`: validate boundary rồi ủy quyền.
- `DashboardAnalyticsServiceImpl` **realization** (`implements`) `DashboardAnalyticsService`, đồng thời có **association** tới repository, cache và `TenantContext`. Timezone normalization và metric definition được giữ như trách nhiệm của implementation/note để Service Layer không bị kéo ngang.
- `DashboardAnalyticsRepository` và `DashboardCache` là interface/port. Repository tổng hợp các entity tuyển dụng trong dedicated Tenant DB; cache **association** tới Redis.
- `Job` có **association** một-nhiều với `Application`; application có thể ở một `RecruitmentStage` và nhận nhiều `Offer`. Đây là dữ liệu nghiệp vụ tạo nên dashboard metrics.
- Không dùng inheritance, aggregation hoặc composition vì không có quan hệ sở hữu vòng đời phù hợp; realization chỉ dùng cho service contract và implementation.

## Quyết định metric và dữ liệu

- Lưu timestamp theo UTC; filter và bucket ngày/tháng/quý theo timezone đã chọn.
- `newApplications`: application tạo trong khoảng lọc.
- `conversionRate(A→B)`: số application đã đạt B chia số đã đạt A trong cohort được định nghĩa.
- `timeToReview`: first review time trừ application created time.
- `timeInStage`: thời điểm rời stage trừ thời điểm vào stage; bản ghi chưa rời stage dùng thời điểm kết thúc snapshot.
- `timeToHire`: accepted-offer time trừ application created time.
- `offerAcceptanceRate`: accepted offers chia responded offers; không chia offer còn pending.
- Các định nghĩa được version hóa; dashboard, drill-down và export phải lưu/trả cùng version.

## Multi-tenant, bảo mật và vận hành

- Separate Database per Tenant; entity tenant không cần lặp `tenantId`.
- Không fallback sang master DB và không cho filter ID từ tenant khác.
- Response tổng hợp hạn chế PII; kiểm soát chi tiết được xử lý ở F02.
- Cache bắt buộc partition theo tenant và invalidated khi job/application/stage/offer/score thay đổi.
- Đây là read-only flow; không cần transaction ghi hoặc RabbitMQ.

## Giả định và điểm cần chốt

- `Department`, recruiter assignment, `Offer` và stage transition đầy đủ là thành phần của mô hình đích.
- Công thức nêu trên là baseline mục tiêu; product owner có thể thay bằng definition version mới mà không đổi ranh giới kiến trúc.
- Endpoint hợp nhất mục tiêu là `GET /api/v1/dashboard/analytics`; có thể triển khai nội bộ bằng nhiều query nhưng response phải là một snapshot logic nhất quán.

## Kiểm tra và render

Kiểm tra source không tạo ảnh:

```powershell
pwsh -File .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/13-recruitment-dashboard-analytics/view-recruitment-analytics-dashboard -ValidateOnly
```

Đã tạo `class-diagram.png` và `sequence-diagram.png` bằng PlantUML 1.2026.8. Cả hai file đã được gắn và kiểm tra metadata 300 DPI, đồng thời kiểm tra trực quan để bảo đảm không clipping.
