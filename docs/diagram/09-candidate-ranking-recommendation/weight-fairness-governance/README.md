# FE-09 — Weight Configuration & Fairness Governance

- **Feature:** `3.9 Candidate Ranking & Recommendation`
- **Function:** Version Job-specific ranking policy, recompute atomically, and monitor fairness without using protected attributes as scoring inputs.
- **Review status:** `Complete with assumptions`

## Mục đích và phạm vi

Function này bao gồm cấu hình trọng số/threshold có revision, recompute toàn Job, audit cấu hình, sau đó đánh giá fairness bất đồng bộ trên kết quả tổng hợp. Fairness chỉ tạo report/cảnh báo cho con người, không sửa rank hoặc quyết định tuyển dụng.

## Nguồn đã đối chiếu

`DESIGN.md`, feature docs `RANK-01..03`, `API_GUIDE.md`, `RankingService.configure`, `RankingCalculator.validate`, migration ranking hiện tại và yêu cầu target được người dùng xác nhận.

## Actor, điều kiện và kết quả

- **Actor:** Recruiter sở hữu Job; governance reviewer khi đọc report; system worker.
- **Tiền điều kiện:** Tenant/JWT hợp lệ; tổng component weights và group weights đều bằng 100; expected revision hiện hành.
- **Thành công:** Config revision mới, snapshot version mới và audit được commit; fairness report liên kết đúng version được tạo bất đồng bộ.
- **Lỗi:** `400` cho policy sai, `409` cho revision cũ, rollback nếu recompute/ghi snapshot lỗi; worker retry/DLQ riêng mà không làm rollback ranking đã commit.

## Diễn giải sequence

1. Recruiter gửi weights, thresholds và expected revision.
2. Security xác thực tenant, role và Job ownership.
3. Service validate tổng/range và cấm protected attributes trong scoring config.
4. Nhánh invalid trả `400`; revision lệch trả `409` để tránh lost update.
5. Nhánh thành công khóa Job, tăng revision, recompute và thay snapshot trong transaction, ghi audit rồi commit.
6. Sau commit phát event có tenant/correlation ID. Consumer restore tenant context và deduplicate.
7. Nếu mẫu quá nhỏ, lưu `INSUFFICIENT_DATA`; nếu đủ, tính metric/alert đã phê duyệt và lưu report.
8. Worker luôn clear context; alert không thay đổi kết quả tuyển dụng.

## Trách nhiệm class và quan hệ

- Controller phụ thuộc DTO và điều phối hai service application.
- `RankingConfigurationServiceImpl` **realization** (`implements`) `RankingConfigurationService`, rồi association tới config repository và ranking service để bảo đảm config–snapshot nhất quán.
- `FairnessMonitoringServiceImpl` **realization** (`implements`) `FairnessMonitoringService`, rồi association tới policy và report repository.
- Hai repository có dependency tới entity mà chúng quản lý, đều tenant-scoped.
- `FairnessReport` composition (`*--`) metrics và alerts vì các value object này thuộc lifecycle của report.
- Không dùng inheritance hay aggregation; realization chỉ biểu diễn implementation thực thi service contract.

## Multi-tenant, security, transaction, async và privacy

Config, snapshot và report nằm trong dedicated tenant DB. Event mang `X-Tenant-ID`, event ID và ranking version; consumer restore/clear context, idempotent, retry và DLQ. Protected attributes không đi vào scoring; dữ liệu monitoring phải có căn cứ pháp lý, quyền truy cập riêng, aggregate/pseudonymize, suppress mẫu nhỏ và retention rõ ràng. Cần security/audit review trước production.

## Assumptions và quyết định còn mở

Fairness service/report/API, thresholds trong config, audit config và snapshot-created event là target design. Chưa chốt protected groups, metric (ví dụ selection-rate disparity), minimum sample size, alert threshold, retention và reviewer role; các giá trị này phải được legal/product/data governance duyệt, không được suy diễn từ sơ đồ.

## Render

Đã render lại `class-diagram.png` bằng PlantUML 1.2026.8, xác minh metadata 300 DPI và kiểm tra trực quan không clipping. Dùng script của skill với `-ValidateOnly` để kiểm tra source mà không tạo ảnh.
