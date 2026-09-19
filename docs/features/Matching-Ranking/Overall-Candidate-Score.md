# Overall Candidate Score

**Epic:** Candidate-Job Matching & Ranking  
**Trạng thái:** `Doing`
**Code ID:** `RANK-03`

## Mục đích chức năng

Tổng hợp kỹ năng (S), kinh nghiệm liên quan (E), assessment (A), AI interview (I) thành điểm rank có giải thích và mức hoàn thành.

## Actor

- Recruiter, System

## Luồng hoạt động

1. Đọc nguồn chính thức của hồ sơ và cấu hình Job.
2. Tính `S = Σ(điểm nhóm × trọng số nhóm) / 100`.
3. Tính `Rank = (S × wS + E × wE + A × wA + I × wI) / 100` khi đủ các thành phần bật.
4. Hiển thị điểm, trọng số, đóng góp và bằng chứng trong panel của bảng xếp hạng.

## Business Rules

- Trọng số mặc định S/E/A/I = 35/15/30/20; cấu hình riêng từng Job, tổng bằng 100, số nguyên 0–100. Trọng số nhóm cũng tổng 100; 0 nghĩa là không tham gia.
- Ví dụ S=79, E=80, A=85, I=81 → 81,35. Dùng BigDecimal và làm tròn HALF_UP hai chữ số; không cộng các đóng góp đã làm tròn để tính tổng.
- Thiếu thành phần: `partial = Σ(điểm có dữ liệu × trọng số) / Σ(trọng số có dữ liệu)`. Ví dụ chỉ S=79, E=80 → 79,30, có 2/4 thành phần và 50% trọng số.
- Không có thành phần → điểm null, không có hạng. Điểm 0 hợp lệ vẫn được tính. Thành phần có trọng số 0 không ảnh hưởng mức hoàn thành.
- Assessment lấy `attempt_scores.total_score` của attempt GRADED, interview lấy `interview_scores.overall_score` của session SCORED. Điểm nguồn phải nằm trong 0–100; ngoài thang hiển thị cần xác minh. Nhận xét AI assessment không cộng điểm lần thứ hai.
- `E = min(số tháng liên quan / số tháng yêu cầu, 1) × 100`. Đối chiếu kỹ năng chuẩn trong từng kinh nghiệm với kỹ năng Job; tính hợp các tháng (bao gồm tháng bắt đầu/kết thúc), không cộng trùng. Mốc YYYY-MM, công việc hiện tại tính đến tháng UTC hiện tại. Không tự coi thiếu ngày là 0 năm.
- Chỉ dùng kinh nghiệm có trường skills và bằng chứng; dữ liệu liên quan sai ngày/thiếu bằng chứng → NEEDS_REVIEW. Mảng experience rỗng xác định 0 tháng. Xem contract [CV-03](../CV-Screening/Information-Extraction.md).
- Nếu Job không yêu cầu kinh nghiệm, đặt trọng số E=0 và phân bổ lại; không tự giả định số năm yêu cầu.
- Đổi cấu hình tính lại toàn bộ Job trong transaction; snapshot lưu breakdown cùng ranking_version. Nguồn cập nhật được phản ánh khi GET tiếp theo, không phụ thuộc snapshot cũ.

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/applications/{id}/overall-score` |

## Database liên quan

- `overall_scores`, `ranking_configs`, `ranking_sources`; đọc từ CV/attempt/interview liên kết application trong tenant.

## UI mockup

- Panel chi tiết trong `/recruiter/rank`: điểm tổng, nhãn tạm/hoàn chỉnh, % trọng số, bảng đóng góp, bằng chứng kỹ năng/kinh nghiệm và nhận xét AI interview. Candidate không có quyền xem.

## Phụ thuộc

RANK-01, ASSESS-03, INT-04

## Tiến độ

Đã triển khai API `/applications/{id}/overall-score`, thuật toán, panel và unit/integration test. Toàn luồng còn phụ thuộc các module sinh kết quả và sự kiện cập nhật bất đồng bộ, nên giữ `Doing`.
