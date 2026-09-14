# FE13-F02 — Drill-down dữ liệu Analytics

- **Feature:** `FE13`
- **Function:** `drill-down-analytics`
- **Góc nhìn:** Application design theo kiến trúc mục tiêu
- **Trạng thái:** `Complete`

## Mục đích và phạm vi

Cho phép Recruiter/Tenant Admin chọn một KPI, funnel stage hoặc data point để xem các job/application/candidate cấu thành giá trị đó. Kết quả phải tái lập đúng filter, timezone và `metricVersion` của dashboard, có phân trang và giới hạn PII theo quyền.

## Nguồn đã đối chiếu

`DESIGN.md`, ba tài liệu `DASH-01..03`, yêu cầu FE13 của người dùng và thiết kế F01. UML mô tả trạng thái hoàn thành dự án, không phụ thuộc scaffold hiện tại.

## Điều kiện và kết quả

- Tiền điều kiện: dashboard đã trả selection context; user đã xác thực; tenant active.
- Thành công: trả một page các dòng giải thích aggregate, giữ nguyên metric semantics.
- Lỗi: 401/403; 400 khi metric/dimension/version không hợp lệ; page rỗng là kết quả hợp lệ.

## Giải thích sequence

1. Chart gửi selection cùng filter gốc và metric version, tránh dựng lại ngữ cảnh mơ hồ.
2. Guard xác thực, authorize và set tenant trước khi controller xử lý; nhánh `denied` dừng trước DB.
3. Service yêu cầu exact metric definition. Nhánh `unsupported/expired` trả 400 vì không thể bảo đảm drill-down khớp biểu đồ.
4. Authorization service tạo `DataScope`: job được xem và quyền thấy PII.
5. Tenant DB thực thi predicate, scope, sort và pagination server-side.
6. Service mask trường nhạy cảm trước khi trả `DrillDownRow`; UI hiển thị drawer/table. Context được clear trong `finally`.

## Giải thích class và connector

- `DrillDownRoute` là REST boundary khái niệm và có **dependency** `defines routes` tới controller.
- Controller **dependency** vào request/response DTO và **association** tới `DrillDownService` để ủy quyền.
- `DrillDownServiceImpl` **realization** (`implements`) service contract và có **association** tới `DrillDownRepository` cùng `TenantContext`. Việc giữ metric semantics, giới hạn role và mask PII được thể hiện là trách nhiệm của implementation thay vì tách thành các helper class làm loãng sơ đồ chính.
- Repository là port, **dependency** vào `Application` mà nó quản lý và gián tiếp truy cập dedicated tenant database qua các entity.
- `Application` có **association** nhiều-một tới `Job` và nhiều-không-hoặc-một tới `RecruitmentStage`, phản ánh mỗi application thuộc một job và có thể đang ở một stage.
- Service implementation có **dependency** vào request/response DTO khi xử lý filter và mapping dữ liệu chi tiết.
- Không có inheritance, aggregation hay composition; realization chỉ biểu diễn service implementation thực thi contract.

## Multi-tenant, bảo mật, transaction và privacy

- Query chỉ chạy trong dedicated tenant DB; `DataScope` tiếp tục giới hạn theo job/recruiter nếu role yêu cầu.
- Candidate email, phone, CV và nội dung đánh giá không xuất hiện mặc định; chỉ trường được `visibleFields` cho phép mới được trả.
- Read-only, không cần transaction ghi, queue hay retry. Có thể audit truy cập chi tiết nếu chính sách tenant yêu cầu.

## Giả định

- Metric definitions còn được truy cập theo version đủ lâu để drill-down dashboard snapshot.
- API mục tiêu: `GET /api/v1/dashboard/drill-down`.
- Tên hiển thị candidate là PII có điều kiện; dữ liệu không được log.

## Kiểm tra và render

```powershell
pwsh -File .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/13-recruitment-dashboard-analytics/drill-down-analytics -ValidateOnly
```

Đã tạo `class-diagram.png` và `sequence-diagram.png` bằng PlantUML 1.2026.8. Cả hai file đã được gắn và kiểm tra metadata 300 DPI, đồng thời kiểm tra trực quan để bảo đảm không clipping.
