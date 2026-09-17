# Candidate Ranking Algorithm

**Epic:** Candidate-Job Matching & Ranking  
**Trạng thái:** `Doing`
**Code ID:** `RANK-01`

## Mục đích chức năng

Xếp hạng hồ sơ ứng tuyển của một Job bằng hai tầng trọng số: điểm kỹ năng theo nhóm, sau đó tổng hợp kỹ năng + kinh nghiệm + assessment + AI interview. Recruiter xem bằng chứng và quyết định bước tuyển dụng tiếp theo.

## Actor

- Recruiter, System

## Luồng hoạt động

1. Recruiter mở `/recruiter/rank`, chọn Job thuộc quyền quản lý.
2. Cấu hình trọng số bốn thành phần (mặc định 35/15/30/20), trọng số nhóm kỹ năng và số tháng kinh nghiệm liên quan yêu cầu. Cấu hình chưa lưu không tạo điểm rank.
3. Backend đọc yêu cầu từ `job_skills`, kỹ năng từ `cv_skills`, kinh nghiệm từ `cv_extractions`, điểm chính thức từ `attempt_scores` và `interview_scores`.
4. Nếu chỉ có một nguồn liên kết hồ sơ, tự chọn nguồn đó. Khi có nhiều CV/lần đánh giá, hiển thị `SELECT_SOURCE`; Recruiter chọn nguồn chính thức trong panel chi tiết. Không tự chọn lần cao điểm nhất.
5. GET tính điểm từ dữ liệu hiện tại, không ghi DB. Màn hình làm mới mỗi 30 giây khi đang mở. POST recompute, lưu cấu hình hoặc chọn nguồn sẽ tính lại và thay snapshot của toàn bộ Job trong một transaction.
6. Recruiter lọc nhóm thành phần, trạng thái, tên và điểm tối thiểu; xem chi tiết và mở module assessment/interview/lịch hẹn tương ứng.

## Business Rules

