# Data Dictionary — Tenant DB (MySQL)

> Trở về [Database Design & ERD](README.md) · Xem thêm [Data Dictionary Master](DATA_DICTIONARY_MASTER.md)

**Database:** một MySQL riêng cho mỗi doanh nghiệp · **Số bảng:** 45
**Nguồn:** `backend/src/main/resources/db/migration/tenant/V1…V8`
**Entity:** `com.smarthire.domain.tenant.entity` · **Hibernate:** `hbm2ddl.auto = none`

Ký hiệu: `PK` khoá chính · `FK` khoá ngoại đã khai báo · `UQ` thuộc ràng buộc unique · `IDX` có index ·
`ref*` trông như khoá ngoại nhưng **không** có ràng buộc trong database.

**Quy ước áp dụng cho mọi bảng trong file này**

- `id` luôn là `BIGINT AUTO_INCREMENT PRIMARY KEY`, trừ `ranking_configs` và `ranking_sources` dùng khoá tự nhiên.
- `created_at` là `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`.
- `updated_at` là `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` (chỉ có ở một số bảng).
- Cột trạng thái lưu `VARCHAR(32)`, ánh xạ bằng `@Enumerated(EnumType.STRING)`, **không** có `CHECK` constraint.
- Entity dùng `Instant` cho cột thời gian và `@ManyToOne(fetch = LAZY)` cho khoá ngoại.
- **Không bảng nào có cột `tenant_id`** — cách ly dữ liệu do việc chọn datasource đảm nhiệm.

**Mục lục**

