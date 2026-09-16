# FE-09 — Candidate Scoring & Ranking Engine

- **Feature:** `3.9 Candidate Ranking & Recommendation` (`RANK-01`, `RANK-03`, target extension of `RANK-02` labels)
- **Function:** Calculate, rank, explain and persist candidate scores for one Job.
- **Review status:** `Complete with assumptions`

## Mục đích và phạm vi

Function này mô tả kiến trúc đích: tổng hợp CV/kỹ năng, kinh nghiệm, assessment và interview; xử lý thiếu dữ liệu; xếp hạng theo cohort; sinh nhãn khuyến nghị có giải thích; lưu snapshot/version; và hỗ trợ tính lại khi nguồn đổi. Không bao gồm quyết định shortlist/reject của Recruiter và không mô tả recommendation Job-for-Candidate của `RANK-02`.

## Nguồn đã đối chiếu

- `DESIGN.md`
- `docs/features/Matching-Ranking/Ranking-Algorithm.md`
- `docs/features/Matching-Ranking/Overall-Candidate-Score.md`
- `docs/features/Matching-Ranking/Recommendation-Engine.md`
- `docs/api/API_GUIDE.md`
- `backend/.../matching/service/RankingService.java`, `RankingCalculator.java`, `SkillScoringService.java`, `ExperienceScoringService.java`
- Tenant migration `V3__ranking_configuration.sql` và các entity/repository ranking hiện tại.

## Actor, điều kiện và kết quả

- **Actor:** Recruiter; System/domain-event consumer.
- **Tiền điều kiện:** Tenant đã được resolve; JWT khớp tenant; actor là Recruiter sở hữu Job; cấu hình và nguồn thuộc đúng Job/application.
- **Hậu điều kiện thành công:** Board mới có score, cohort, rank, recommendation, reasons và breakdown; snapshot cùng version được thay nguyên tử.
- **Hậu điều kiện lỗi:** Không ghi snapshot dở dang; snapshot hợp lệ trước đó còn nguyên; lỗi quyền không làm lộ dữ liệu tenant khác.

## Luồng chính và luồng thay thế

1. Recruiter yêu cầu recompute hoặc consumer nhận sự kiện nguồn đổi.
2. Security boundary set `TenantContext`, xác thực role và quyền sở hữu Job.
3. Service khóa Job khi cần ghi và đọc cấu hình cùng nguồn hiện tại.
4. Mỗi application được tính component score; thành phần thiếu tạo partial score và cohort riêng, không bị đổi thành 0.
5. `RecommendationPolicy` sinh nhãn tư vấn và reason codes theo policy/version.
6. Calculator áp dụng competition ranking `1,1,3`; `applicationId` chỉ ổn định thứ tự hiển thị.
7. Service thay toàn bộ snapshot của Job trong transaction và trả board.
8. Nhánh `403/404` kết thúc trước DB tenant không hợp lệ; `400/409` giữ cấu hình/snapshot cũ; lỗi persistence rollback.
9. Với event-driven recalculation, consumer deduplicate `eventId/sourceVersion`, retry lỗi tạm thời, chuyển DLQ khi hết retry, và luôn clear tenant context.

## Trách nhiệm class và quan hệ

- `RankingController` là REST boundary, phụ thuộc (`dependency`) vào `RankingService` và DTO response.
- `RankingServiceImpl` **realization** (`implements`) `RankingService`, đồng thời có association có hướng tới calculator, policy và repositories để điều phối use case.
- `RankingCalculator` tính weighted/partial score, cohort, tie và rank; `RecommendationPolicy` phân loại và giải thích nhưng không ra quyết định tuyển dụng.
- `RankingDataRepository` và `RankingSnapshotRepository` là repository tenant-scoped; dependency tới entity thể hiện dữ liệu chúng đọc/quản lý.
- `RankingBoardResponse` composition (`*--`) nhiều `RankingRowResponse`: row không có ý nghĩa ngoài board trả về.
- `Application` association `1 — 0..*` `RankingSnapshot`: một hồ sơ có nhiều kết quả lịch sử/version; không phải composition vì retention snapshot độc lập với response lifecycle.
- `RankingSnapshot` association tới `RecommendationLabel` để lưu kết quả tư vấn tại thời điểm tính.
- Queue có dependency bất đồng bộ tới consumer; event mang tenant header/context thay vì tạo liên kết xuyên tenant.

Không dùng inheritance hoặc aggregation; realization chỉ biểu diễn implementation thực thi service contract.

## Multi-tenant, bảo mật, transaction và async

Mọi nguồn và snapshot nằm trong dedicated tenant MySQL DB. Request và worker đều xác thực tenant trước query; worker restore/clear context trong `try/finally`. Recompute ghi trong một transaction. Event phải idempotent và có correlation/event ID. Breakdown không chứa CV thô hay thuộc tính nhạy cảm không cần thiết. Recommendation không tự động reject.

## Assumptions và quyết định còn mở

- `RecommendationLabel`, `RecommendationPolicy`, `RankingSnapshot` hợp nhất, queue source-change và source fingerprint là **target design**, chưa có contract/schema hoàn chỉnh.
- Ngưỡng `STRONG_FIT/REVIEW/NOT_RECOMMENDED` phải được product owner phê duyệt và version hóa; sơ đồ không tự đặt con số.
- Cần quyết định retention của snapshot và DLQ/replay policy trước triển khai production.

## Render

Đã render lại `class-diagram.png` bằng PlantUML 1.2026.8 và xác minh metadata 300 DPI. Có thể kiểm tra source không tạo ảnh bằng:

```powershell
.agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/09-candidate-ranking-recommendation/candidate-scoring-ranking-engine -ValidateOnly
```

Ảnh đã được kiểm tra trực quan: không clipping, nội dung và connector đọc được ở độ phân giải gốc.
