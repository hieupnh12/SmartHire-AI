# Candidate Matching Score

**Epic:** AI-Powered CV Screening & Analysis  
**Trạng thái:** `Doing`
**Code ID:** `CV-05`

## Mục đích chức năng

Tính điểm khớp CV ↔ Job (skills weighted + experience).

## Actor

- Recruiter, System

## Luồng hoạt động

1. Queue `cv.matching` hoặc sync nếu nhẹ.
2. Lưu `match_scores` + Redis cache.

## Business Rules

- Cần CV analyzed + job skills.
- Score 0–100 + breakdown.

## API liên quan

| Method | Path |
|---|---|
| GET/POST | `/api/v1/jobs/{jobId}/cvs/{cvId}/match` |

## Database liên quan

- `match_scores`

## UI mockup

- Google Stitch: **AI-Powered CV Screening & Analysis / Candidate Matching Score** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

CV-04, JOB-03

## Tích hợp bảng xếp hạng (rank-v1)

- Đã triển khai `SkillScoringService` dùng trong RANK-01; chỉ đọc CV ANALYZED liên kết application. Endpoint match độc lập và queue/cache phía trên chưa triển khai.
- Chuẩn hóa NFKC, chữ thường, khoảng trắng và alias: ReactJS/React.js → react, SpringBoot → spring boot, K8s → kubernetes, My SQL → mysql, Postgres → postgresql, NodeJS → node.js, RESTful API → rest api. Java và JavaScript khác nhau.
- Nhóm ưu tiên `skills.category`, chuẩn hóa BE/FE/DB; nếu thiếu dùng ánh xạ xác định cho kỹ năng phổ biến, còn lại `other`. Chuẩn hóa cả CV và Job; kỹ năng trùng alias chỉ tính một lần.
- Với mỗi kỹ năng yêu cầu, lấy mức tương đồng lớn nhất từ CV: khớp chuẩn=1; cặp mysql/postgresql=0,5; các cặp khác=0. Đây là bộ quy tắc xác định ban đầu, không dùng embedding/LLM và không suy ra độ tương đồng chỉ từ cùng category. Muốn mở rộng phải thay quy tắc, test và phiên bản thuật toán.
- Điểm nhóm = trung bình tương đồng có trọng số `job_skills.weight` × 100. Trọng số kỹ năng phải >0. Độ bao phủ trực tiếp = số yêu cầu khớp chuẩn / số yêu cầu duy nhất × 100, hiển thị riêng.
- Điểm kỹ năng S = tổng điểm nhóm × trọng số nhóm /100. Yêu cầu bắt buộc chưa khớp trực tiếp được gắn cờ, kể cả khi có kỹ năng liên quan. Không tự từ chối hồ sơ.
- Điểm S và kinh nghiệm E tham gia riêng trong công thức RANK-03 để không tính trùng kinh nghiệm. Bằng chứng kỹ năng hiện là tên gốc từ `cv_skills.skill_name`; chưa có vị trí/đoạn văn gốc CV trong schema này.
- Unit test bao phủ alias, không nhầm Java/JavaScript, không suy diễn Docker/Kubernetes, bao phủ khác tương đồng, loại trùng và trọng số nhóm.