- Chỉ `RECRUITER` sở hữu Job được truy cập; Candidate và Recruiter khác không được xem. Tenant trong JWT phải khớp header/subdomain. Mọi query dùng Hibernate tenant context.
- Ba bước xử lý: chuẩn hóa/phân nhóm → tương đồng và độ bao phủ → tổng hợp có trọng số. Xem [CV-05](../CV-Screening/Matching-Score.md) và [RANK-03](Overall-Candidate-Score.md).
- Chỉ CV `ANALYZED`, attempt `GRADED`, interview `SCORED` mới cung cấp điểm. Nguồn phải liên kết đúng application, Job và ứng viên; interview hiện liên kết application qua CV.
- Thiếu điểm là `null`, không phải 0. Các trạng thái: `MISSING`, `PROCESSING`, `FAILED`, `SELECT_SOURCE`, `NEEDS_REVIEW`, `READY`, `DISABLED`.
- Cohort là tập thành phần có trọng số > 0 và đã có kết quả, theo thứ tự `skills+experience+assessment+interview`. Chỉ so hạng trong cùng cohort; không chỉ so số lượng thành phần.
- Đồng điểm hiển thị đồng hạng kiểu 1, 1, 3; thứ tự hiển thị ổn định theo application ID tăng dần. Không dùng thời điểm cập nhật làm lợi thế.
- Hồ sơ `REJECTED`, `WITHDRAWN`, `HIRED` không có hạng đang xét tuyển nhưng vẫn truy cập qua bộ lọc.
- Màn hình “Tất cả” không hiển thị hạng chung. Lọc/sắp xếp/phân trang không đánh lại thứ hạng. Mỗi trang 20 hồ sơ; phiên bản hiện tại tải dữ liệu một Job rồi lọc/phân trang phía frontend.
- Phiên bản `rank-v1:<revision>`; lưu cấu hình kiểm tra revision và khóa Job. Cấu hình cũ trả HTTP 409; tổng trọng số sai trả 400. Thay đổi danh mục nhóm Job yêu cầu xác nhận lại cấu hình, không coi nhóm mới là đã đáp ứng.
- Điểm chỉ hỗ trợ quyết định. Không tự từ chối, gửi lời mời hoặc chuyển trạng thái.

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/jobs/{id}/rankings` |
| POST | `/api/v1/jobs/{id}/rankings/recompute` |
| GET | `/api/v1/rankings/jobs` |
| PUT | `/api/v1/jobs/{id}/rankings/config` |
| GET | `/api/v1/applications/{id}/ranking-sources` |
| PUT | `/api/v1/applications/{id}/ranking-sources` |

Response bọc `ApiResponse`. Board có `jobId`, `jobTitle`, `config`, `rankingVersion`, `calculatedAt`, `skillCategories`, `rows`. Mỗi row chứa thành phần/đóng góp, cohort, hạng, kỹ năng thiếu, bằng chứng kinh nghiệm và nguồn được sử dụng.

## Database liên quan

- `candidate_rankings`, `overall_scores`: snapshot lần tính lại gần nhất; GET luôn đọc nguồn hiện tại.
- `ranking_configs`: cấu hình JSON và revision theo Job.
- `ranking_sources`: CV/attempt/interview chính thức theo application.
- Migration tenant `V3__ranking_configuration.sql`; không thay đổi master DB.

## UI mockup

- `/recruiter/rank`: chọn Job → bốn thẻ tổng quan → cấu hình có thể mở rộng → trọng số đang dùng → bộ lọc → bảng điểm → phân trang và xuất CSV theo kết quả đang lọc. Bảng desktop ưu tiên hạng, ứng viên, các điểm chính, trạng thái và hành động xem chi tiết; màn hình nhỏ chuyển sang card ứng viên để không phụ thuộc cuộn ngang. Frontend hiện có dữ liệu preview chỉ đọc để hoàn thiện và duyệt giao diện trước khi nối đầy đủ backend.
- Nhấn tên hoặc nút xem chi tiết mở dialog thích ứng: toàn màn hình trên mobile và modal lớn trên desktop. Phần đầu tóm tắt hồ sơ, hạng, điểm tổng, bốn điểm thành phần và liên kết sang assessment/interview/lịch hẹn; phần dưới trình bày phân tích đa chiều, kỹ năng/độ bao phủ, bằng chứng kinh nghiệm, nhận xét interview, insight và timeline. Công thức trọng số được thu gọn và mở khi cần. Dialog hỗ trợ Escape và quản lý focus bằng native dialog.
- Màu, font và khoảng cách theo `DESIGN.md`. Trang Rank và dialog chi tiết kế thừa semantic color token từ `RoleShell`, không dùng palette riêng, nên luôn đồng bộ với tenant hiện tại.

## Phụ thuộc

CV-03/04/05, JOB-03/05, ASSESS-03, INT-04.

## Tiến độ và kiểm thử

- Đã triển khai thuật toán, API, lưu snapshot, cấu hình, chọn nguồn và giao diện sử dụng dữ liệu thật.
- Unit test: công thức 81,35; điểm tạm 79,30; điểm 0/thiếu; trọng số sai; alias; tương đồng khác bao phủ; loại trùng thời gian; cohort/đồng hạng; quyền tenant/Job; validation HTTP và xung đột revision.
- Integration test H2: đọc CV/assessment/interview thật, tính 84,20 theo fixture, lưu/chọn nguồn/tính lại nhiều lần chỉ còn một snapshot mỗi hồ sơ.
- Còn phụ thuộc các module tạo Job/hồ sơ, trích xuất CV, chấm assessment và AI interview hiện là scaffold. Các link chuyển module chưa thực hiện gửi lời mời/đặt lịch. Chưa tích hợp sự kiện RabbitMQ/WebSocket cập nhật ranking; dùng GET làm mới khi màn hình mở. Vì vậy trạng thái toàn luồng giữ `Doing`.
