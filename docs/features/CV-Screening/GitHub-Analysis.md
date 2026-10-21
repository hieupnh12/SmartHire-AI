# Phân tích GitHub khi sàng CV

**Epic:** AI-Powered CV Screening & Analysis  
**Trạng thái:** `Done`  
**Code ID:** `CV-06`

## Mục đích chức năng

Sau khi chấm CV theo JD, đọc repository GitHub **công khai** mà ứng viên đã ghi trong CV và tìm bằng chứng kỹ thuật trong một số file liên quan. Kết quả hỗ trợ recruiter. Không thay điểm CV và không tự quyết định tuyển dụng.

## Actor

- System, Recruiter

## Luồng hoạt động

1. CV đi qua `cv.parse` → `cv.extract` → `cv.analysis` → `cv.matching` như hiện tại.
2. Nếu chấm xong, hệ thống publish `cv.github`. Request ứng tuyển không chờ phân tích repository.
3. Worker đọc URL từ `personalInfo.github` trong CV Builder và từ văn bản CV. Chỉ nhận `https://github.com/{owner}` hoặc `https://github.com/{owner}/{repo}`.
4. GitHub API lấy metadata, commit SHA, cây thư mục và nội dung một ít file. Không tải archive và không chạy code.
5. File được chọn theo kỹ năng của job. `node_modules`, `target`, `dist`, file sinh tự động và file nhị phân bị bỏ.
6. Gemini chỉ được gọi khi đã có file nguồn. Prompt đánh dấu nội dung repository là dữ liệu không tin cậy.
7. Kết quả ghi `github_analyses`. Cùng repo, cùng commit, cùng nhóm kỹ năng và cùng `strategy_version` thì dùng `github_repo_caches`.

## Business Rules

- Không có GitHub, URL sai, repository private, lỗi API hoặc thiếu file nguồn: `score` là null. Không gán 0 và không làm CV fail.
- Không kết luận thành thạo một kỹ năng chỉ vì có dependency hoặc README.
- Không kết luận ứng viên là tác giả toàn bộ repository.
- Commit mới chỉ đọc lại file liên quan đã đổi. Đổi file kiến trúc (`pom.xml`, cấu hình, security) thì chọn lại bộ file, không gửi cả repository.
- Đổi `app.github.strategy-version` hoặc prompt/model trong fingerprint thì không dùng cache cũ.
- Giới hạn mặc định: 2 repository, 8 file, 12 KB/file, 48 KB tổng, 60.000 ký tự prompt, timeout 12 giây, retry GitHub 2 lần, listener `1-2`.
- Token GitHub tuỳ chọn (`GITHUB_TOKEN`) chỉ để tăng rate limit. Không nhận token của ứng viên.
- Task model `GITHUB_ANALYSIS` dùng cấu hình Admin nếu có; không có thì dùng chuỗi model của `CV_PARSING`. Prompt sàng CV không đổi.

## API liên quan

| Method | Path | Ghi chú |
|---|---|---|
| GET | `/api/v1/cvs/{id}` | Recruiter nhận `githubAnalysis`. Ứng viên không nhận field này |
| POST | `/api/v1/cvs/{id}/parse` | Chạy lại pipeline CV; bản inline cũng gọi phân tích GitHub sau khi chấm |

## Database liên quan

- `github_analyses`, `github_repo_caches`
- URL GitHub của CV Builder vẫn nằm trong `cvs.builder_data`, không có cột mới trên `cvs`

## UI

- Dialog sàng CV của recruiter và ngăn CV trong hồ sơ ứng viên: trạng thái, điểm GitHub riêng, repository, kỹ năng, file làm căn cứ, điểm mạnh, điểm cần cải thiện và phần chưa xác minh.

## Phụ thuộc

CV-05. Lỗi của bước này không đổi `match_scores` hay `cvs.status`.
