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
- Pass: `score ≥ 60` **và** không thiếu skill bắt buộc (`requiredMissing == 0`). Không auto-reject, không auto-hire.
- PARTIAL = 0.5 credit. UNKNOWN/MISSING = 0. Required UNKNOWN/MISSING đưa vào `requiredMissing`.
- Gemini API lỗi hoặc không có key → heuristic extract; trọng số semantic gộp vào required.

### Công thức hybrid-v1

| Thành phần | Ký hiệu | Trọng số gốc | Ý nghĩa thực tế |
|---|---|---|---|
| Required skills | \(R\) | **40** | Lọc vòng đầu: skill bắt buộc sau taxonomy + semantic |
| Semantic Gemini | \(G\) | **25** | Hiểu ngữ nghĩa (“REST APIs with Spring Boot” ≈ Spring Boot) |
| Jaccard | \(J\) | **15** | \(\|A \cap B\| / \|A \cup B\| \times 100\) trên skill đã normalize |
| Experience | \(E\) | **12** | \(\min(\text{candidateYears}/\text{requiredYears}, 1) \times 100\) |
| Preferred skills | \(P\) | **8** | Skill `required=false`; không được át required |

\[
\text{CV Score} = (R \times w_R + P \times w_P + J \times w_J + E \times w_E + G \times w_G) / 100
\]

Redistribute (không hard-code im lặng):

- Không có preferred → \(w_P=0\), cộng 8 vào \(w_R\).
- Job không yêu cầu số năm → \(w_E=0\), cộng 12 vào \(w_R\).
- Gemini không trả requirement rows → \(w_G=0\), cộng 25 vào \(w_R\); \(G\) không tham gia.

Ví dụ (có đủ 5 thành phần): \(R=80, G=75, J=60, E=100, P=50\)  
→ \(80\times0.40 + 50\times0.08 + 60\times0.15 + 100\times0.12 + 75\times0.25 = 75.15\).

Ví dụ Jaccard: Job `{Java, Spring Boot, PostgreSQL, Docker}`, CV `{Java, Spring Boot, PostgreSQL, React}` → \(3/5 = 0.6\).

Đây **không** phải điểm tuyển dụng cuối. Recruiter xem kết quả rồi quyết định vòng Human-to-Human sau AI Interview / Technical / Code Test.

## API liên quan

| Method | Path |
|---|---|
| GET/POST | `/api/v1/jobs/{jobId}/cvs/{cvId}/match` |

## Database liên quan

- `match_scores.breakdown_json` (schema mở rộng, không thêm cột)

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
- Trang Sàng lọc CV / Applicants hiển thị Jaccard, MATCH/PARTIAL/MISSING, evidence, thành phần điểm. CV đạt → application chuyển `INTERVIEW` (phỏng vấn AI).
- Unit test: Jaccard 3/5, alias ReactJS, bỏ qua `screening.score` của Gemini, semantic MATCH khi taxonomy miss, apply CV cũ vẫn enqueue screening.
