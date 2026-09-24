# Candidate Matching Score

**Epic:** AI-Powered CV Screening & Analysis  
**Trạng thái:** `Done`
**Code ID:** `CV-05`

## Mục đích chức năng

Tính điểm khớp CV ↔ Job **sau khi đủ bước parse / extract / taxonomy**. Điểm screening là hybrid (thuật toán + Jaccard + Gemini semantic), không phải “Gemini cho một điểm”. Rank-v1 35/15/30/20 chỉ dùng ở Matching sau assessment/interview.

## Actor

- Recruiter, System

## Luồng hoạt động

1. Candidate apply (kèm CV đã upload) → gắn `job` + `application` → enqueue extract/match với đúng JD.
2. Backend đọc CV từ Cloudinary, parse text, extract (Gemini hoặc heuristic).
3. Chuẩn hóa skill bằng taxonomy (`SkillScoringService`).
4. Tính Jaccard trên tập skill đã normalize.
5. Gemini chỉ trả MATCH / PARTIAL / MISSING / UNKNOWN + evidence; **không** quyết định điểm cuối.
6. Backend tính weighted score → `match_scores` + Redis cache.

## Business Rules

- Cần CV analyzed + `job_skills` của đúng job.
- Score 0–100 + breakdown giải thích được.
- Pass: `score ≥ cvPassThreshold của Job` **và** không thiếu skill bắt buộc (`requiredMissing == 0`). Không auto-reject, không auto-hire.
- PARTIAL = 0.5 credit. UNKNOWN/MISSING = 0. Required UNKNOWN/MISSING đưa vào `requiredMissing`.
- Gemini API lỗi hoặc không có key → heuristic extract; trọng số semantic gộp vào required (theo weight của Job).
- Trọng số CV **không hard-code** trong scoring. Đọc `job_screening_configs` của Job. Rank-v1 35/15/30/20 và Gate Screening là hệ thống khác.

### Công thức hybrid-v1 (trọng số theo Job)

| Thành phần | Ký hiệu | Ý nghĩa thực tế |
|---|---|---|
| Required skills | \(R\) | Skill bắt buộc sau taxonomy + semantic |
| Preferred skills | \(P\) | Skill `required=false` |
| Jaccard | \(J\) | \(\|A \cap B\| / \|A \cup B\| \times 100\) trên skill đã normalize |
| Experience | \(E\) | \(\min(\text{candidateYears}/\text{requiredYears}, 1) \times 100\) |
| Education | \(D\) | So khớp `job.educationLevel` với học vấn trên CV |
| Semantic Gemini | \(G\) | MATCH / PARTIAL từ Gemini, không phải điểm Gemini |

\[
\text{CV Score} = R w_R + P w_P + J w_J + E w_E + D w_D + G w_G
\]

\(w_*\) là phần trăm Recruiter cấu hình cho Job, tổng 100%. Redistribute dùng **chính weight của Job**, không dùng hằng số:

- Không có preferred → cộng `preferredWeight` vào required.
- Job không yêu cầu số năm → cộng `experienceWeight` vào required.
- Job không yêu cầu học vấn → cộng `educationWeight` vào required.
- Gemini không trả requirement rows → cộng `semanticWeight` vào required.

Job cũ / payload không gửi config: snapshot công thức trước đây 40/8/12/0/15/25, ngưỡng 60 (education = 0 nên điểm cũ không đổi).

### Gate Screening (vòng gửi xe) — độc lập

Sau khi có CV Score, AI Interview Score, Assessment Score:

\[
\text{Gate Score} = \text{CV} \times w_{cv} + \text{Interview} \times w_{int} + \text{Assessment} \times w_{as}
\]

Thiếu thành phần (và weight > 0) → điểm thành phần = 0, `complete=false`, chưa PASS. Đạt khi `complete` và `Gate Score ≥ gatePassThreshold`. Job cũ snapshot 40/35/25, ngưỡng 70. Không dùng CV Screening Weights ở bước này.

Ví dụ Jaccard: Job `{Java, Spring Boot, PostgreSQL, Docker}`, CV `{Java, Spring Boot, PostgreSQL, React}` → \(3/5 = 0.6\).

Đây **không** phải điểm tuyển dụng cuối. Recruiter xem kết quả rồi quyết định vòng Human-to-Human sau AI Interview / Technical / Code Test.

## API liên quan

| Method | Path |
|---|---|
| GET/POST | `/api/v1/jobs/{jobId}/cvs/{cvId}/match` |

## Database liên quan

- `match_scores.breakdown_json` (schema mở rộng, không thêm cột)
- `job_screening_configs` (V13)
- `gate_scores` (V13, theo application)
- `applications.ai_interview_invited_at` (V14)

## UI mockup

- Google Stitch: **AI-Powered CV Screening & Analysis / Candidate Matching Score** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

CV-04, JOB-03

## Tích hợp bảng xếp hạng (rank-v1)

- Rank-v1 (`SkillScoringService` nhóm + 35/15/30/20) **không** ghi đè điểm screening. Screening dùng `hybrid-v1` trong `match_scores`.
- Alias taxonomy (`ReactJS` → `react`) nằm ở `SkillScoringService` và cột `skills.aliases_json`.
- Không dùng embedding; không lấy CV tenant khác làm few-shot.
- Chuẩn hóa NFKC, chữ thường, khoảng trắng và alias: ReactJS/React.js → react, SpringBoot → spring boot, K8s → kubernetes, My SQL → mysql, Postgres → postgresql, NodeJS → node.js, RESTful API → rest api. Java và JavaScript khác nhau.
- Gemini không được bịa skill/kinh nghiệm không có trong CV. Thiếu thông tin → MISSING hoặc UNKNOWN.
- Trang Sàng lọc CV / Applicants hiển thị Jaccard, MATCH/PARTIAL/MISSING, evidence, thành phần điểm trong dialog chi tiết. CV đạt → application chuyển `INTERVIEW` (phỏng vấn AI) và gửi email mời ứng viên làm vòng phỏng vấn AI (`applications.ai_interview_invited_at`, idempotent). SMTP chưa cấu hình thì không đánh dấu đã gửi để lần match sau thử lại.
- Job hết hạn đăng (hoặc recruiter đóng tin) → tự enqueue parse/match cho CV chưa `ANALYZED`.
- Unit test: Jaccard 3/5, alias ReactJS, bỏ qua `screening.score` của Gemini, semantic MATCH khi taxonomy miss, apply CV cũ vẫn enqueue screening.
