# Phân tích GitHub khi sàng CV

**Epic:** AI-Powered CV Screening & Analysis  
**Trạng thái:** `Done`  
**Code ID:** `CV-06`

## Mục đích chức năng

Sau khi chấm CV theo JD, đọc repository GitHub **công khai** mà ứng viên đã ghi trong CV, xác thực quyền tác giả/lịch sử đóng góp qua GitHub REST API (0 token AI) và đánh giá chọn lọc một số file mã nguồn cốt lõi bằng AI để đưa ra bằng chứng kỹ thuật & độ tin cậy cho recruiter. Không thay điểm CV và không tự quyết định tuyển dụng.

## Actor

- System, Recruiter

## Luồng hoạt động

1. CV đi qua `cv.parse` → `cv.extract` → `cv.analysis` → `cv.matching` như hiện tại.
2. Nếu chấm xong, hệ thống publish `cv.github`. Request ứng tuyển không chờ phân tích repository.
3. Worker đọc URL từ `personalInfo.github` trong CV Builder (parse JSON) và từ văn bản CV. Chỉ nhận `https://github.com/{owner}` hoặc `https://github.com/{owner}/{repo}`.
4. Trước khi gọi AI, `GithubAuthenticityAnalyzer` chạy kiểm tra xác thực **0 token AI** qua GitHub REST API (`/users/{owner}` cache Redis 24h, `/repos/{owner}/{repo}/commits?per_page=30`, so sánh parent nếu là fork) và đối chiếu:
   - Tỷ lệ commit khớp tên/email trong CV hoặc handle khai báo;
   - Số tác giả (dự án nhóm vs cá nhân), số ngày commit rải thực tế, cảnh báo "1-commit dump" hay "fork nguyên bản 0 commit mới";
   - Phát hiện nhiều CV trong cùng job dùng trùng repository qua `github_analyses.source_urls`.
5. **Trust Gate & Tiết kiệm Token:** Nếu phát hiện fork nguyên bản (`ahead_by == 0`) hoặc repo bên thứ 3 không có commit nào của ứng viên, hệ thống dừng ở bước deterministic (`PARTIAL`, `TRUST_GATE_SKIPPED`) — **0 token LLM**.
6. `GithubStackExtractor` trích xuất ngắn gọn thư viện từ `pom.xml`/`package.json`/`requirements.txt`/`go.mod` (~30 tokens), không tốn slot đọc XML/JSON thô cho AI. `GithubFileSelector` ưu tiên file nghiệp vụ/kiến trúc (`service`, `controller`, `security`, `config`, `test`), hạ điểm boilerplate (`dto`, `entity`), và `GithubText.compactSource` nén header/imports lặp.
7. Với ứng viên có 2 repo: Repo 2 dùng delta-skills (chỉ hỏi kỹ năng chưa `VERIFIED` ở Repo 1) hoặc dừng gọi AI nếu Repo 1 đã xác minh đủ toàn bộ kỹ năng.
8. Kết quả lưu `github_analyses` (`result_json` gồm `skills`, `codeDepth`, `authenticityCue`, `claimChecks`, `interviewProbes`, `authenticity`, `limits`; `source_urls` lưu danh sách repo đã kiểm tra). Phần đánh giá kỹ thuật chung của repo dùng lại `github_repo_caches`, còn lớp xác thực danh tính/trùng lặp luôn tính riêng cho từng ứng viên.

## Business Rules

- Không có GitHub, URL sai, repository private, lỗi API, thiếu file nguồn hoặc Trust Gate skip: `score` là null. Không gán 0 và không làm CV fail.
- Không kết luận thành thạo một kỹ năng chỉ vì có dependency hoặc README.
- Không kết luận ứng viên là tác giả toàn bộ repository; hiển thị rõ số commit khớp / mẫu commit và danh sách tác giả.
- Commit mới chỉ đọc lại file liên quan đã đổi. Đổi file kiến trúc (`pom.xml`, cấu hình, security) thì chọn lại bộ file, không gửi cả repository.
- Đổi `app.github.strategy-version` (`github-v2`) hoặc `prompt-version` (`github-prompt-v2`) / model trong fingerprint thì không dùng cache cũ.
- Giới hạn mặc định: 2 repository, 6 file/repo, 8 KB/file, 28 KB tổng, 28.000 ký tự prompt, README tối đa 600 ký tự, timeout 12 giây, retry GitHub 2 lần, listener `1-2`.
- Token GitHub tuỳ chọn (`GITHUB_TOKEN`) chỉ để tăng rate limit. Không nhận token của ứng viên.
- Task model `GITHUB_ANALYSIS` được quản trị tại `/admin/system/ai-config`.

## API liên quan

| Method | Path | Ghi chú |
|---|---|---|
| GET | `/api/v1/jobs/{jobId}/cvs` | Trả kèm `githubStatus`, `githubScore`, `githubTrustLevel` trong `CvSummary` cho recruiter |
| GET | `/api/v1/cvs/{id}` | Recruiter nhận `githubAnalysis` đầy đủ (`authenticity`, `claimChecks`, `interviewProbes`, `skills`). Ứng viên không nhận field này |
| POST | `/api/v1/cvs/{id}/parse` | Chạy lại pipeline CV; bản inline cũng gọi phân tích GitHub sau khi chấm |

## Database liên quan

- `github_analyses`, `github_repo_caches` (không thay đổi schema DDL)
- URL GitHub của CV Builder vẫn nằm trong `cvs.builder_data`, không có cột mới trên `cvs`

## UI

- Bảng Sàng lọc CV (`/recruiter/jobs/:jobId/cvs`): cột `GitHub` hiển thị nhanh điểm / độ tin cậy / cảnh báo tác giả.
- Tab `Bằng chứng GitHub` trên trang Chi tiết CV: khối xác thực tác giả & lịch sử commit (0 token), nhận định độ sâu code, đối chiếu CV vs code, câu hỏi gợi ý phỏng vấn, và link bấm thẳng tới từng file tại đúng commit SHA trên GitHub (`.../blob/{sha}/{path}`).

## Phụ thuộc

CV-05. Lỗi của bước này không đổi `match_scores` hay `cvs.status`.
