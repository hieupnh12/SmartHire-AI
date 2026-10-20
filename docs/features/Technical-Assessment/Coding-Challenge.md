# Coding Challenge

**Epic:** FE-05 Online Technical Assessment  
**Trạng thái:** `Doing`
**Code ID:** `ASSESS-02`

## Mục đích chức năng

Bài coding: đề, nộp code, chạy test cases (sandbox/worker).

## Actor

- Recruiter, Candidate, System grader

## Luồng hoạt động

1. Candidate submit source.
2. Queue `assessment.code.grade`.
3. Chạy test → kết quả.

## Business Rules

- Timeout/memory limit.
- Không tin tưởng client-side grade.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/submissions/{id}/coding/{questionId}/run_samples` |
| GET | `/api/v1/submissions/{id}/grading_review` |

## Database liên quan

- `coding_problems`, `test_cases`, `coding_submissions`

## UI mockup

- Google Stitch: **FE-05 Online Technical Assessment / Coding Challenge** — _[dán link]_
- Icons: xem `DESIGN.md`
- Form biên soạn trên bảng (15/10/2026): đề bài, kỹ năng và rubric 3 mức ở cột trái; khung gợi ý/starter code và đáp án mẫu nằm trong hai thẻ editor riêng ở cột phải. Tiêu chí lý thuyết hoặc cấu hình code, harness và test cases đặt bên dưới. Màn hình nhỏ xếp thành một cột; giữ các trường và thao tác lưu hiện có.
- Giao diện chia hai khu vực đánh số: nội dung/tiêu chuẩn và cấu hình chấm. Rubric phân biệt màu theo mức đạt; starter code và harness nằm cạnh nhau trong editor tối theo ngôn ngữ. Test cases có số thứ tự, nhãn công khai/ẩn và thống kê; tiêu chí lý thuyết có thanh tổng trọng số cùng nút thêm tiêu chí.

## Phụ thuộc

ASSESS-01

## Mô hình đa phần — cập nhật 2026-10-12

- UI giữ thành phần và token hiện có. Ngân hàng chung có 3 nhóm: trắc nghiệm (`MCQ`/`MULTIPLE_CHOICE`), lý thuyết (`ESSAY`), bài lập trình (`CODING`). Không di chuyển ngân hàng sang master DB; dữ liệu vẫn cách ly theo tenant.
- Essay mới biên soạn rubric gồm đáp án tham khảo và tiêu chí có tổng tỉ trọng 100%. Câu cũ thiếu rubric vẫn có thể chấm tay. Không tự chuyển câu code legacy thành bài thực thi khi chưa có harness/test.
- Form Code quản lý loại thuật toán/OOP/SQL, giới hạn thời gian/bộ nhớ, starter code, harness theo ngôn ngữ và sample/hidden tests. Khi tạo đề tự động, nội dung được sao chép độc lập từ ngân hàng.
- Candidate làm **Quiz** trước, chốt rồi vào **Coding** (HackerRank-style studio). `complete_objective` khóa Quiz; coding chỉ sau khi chốt (hoặc đề không có Quiz).
- Code: Monaco đóng gói nội bộ, chạy tối đa 5 sample tests qua `POST /api/v1/submissions/{id}/coding/{questionId}/run_samples`; hidden tests/harness không trả candidate.
- Submit chấm trắc nghiệm đồng bộ, phát RabbitMQ sau commit tới `assessment.essay.grade` và queue code cấu hình `assessment.code.grade.q`; worker concurrency 3–10 chạy trong TenantJobExecutor, header X-Tenant-ID bắt buộc.
- Essay đánh giá ngữ nghĩa theo từng rubric; code dùng 80% tỉ lệ test pass + 20% AI review. Không so chuỗi source và không chấm bằng keyword matching. Mọi điểm AI là đề xuất, recruiter duyệt hoặc điều chỉnh trong màn hình Theo dõi bài làm.
- Staff dùng GET `/api/v1/submissions/{id}/grading_review`, POST `/approve_grade/{questionId}` (body score=null để nhận gợi ý, hoặc điểm thủ công), POST `/retry_grading`. Điểm tổng chỉ công bố sau khi toàn bộ câu được chấm chính thức; giữ EXPIRED cho bài quá hạn.
- Sandbox cần cấu hình `app.assessment.judge-url` / `app.assessment.judge-token` (Spring env: APP_ASSESSMENT_JUDGE_URL / APP_ASSESSMENT_JUDGE_TOKEN). Judge0 phải hỗ trợ wait=true và các language ID Java 62/Python 71/JavaScript 63/SQL 82. Không chạy source trong tiến trình backend. AI chấm tự luận/review code dùng task `CODE_GRADING` (provider/model/key cấu hình tại `/admin/system/ai-config`, không fallback env), kèm rate-limit/metering theo task.
- Provider lỗi không tạo điểm 0. Bài giữ chờ duyệt, có thể retry hoặc chấm tay. Broker lỗi sau commit giữ dữ liệu bài làm; staff retry sau khi broker hoạt động lại. Chưa có quét tự động các bài chờ gửi/chấm.
- Schema V53: tests, questions, submissions, answers, coding_problems; không tạo bảng mới. Xem docs/database để đối chiếu FK/UNIQUE và dictionary.