- [A. Identity & Access](#a-identity--access) — 4 bảng
- [B. Job & Skill](#b-job--skill) — 4 bảng
- [C. Application pipeline](#c-application-pipeline) — 4 bảng
- [D. CV & AI screening](#d-cv--ai-screening) — 6 bảng
- [E. Ranking](#e-ranking) — 5 bảng
- [F. Assessment & Proctoring](#f-assessment--proctoring) — 11 bảng
- [G. AI Interview](#g-ai-interview) — 6 bảng
- [H. Notification](#h-notification) — 2 bảng
- [I. Practice](#i-practice) — 3 bảng

---

## A. Identity & Access

### A.1 `users` — Người dùng của doanh nghiệp

Entity `User` (kế thừa `BaseEntity`). Mọi vai trò dùng chung một bảng, phân biệt bằng `role`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `email` | VARCHAR(255) | UQ | Không | — | Email đăng nhập, unique trong phạm vi tenant |
| `password_hash` | VARCHAR(255) | | Có | NULL | NULL với tài khoản chỉ đăng nhập bằng OAuth |
| `full_name` | VARCHAR(255) | | Không | — | Họ tên |
| `role` | VARCHAR(32) | | Không | — | `UserRole`: TENANT_ADMIN, ADMIN, HR, RECRUITER, CANDIDATE |
| `status` | VARCHAR(32) | | Không | `'ACTIVE'` | `UserStatus`: ACTIVE, LOCKED, DISABLED |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | TIMESTAMP | | Không | now on update | |

**Ràng buộc:** `uk_users_email`

### A.2 `oauth_accounts` — Liên kết đăng nhập ngoài

Entity `OauthAccount`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `user_id` | BIGINT | FK → `users.id` | Không | — | Tài khoản được liên kết |
| `provider` | VARCHAR(32) | UQ | Không | — | `OAuthProvider`: hiện chỉ `GOOGLE` |
| `provider_user_id` | VARCHAR(255) | UQ | Không | — | Định danh người dùng phía provider |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_oauth_user`, `uk_oauth_provider_user (provider, provider_user_id)`

### A.3 `user_profiles` — Hồ sơ mở rộng

Entity `UserProfile` (kế thừa `BaseEntity`).

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `user_id` | BIGINT | FK → `users.id`, UQ | Không | — | 1:1 với tài khoản |
| `phone` | VARCHAR(32) | | Có | NULL | Điện thoại |
| `avatar_url` | VARCHAR(512) | | Có | NULL | Ảnh đại diện |
| `bio` | TEXT | | Có | NULL | Giới thiệu bản thân |
| `headline` | VARCHAR(255) | | Có | NULL | Dòng tiêu đề nghề nghiệp |
| `links_json` | JSON | | Có | NULL | Liên kết mạng xã hội, portfolio |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | TIMESTAMP | | Không | now on update | |

**Ràng buộc:** `fk_profile_user`, `uk_profile_user (user_id)`

### A.4 `member_invitations` — Lời mời nhân sự

Entity `MemberInvitation` (kế thừa `BaseEntity`). Không có khoá ngoại tới `users`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `email` | VARCHAR(255) | | Không | — | Email người được mời |
| `full_name` | VARCHAR(255) | | Không | — | Họ tên người được mời |
| `role` | VARCHAR(32) | | Không | — | Vai trò sẽ được cấp khi chấp nhận |
| `token_hash` | VARCHAR(64) | UQ | Không | — | **Hash** của token mời; token gốc không bao giờ được lưu hay log |
| `status` | VARCHAR(32) | | Không | `'PENDING'` | `InvitationStatus`: PENDING, ACCEPTED |
| `expires_at` | TIMESTAMP | | Không | — | Hạn dùng của lời mời |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | TIMESTAMP | | Không | now on update | |

**Ràng buộc:** `uk_member_invitations_token_hash`

---

## B. Job & Skill

### B.1 `jobs` — Tin tuyển dụng

Entity `Job` (kế thừa `BaseEntity`). Bảng được mở rộng qua V2 và V6.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `title` | VARCHAR(255) | | Không | — | Tiêu đề tin |
| `description` | TEXT | | Không | — | Mô tả công việc |
| `location` | VARCHAR(255) | | Có | NULL | Địa điểm làm việc |
| `employment_type` | VARCHAR(32) | | Có | NULL | Toàn thời gian, bán thời gian, hợp đồng… |
| `status` | VARCHAR(32) | | Không | `'DRAFT'` | `JobStatus`: DRAFT, PUBLISHED, PAUSED, CLOSED, ARCHIVED |
| `created_by` | BIGINT | FK → `users.id` | Không | — | Recruiter tạo tin |
| `published_at` | TIMESTAMP | | Có | NULL | Thời điểm đăng công khai (V2) |
| `paused_at` | TIMESTAMP | | Có | NULL | Thời điểm tạm dừng (V6) |
| `closed_at` | TIMESTAMP | | Có | NULL | Thời điểm đóng tin |
| `deleted_at` | TIMESTAMP | | Có | NULL | Xoá mềm (V2); khác với `status` |
| `department` | VARCHAR(128) | | Có | NULL | Phòng ban (V6) |
| `work_mode` | VARCHAR(32) | | Có | NULL | Onsite, hybrid, remote (V6) |
| `headcount` | INT | | Có | NULL | Số lượng cần tuyển (V6) |
| `deadline` | DATE | | Có | NULL | Hạn nộp hồ sơ (V6) |
| `salary_min` | DECIMAL(12,2) | | Có | NULL | Lương tối thiểu (V6) |
| `salary_max` | DECIMAL(12,2) | | Có | NULL | Lương tối đa (V6) |
| `salary_currency` | VARCHAR(8) | | Có | NULL | Đơn vị tiền tệ (V6) |
| `salary_visible` | BOOLEAN | | Không | TRUE | Có hiển thị lương ra trang công khai không (V6) |
| `responsibilities` | TEXT | | Có | NULL | Trách nhiệm công việc (V6) |
| `benefits` | TEXT | | Có | NULL | Phúc lợi (V6) |
| `min_years_experience` | DECIMAL(4,1) | | Có | NULL | Số năm kinh nghiệm tối thiểu (V6) |
| `education_level` | VARCHAR(64) | | Có | NULL | Trình độ học vấn tối thiểu (V6) |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | TIMESTAMP | | Không | now on update | |

**Ràng buộc:** `fk_jobs_user`

### B.2 `skills` — Từ điển kỹ năng

Entity `Skill`. Bảng không có cột thời gian.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `name` | VARCHAR(128) | UQ | Không | — | Tên kỹ năng chuẩn |
| `category` | VARCHAR(64) | | Có | NULL | Nhóm kỹ năng |
| `aliases_json` | JSON | | Có | NULL | Các biến thể tên gom về kỹ năng này (V5) |

**Ràng buộc:** `uk_skills_name`

### B.3 `job_skills` — Kỹ năng yêu cầu của tin tuyển dụng

Entity `JobSkill`. Bảng nối N-N có thuộc tính.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `job_id` | BIGINT | FK → `jobs.id`, UQ | Không | — | Tin tuyển dụng |
| `skill_id` | BIGINT | FK → `skills.id`, UQ | Không | — | Kỹ năng |
| `required` | BOOLEAN | | Không | TRUE | Bắt buộc hay chỉ là điểm cộng |
| `weight` | DECIMAL(5,2) | | Không | 1.00 | Trọng số khi chấm điểm khớp |
| `min_level` | VARCHAR(32) | | Có | NULL | Cấp độ tối thiểu |

**Ràng buộc:** `fk_js_job`, `fk_js_skill`, `uk_job_skill (job_id, skill_id)`

### B.4 `recruitment_stages` — Vòng tuyển của tin tuyển dụng

Entity `RecruitmentStage`. Bảng không có cột thời gian.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `job_id` | BIGINT | FK → `jobs.id` | Không | — | Tin tuyển dụng sở hữu vòng này |
| `name` | VARCHAR(128) | | Không | — | Tên vòng |
| `sort_order` | INT | | Không | — | Thứ tự trong pipeline |
| `is_terminal` | BOOLEAN | | Không | FALSE | Đánh dấu vòng kết thúc |

**Ràng buộc:** `fk_rs_job`

---

## C. Application pipeline

### C.1 `applications` — Đơn ứng tuyển (bảng trung tâm)

Entity `Application` (kế thừa `BaseEntity`). Mở rộng qua V7.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `job_id` | BIGINT | FK → `jobs.id`, UQ, IDX | Không | — | Tin ứng tuyển |
| `candidate_id` | BIGINT | FK → `users.id`, UQ | Không | — | Ứng viên |
| `stage_id` | BIGINT | FK → `recruitment_stages.id` | Có | NULL | Vòng tuyển hiện tại |
| `status` | VARCHAR(32) | IDX | Không | `'NEW'` | `ApplicationStatus` — 8 giá trị |
| `source` | VARCHAR(64) | | Có | NULL | Nguồn ứng tuyển |
| `notes` | TEXT | | Có | NULL | Ghi chú nội bộ của recruiter |
| `referral_code` | VARCHAR(64) | | Có | NULL | Mã giới thiệu (V7) |
| `tags` | VARCHAR(512) | | Có | NULL | Nhãn phân loại, lưu dạng chuỗi (V7) |
| `assignee_id` | BIGINT | FK → `users.id` | Có | NULL | Người phụ trách đơn (V7) |
| `archived_at` | TIMESTAMP | IDX | Có | NULL | Lưu trữ đơn, tách khỏi danh sách hoạt động (V7) |
| `reject_reason` | TEXT | | Có | NULL | Lý do từ chối (V7) |
| `withdrawn_at` | TIMESTAMP | | Có | NULL | Thời điểm ứng viên rút đơn (V7) |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | TIMESTAMP | | Không | now on update | |

**Ràng buộc:** `fk_app_job`, `fk_app_candidate`, `fk_app_stage`, `fk_app_assignee`,
`uk_app_job_candidate (job_id, candidate_id)`
**Index:** `idx_app_job_status (job_id, status)`, `idx_app_archived (job_id, archived_at)`

### C.2 `application_status_history` — Nhật ký đổi trạng thái

Entity `ApplicationStatusHistory`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `application_id` | BIGINT | FK → `applications.id` | Không | — | Đơn liên quan |
| `from_status` | VARCHAR(32) | | Có | NULL | Trạng thái trước; NULL ở lần ghi đầu tiên |
| `to_status` | VARCHAR(32) | | Không | — | Trạng thái sau |
| `changed_by` | BIGINT | ref* | Có | NULL | Người thực hiện — **không có khoá ngoại** |
| `note` | TEXT | | Có | NULL | Ghi chú kèm theo |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_ash_app`

### C.3 `hiring_decisions` — Quyết định tuyển dụng

Entity `HiringDecision`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `application_id` | BIGINT | FK → `applications.id` | Không | — | Đơn được quyết định |
| `decision` | VARCHAR(32) | | Không | — | `HiringDecisionType`: HIRE, REJECT, HOLD |
| `reason` | TEXT | | Có | NULL | Lý do |
| `decided_by` | BIGINT | ref* | Không | — | Người quyết định — **không có khoá ngoại** |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_hd_app`

### C.4 `interview_schedules` — Lịch phỏng vấn

Entity `InterviewSchedule`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `application_id` | BIGINT | FK → `applications.id` | Không | — | Đơn được hẹn lịch |
| `interview_id` | BIGINT | ref* | Có | NULL | Phiên phỏng vấn AI liên quan — **không có khoá ngoại**, entity map thành `Long` |
| `starts_at` | TIMESTAMP | | Không | — | Thời điểm bắt đầu |
| `ends_at` | TIMESTAMP | | Không | — | Thời điểm kết thúc |
| `timezone` | VARCHAR(64) | | Không | `'UTC'` | Múi giờ hiển thị cho ứng viên |
| `status` | VARCHAR(32) | | Không | `'PROPOSED'` | `ScheduleStatus`: PROPOSED, CONFIRMED, CANCELLED, DONE |
| `location_or_url` | VARCHAR(512) | | Có | NULL | Địa điểm hoặc link họp |
| `created_by` | BIGINT | ref* | Không | — | Người tạo lịch — **không có khoá ngoại** |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_isched_app`

---

## D. CV & AI screening

### D.1 `cvs` — Hồ sơ CV

Entity `Cv` (kế thừa `BaseEntity`). Mở rộng qua V2, V5, V7, V8.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `job_id` | BIGINT | FK → `jobs.id` | **Có** (từ V8) | NULL | Tin tuyển dụng; để trống khi CV thuộc kho hồ sơ |
| `user_id` | BIGINT | FK → `users.id` | Không | — | Chủ sở hữu CV |
| `application_id` | BIGINT | ref* | Có | NULL | Đơn ứng tuyển — **không có khoá ngoại** (V2) |
| `original_filename` | VARCHAR(255) | | Không | — | Tên file gốc do người dùng tải lên |
| `file_url` | VARCHAR(512) | | Không | — | URL truy cập file |
| `storage_key` | VARCHAR(512) | | Có | NULL | Khoá lưu trữ nội bộ (V5) |
| `mime_type` | VARCHAR(128) | | Có | NULL | Kiểu MIME đã xác thực (V5) |
| `file_size` | BIGINT | | Có | NULL | Dung lượng byte (V5) |
| `checksum_sha256` | CHAR(64) | | Có | NULL | Checksum để phát hiện file trùng (V5) |
| `retain_until` | TIMESTAMP | | Có | NULL | Mốc hết hạn lưu trữ; V7 backfill 24 tháng từ `created_at` |
| `status` | VARCHAR(32) | | Không | `'UPLOADED'` | `CvStatus` — 7 giá trị theo chặng pipeline |
| `error_code` | VARCHAR(64) | | Có | NULL | Mã lỗi khi pipeline hỏng (V5) |
| `error_message` | VARCHAR(512) | | Có | NULL | Thông điệp lỗi, bị cắt còn tối đa 512 ký tự (V5) |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | TIMESTAMP | | Không | now on update | |

**Ràng buộc:** `fk_cvs_job`, `fk_cvs_user`

### D.2 `cv_documents` — Văn bản thô (chặng 1)

Entity `CvDocument`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `cv_id` | BIGINT | FK → `cvs.id`, UQ | Không | — | CV nguồn |
| `raw_text` | LONGTEXT | | Có | NULL | Toàn bộ văn bản bóc từ file |
| `page_count` | INT | | Có | NULL | Số trang |
| `parser_version` | VARCHAR(64) | | Có | NULL | Phiên bản bộ parser (V5) |
| `ocr_used` | BOOLEAN | | Không | FALSE | Đã phải dùng OCR hay không (V5) |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_cvdoc_cv`, `uk_cvdoc_cv (cv_id)`

### D.3 `cv_extractions` — Bóc tách có cấu trúc (chặng 2)

Entity `CvExtraction`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `cv_id` | BIGINT | FK → `cvs.id`, UQ | Không | — | CV nguồn |
| `extraction_json` | JSON | | Không | — | Học vấn, kinh nghiệm, dự án… dạng có cấu trúc |
| `model_version` | VARCHAR(64) | | Có | NULL | Phiên bản model AI |
| `prompt_version` | VARCHAR(64) | | Có | NULL | Phiên bản prompt (V5) |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | DATETIME | | Có | NULL | Kiểu `DATETIME` chứ không phải `TIMESTAMP` — MySQL 5.7 chỉ cho một cột `ON UPDATE` mỗi bảng (V5) |

**Ràng buộc:** `fk_cvext_cv`, `uk_cvext_cv (cv_id)`

### D.4 `cv_analyses` — Phân tích và tóm tắt (chặng 3)

Entity `CvAnalysis`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `cv_id` | BIGINT | FK → `cvs.id`, UQ | Không | — | CV nguồn |
| `summary` | TEXT | | Có | NULL | Tóm tắt ứng viên |
| `skills_json` | JSON | | Có | NULL | Kỹ năng tổng hợp |
| `years_experience` | DECIMAL(4,1) | | Có | NULL | Số năm kinh nghiệm ước tính |
| `raw_json` | JSON | | Có | NULL | Phản hồi thô của model, để truy vết |
| `model_version` | VARCHAR(64) | | Có | NULL | Phiên bản model AI |
| `prompt_version` | VARCHAR(64) | | Có | NULL | Phiên bản prompt (V5) |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_cv_analyses_cv`, `uk_cv_analyses_cv (cv_id)`

### D.5 `cv_skills` — Kỹ năng phát hiện trong CV

Entity `CvSkill`. Bảng không có cột thời gian.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `cv_id` | BIGINT | FK → `cvs.id` | Không | — | CV nguồn |
| `skill_id` | BIGINT | ref* | Có | NULL | Kỹ năng trong từ điển — **không có khoá ngoại**, để trống khi chưa map được |
| `skill_name` | VARCHAR(128) | | Không | — | Tên kỹ năng như AI đọc được |
| `confidence` | DECIMAL(5,2) | | Có | NULL | Độ tin cậy của phát hiện |
| `level` | VARCHAR(32) | | Có | NULL | Cấp độ ước tính |

**Ràng buộc:** `fk_cvsk_cv`

### D.6 `match_scores` — Điểm khớp job ↔ CV

Entity `MatchScore`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `job_id` | BIGINT | FK → `jobs.id`, UQ | Không | — | Tin tuyển dụng |
| `cv_id` | BIGINT | FK → `cvs.id`, UQ | Không | — | CV được chấm |
| `score` | DECIMAL(5,2) | | Không | — | Điểm khớp |
| `breakdown_json` | JSON | | Có | NULL | Chi tiết cách tính điểm |
| `model_version` | VARCHAR(64) | | Có | NULL | Phiên bản model chấm |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | TIMESTAMP | | Không | now on update | |

**Ràng buộc:** `fk_match_job`, `fk_match_cv`, `uk_match_job_cv (job_id, cv_id)`

---

## E. Ranking

### E.1 `overall_scores` — Điểm tổng hợp của đơn

Entity `OverallScore`. Bảng chỉ có `updated_at`, không có `created_at`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `application_id` | BIGINT | FK → `applications.id`, UQ | Không | — | Đơn được chấm |
| `overall` | DECIMAL(5,2) | | Không | — | Điểm tổng hợp cuối cùng |
| `breakdown_json` | JSON | | Có | NULL | Đóng góp của từng nguồn điểm |
| `ranking_version` | VARCHAR(32) | | Có | NULL | Phiên bản thuật toán đã dùng |
| `updated_at` | TIMESTAMP | | Không | now on update | |

**Ràng buộc:** `fk_os_app`, `uk_os_app (application_id)`

### E.2 `candidate_rankings` — Thứ hạng ứng viên trong job

Entity `CandidateRanking`. Bảng chỉ có `updated_at`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `job_id` | BIGINT | FK → `jobs.id`, UQ | Không | — | Phạm vi xếp hạng |
| `application_id` | BIGINT | FK → `applications.id`, UQ | Không | — | Đơn được xếp hạng |
| `rank_position` | INT | | Không | — | Vị trí trong bảng xếp hạng |
| `score` | DECIMAL(5,2) | | Không | — | Điểm dùng để xếp hạng |
| `ranking_version` | VARCHAR(32) | | Có | NULL | Phiên bản thuật toán |
| `updated_at` | TIMESTAMP | | Không | now on update | |

**Ràng buộc:** `fk_cr_job`, `fk_cr_app`, `uk_cr_job_app (job_id, application_id)`

### E.3 `ranking_configs` — Cấu hình trọng số chấm điểm

Entity `RankingConfig`. **Khoá chính tự nhiên** là `job_id`, ép quan hệ 1:1 với `jobs`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `job_id` | BIGINT | PK, FK → `jobs.id` | Không | — | Tin tuyển dụng sở hữu cấu hình |
| `config_json` | JSON | | Không | — | Bộ trọng số cho từng nguồn điểm |
| `revision` | BIGINT | | Không | 1 | Tăng mỗi lần cấu hình thay đổi |

**Ràng buộc:** `fk_rank_config_job`

### E.4 `ranking_sources` — Nguồn điểm đã dùng để xếp hạng

Entity `RankingSource`. **Khoá chính tự nhiên** là `application_id`. Cả ba cột nguồn đều có khoá ngoại thật.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `application_id` | BIGINT | PK, FK → `applications.id` | Không | — | Đơn được xếp hạng |
| `cv_id` | BIGINT | FK → `cvs.id` | Có | NULL | CV đã dùng để tính điểm |
| `attempt_id` | BIGINT | FK → `attempts.id` | Có | NULL | Lượt thi đã dùng |
| `interview_id` | BIGINT | FK → `interviews.id` | Có | NULL | Phiên phỏng vấn đã dùng |

**Ràng buộc:** `fk_rank_source_app`, `fk_rank_source_cv`, `fk_rank_source_attempt`, `fk_rank_source_interview`

### E.5 `recommendations` — Gợi ý đa hình

Entity `Recommendation`. **Không có khoá ngoại nào** — toàn vẹn phụ thuộc hoàn toàn vào tầng service.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `subject_type` | VARCHAR(32) | | Không | — | Loại đối tượng nhận gợi ý |
| `subject_id` | BIGINT | ref* | Không | — | Id đối tượng nhận, diễn giải theo `subject_type` |
| `target_type` | VARCHAR(32) | | Không | — | Loại đối tượng được gợi ý |
| `target_id` | BIGINT | ref* | Không | — | Id đối tượng được gợi ý |
| `score` | DECIMAL(5,2) | | Không | — | Độ phù hợp |
| `reason_json` | JSON | | Có | NULL | Lý do gợi ý |
| `created_at` | TIMESTAMP | | Không | now | |

---

## F. Assessment & Proctoring

### F.1 `assessments` — Đề thi

Entity `Assessment`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `job_id` | BIGINT | FK → `jobs.id` | Không | — | Tin tuyển dụng sở hữu đề |
| `title` | VARCHAR(255) | | Không | — | Tên đề thi |
| `duration_seconds` | INT | | Không | — | Thời lượng làm bài |
| `status` | VARCHAR(32) | | Không | `'DRAFT'` | `AssessmentStatus`: DRAFT, PUBLISHED, ARCHIVED |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_as_job`

### F.2 `questions` — Câu hỏi

Entity `Question`. Bảng không có cột thời gian.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `assessment_id` | BIGINT | FK → `assessments.id` | Không | — | Đề thi chứa câu hỏi |
| `question_type` | VARCHAR(32) | | Không | — | Trắc nghiệm, tự luận… |
| `prompt` | TEXT | | Không | — | Nội dung câu hỏi |
| `points` | DECIMAL(5,2) | | Không | 1 | Điểm tối đa |
| `sort_order` | INT | | Không | 0 | Thứ tự hiển thị |

**Ràng buộc:** `fk_q_as`

### F.3 `question_options` — Lựa chọn trả lời

Entity `QuestionOption`. Bảng không có cột thời gian.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `question_id` | BIGINT | FK → `questions.id` | Không | — | Câu hỏi sở hữu lựa chọn |
| `option_text` | TEXT | | Không | — | Nội dung lựa chọn |
| `is_correct` | BOOLEAN | | Không | FALSE | **Không được trả ra API dành cho thí sinh** |

**Ràng buộc:** `fk_qo_q`

### F.4 `coding_problems` — Bài lập trình

Entity `CodingProblem`. Bảng không có cột thời gian.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `assessment_id` | BIGINT | FK → `assessments.id` | Không | — | Đề thi chứa bài |
| `title` | VARCHAR(255) | | Không | — | Tên bài |
| `prompt` | TEXT | | Không | — | Đề bài |
| `time_limit_ms` | INT | | Không | 2000 | Giới hạn thời gian chạy mỗi test |
| `memory_mb` | INT | | Không | 256 | Giới hạn bộ nhớ |

**Ràng buộc:** `fk_cp_as`

### F.5 `test_cases` — Bộ test của bài lập trình

Entity `TestCase`. Bảng không có cột thời gian.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `coding_problem_id` | BIGINT | FK → `coding_problems.id` | Không | — | Bài lập trình |
| `input_data` | TEXT | | Không | — | Dữ liệu đầu vào |
| `expected_output` | TEXT | | Không | — | Kết quả mong đợi — **không lộ cho thí sinh trừ khi `is_sample`** |
| `is_sample` | BOOLEAN | | Không | FALSE | Test mẫu hiển thị công khai |
| `weight` | DECIMAL(5,2) | | Không | 1 | Trọng số điểm |

**Ràng buộc:** `fk_tc_cp`

### F.6 `attempts` — Lượt làm bài

Entity `Attempt`. **Không** unique theo `(assessment_id, application_id)`, nên cho phép thi lại.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `assessment_id` | BIGINT | FK → `assessments.id` | Không | — | Đề thi |
| `application_id` | BIGINT | FK → `applications.id` | Không | — | Đơn ứng tuyển |
| `status` | VARCHAR(32) | | Không | `'NOT_STARTED'` | `AttemptStatus` — 5 giá trị |
| `started_at` | TIMESTAMP | | Có | NULL | Thời điểm bắt đầu làm |
| `submitted_at` | TIMESTAMP | | Có | NULL | Thời điểm nộp bài |
| `duration_seconds` | INT | | Không | — | Thời lượng chốt riêng cho lượt này, không đọc lại từ đề |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_att_as`, `fk_att_app`

### F.7 `attempt_answers` — Câu trả lời trong lượt làm

Entity `AttemptAnswer`. Bảng không có cột thời gian.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `attempt_id` | BIGINT | FK → `attempts.id` | Không | — | Lượt làm bài |
| `question_id` | BIGINT | FK → `questions.id` | Không | — | Câu hỏi |
| `option_id` | BIGINT | ref* | Có | NULL | Lựa chọn đã chọn — **không có khoá ngoại** |
| `answer_text` | TEXT | | Có | NULL | Nội dung trả lời tự luận |

**Ràng buộc:** `fk_aa_att`, `fk_aa_q`

### F.8 `coding_submissions` — Bài nộp code

Entity `CodingSubmission`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `attempt_id` | BIGINT | FK → `attempts.id` | Không | — | Lượt làm bài |
| `coding_problem_id` | BIGINT | FK → `coding_problems.id` | Không | — | Bài lập trình |
| `language` | VARCHAR(32) | | Không | — | Ngôn ngữ lập trình |
| `source_code` | LONGTEXT | | Không | — | Mã nguồn đã nộp |
| `status` | VARCHAR(32) | | Không | `'QUEUED'` | `SubmissionStatus`: QUEUED, RUNNING, PASSED… |
| `result_json` | JSON | | Có | NULL | Kết quả chấm từng test case |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_cs_att`, `fk_cs_cp`

### F.9 `attempt_scores` — Tổng điểm lượt thi

Entity `AttemptScore`. Dùng `graded_at` thay cho `created_at`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `attempt_id` | BIGINT | FK → `attempts.id`, UQ | Không | — | Lượt làm bài |
| `total_score` | DECIMAL(5,2) | | Không | — | Tổng điểm |
| `breakdown_json` | JSON | | Có | NULL | Điểm từng phần |
| `graded_at` | TIMESTAMP | | Không | now | Thời điểm chấm xong |

**Ràng buộc:** `fk_ascore_att`, `uk_ascore_att (attempt_id)`

### F.10 `proctor_events` — Sự kiện giám sát

Entity `ProctorEvent`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `attempt_id` | BIGINT | FK → `attempts.id` | Không | — | Lượt làm bài đang giám sát |
| `event_type` | VARCHAR(64) | | Không | — | Rời tab, nhiều khuôn mặt, mất camera… |
| `payload_json` | JSON | | Có | NULL | Dữ liệu kèm theo sự kiện |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_pe_att`

### F.11 `proctor_reports` — Báo cáo rủi ro giám sát

Entity `ProctorReport`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `attempt_id` | BIGINT | FK → `attempts.id`, UQ | Không | — | Lượt làm bài |
| `risk_score` | DECIMAL(5,2) | | Không | — | Điểm rủi ro gian lận |
| `summary_json` | JSON | | Có | NULL | Tổng hợp các sự kiện đáng ngờ |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_pr_att`, `uk_pr_att (attempt_id)`

---

## G. AI Interview

### G.1 `interviews` — Phiên phỏng vấn AI

Entity `Interview` (kế thừa `BaseEntity`). Gắn thẳng vào `jobs` và `users`, **không** qua `applications`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `job_id` | BIGINT | FK → `jobs.id` | Không | — | Tin tuyển dụng |
| `candidate_id` | BIGINT | FK → `users.id` | Không | — | Ứng viên |
| `cv_id` | BIGINT | FK → `cvs.id` | Có | NULL | CV dùng để sinh câu hỏi |
| `status` | VARCHAR(32) | | Không | `'CREATED'` | `InterviewStatus` — 6 giá trị |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | TIMESTAMP | | Không | now on update | |

**Ràng buộc:** `fk_interviews_job`, `fk_interviews_candidate`, `fk_interviews_cv`

### G.2 `interview_questions` — Câu hỏi do AI sinh

Entity `InterviewQuestion`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `interview_id` | BIGINT | FK → `interviews.id` | Không | — | Phiên phỏng vấn |
| `sort_order` | INT | | Không | — | Thứ tự hỏi |
| `question_text` | TEXT | | Không | — | Nội dung câu hỏi |
| `competency` | VARCHAR(128) | | Có | NULL | Năng lực mà câu hỏi đánh giá |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_iq_interview`

### G.3 `interview_answers` — Câu trả lời của ứng viên

Entity `InterviewAnswer`. Unique theo `question_id` nên mỗi câu hỏi chỉ một câu trả lời.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `question_id` | BIGINT | FK → `interview_questions.id`, UQ | Không | — | Câu hỏi được trả lời |
| `audio_url` | VARCHAR(512) | | Có | NULL | File ghi âm câu trả lời |
| `transcript` | TEXT | | Có | NULL | Bản chuyển văn bản từ STT |
| `status` | VARCHAR(32) | | Không | `'RECORDED'` | Trạng thái xử lý; **không** ánh xạ tới enum nào trong `domain/enums` |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_ia_question`, `uk_answer_question (question_id)`

### G.4 `interview_answer_analyses` — Phân tích NLP từng câu trả lời

Entity `InterviewAnswerAnalysis`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `answer_id` | BIGINT | FK → `interview_answers.id`, UQ | Không | — | Câu trả lời được phân tích |
| `analysis_json` | JSON | | Không | — | Kết quả phân tích |
| `model_version` | VARCHAR(64) | | Có | NULL | Phiên bản model NLP |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_iaa_ans`, `uk_iaa_ans (answer_id)`

### G.5 `interview_scores` — Điểm của phiên phỏng vấn

Entity `InterviewScore`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `interview_id` | BIGINT | FK → `interviews.id`, UQ | Không | — | Phiên phỏng vấn |
| `overall_score` | DECIMAL(5,2) | | Không | — | Điểm tổng |
| `breakdown_json` | JSON | | Có | NULL | Điểm theo từng năng lực |
| `feedback` | TEXT | | Có | NULL | Nhận xét do model sinh |
| `model_version` | VARCHAR(64) | | Có | NULL | Phiên bản model chấm |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_is_interview`, `uk_score_interview (interview_id)`

### G.6 `interview_feedbacks` — Nhận xét của người phỏng vấn

Entity `InterviewFeedback`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `interview_id` | BIGINT | FK → `interviews.id`, UQ | Không | — | Phiên phỏng vấn |
| `content` | TEXT | | Không | — | Nội dung nhận xét |
| `shared_with_candidate` | BOOLEAN | | Không | FALSE | Ứng viên có xem được không |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_if_int`, `uk_if_int (interview_id)`

---

## H. Notification

### H.1 `notifications` — Thông báo in-app

Entity `Notification`. Bảng **không** dùng enum `NotificationStatus`; trạng thái đọc thể hiện bằng `read_at`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `user_id` | BIGINT | FK → `users.id` | Không | — | Người nhận |
| `type` | VARCHAR(64) | | Không | — | Loại thông báo |
| `title` | VARCHAR(255) | | Không | — | Tiêu đề |
| `body` | TEXT | | Có | NULL | Nội dung |
| `payload_json` | JSON | | Có | NULL | Dữ liệu điều hướng kèm theo |
| `read_at` | TIMESTAMP | | Có | NULL | NULL nghĩa là chưa đọc |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_notif_user`

### H.2 `email_outbox` — Hàng đợi gửi email

Entity `EmailOutbox`. Cố ý **không có khoá ngoại** để gửi được cho cả người chưa có tài khoản.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `to_email` | VARCHAR(255) | | Không | — | Địa chỉ nhận |
| `subject` | VARCHAR(255) | | Không | — | Tiêu đề email |
| `body` | TEXT | | Không | — | Nội dung email |
| `status` | VARCHAR(32) | | Không | `'PENDING'` | Trạng thái gửi |
| `attempts` | INT | | Không | 0 | Số lần đã thử gửi |
| `created_at` | TIMESTAMP | | Không | now | |
| `sent_at` | TIMESTAMP | | Có | NULL | Thời điểm gửi thành công |

---

## I. Practice

### I.1 `practice_sessions` — Phiên tự luyện phỏng vấn

Entity `PracticeSession`. Tách hoàn toàn khỏi luồng tuyển dụng thật, không ảnh hưởng ranking.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `candidate_id` | BIGINT | FK → `users.id` | Không | — | Ứng viên luyện tập |
| `topic` | VARCHAR(255) | | Có | NULL | Chủ đề luyện |
| `status` | VARCHAR(32) | | Không | `'CREATED'` | `PracticeStatus`: CREATED, IN_PROGRESS, COMPLETED |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_ps_user`

### I.2 `practice_answers` — Câu hỏi và trả lời trong phiên luyện

Entity `PracticeAnswer`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `session_id` | BIGINT | FK → `practice_sessions.id` | Không | — | Phiên luyện |
| `question_text` | TEXT | | Không | — | Câu hỏi |
| `answer_text` | TEXT | | Có | NULL | Câu trả lời dạng văn bản |
| `audio_url` | VARCHAR(512) | | Có | NULL | File ghi âm câu trả lời |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_pa_ps`

### I.3 `practice_feedbacks` — Nhận xét phiên luyện

Entity `PracticeFeedback`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `session_id` | BIGINT | FK → `practice_sessions.id`, UQ | Không | — | Phiên luyện |
| `content` | TEXT | | Không | — | Nội dung nhận xét |
| `score` | DECIMAL(5,2) | | Có | NULL | Điểm cho toàn phiên |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_pf_ps`, `uk_pf_ps (session_id)`
