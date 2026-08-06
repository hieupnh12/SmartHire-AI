# Generate full feature docs from product backlog
from pathlib import Path

ROOT = Path(r"E:\Project\SmartHire-AI\docs\features")

TEMPLATE = """# {title}

**Epic:** {epic}  
**Trạng thái:** `To Do`  
**Code ID:** `{code}`

## Mục đích chức năng

{purpose}

## Actor

{actors}

## Luồng hoạt động

{flow}

## Business Rules

{rules}

## API liên quan

{api}

## Database liên quan

{db}

## UI mockup

- Google Stitch: **{epic} / {title}** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

{deps}
"""

FEATURES = [
  # Auth
  dict(folder="Authentication", file="User-Registration.md", title="User Registration", epic="Authentication & User Management", code="AUTH-01",
       purpose="Cho phép guest tạo tài khoản Candidate/Recruiter với email/password, sẵn sàng xác minh và đăng nhập.",
       actors="- Guest\n- System (email/OTP worker)",
       flow="1. User điền form đăng ký (role, name, email, password).\n2. FE validate Zod → `POST /api/v1/auth/register`.\n3. BE hash password, lưu `users` + profile mặc định.\n4. (Optional) OTP qua Redis + RabbitMQ email.\n5. Redirect Login hoặc yêu cầu verify.",
       rules="- Email unique (case-insensitive).\n- Role public chỉ `CANDIDATE` | `RECRUITER`.\n- Password policy bắt buộc.\n- Không trả `password_hash`.",
       api="| Method | Path | Auth |\n|---|---|---|\n| POST | `/api/v1/auth/register` | Public |",
       db="- `users`, `user_profiles`\n- Redis OTP keys",
       deps="Không"),
  dict(folder="Authentication", file="Login-JWT.md", title="Login & JWT Authentication", epic="Authentication & User Management", code="AUTH-02",
       purpose="Xác thực email/password, cấp access/refresh JWT, bảo vệ API theo token.",
       actors="- Candidate, Recruiter, Admin",
       flow="1. `POST /api/v1/auth/login`.\n2. Verify credentials + status.\n3. Issue JWT (access ngắn, refresh dài; refresh metadata Redis).\n4. FE lưu token, Axios interceptor gắn Bearer.\n5. Logout revoke refresh (blacklist Redis).",
       rules="- Rate limit login (Redis).\n- Message lỗi chung khi sai credentials.\n- Access token hết hạn → refresh hoặc 401.",
       api="| Method | Path |\n|---|---|\n| POST | `/api/v1/auth/login` |\n| POST | `/api/v1/auth/refresh` |\n| POST | `/api/v1/auth/logout` |",
       db="- `users`\n- Redis: refresh/session/blacklist",
       deps="AUTH-01"),
  dict(folder="Authentication", file="Google-OAuth.md", title="Google OAuth Login", epic="Authentication & User Management", code="AUTH-03",
       purpose="Đăng nhập/đăng ký nhanh bằng Google ID token; liên kết `oauth_accounts`.",
       actors="- Guest, Candidate, Recruiter",
       flow="1. FE nhận Google `idToken`.\n2. `POST /api/v1/auth/google`.\n3. BE verify token → find/create user → JWT.",
       rules="- Chỉ email Google verified.\n- Policy merge nếu email đã có password account.",
       api="| Method | Path |\n|---|---|\n| POST | `/api/v1/auth/google` |",
       db="- `users`, `oauth_accounts`",
       deps="AUTH-02"),
  dict(folder="Authentication", file="RBAC.md", title="Role-Based Access Control (RBAC)", epic="Authentication & User Management", code="AUTH-04",
       purpose="Phân quyền theo role (và permission nếu cần) cho mọi API/UI route.",
       actors="- Admin (cấu hình)\n- Mọi authenticated user (bị enforce)",
       flow="1. JWT chứa `role` (và optional permissions).\n2. Spring Security `@PreAuthorize` / method security.\n3. FE route guard theo role.\n4. 403 khi vượt quyền.",
       rules="- Roles: `ADMIN`, `RECRUITER`, `CANDIDATE`.\n- Recruiter chỉ data thuộc org/job của mình.\n- Admin full (audit log khuyến nghị).",
       api="Áp dụng cross-cutting trên mọi `/api/v1/**` protected endpoints.",
       db="- `users.role`\n- Optional: `roles`, `permissions`, `role_permissions`",
       deps="AUTH-02"),
  dict(folder="Authentication", file="User-Profile.md", title="User Profile Management", epic="Authentication & User Management", code="AUTH-05",
       purpose="Xem/cập nhật hồ sơ cá nhân (avatar, phone, bio, links) theo role.",
       actors="- Candidate, Recruiter, Admin",
       flow="1. `GET /api/v1/users/me`.\n2. `PUT /api/v1/users/me` hoặc PATCH.\n3. Upload avatar (storage).\n4. Candidate có thêm skills/experience summary.",
       rules="- Không đổi email/role qua profile thường.\n- Validate phone/URL.\n- Avatar MIME/size limit.",
       api="| Method | Path |\n|---|---|\n| GET | `/api/v1/users/me` |\n| PUT | `/api/v1/users/me` |\n| POST | `/api/v1/users/me/avatar` |",
       db="- `user_profiles`",
       deps="AUTH-02"),

  # Job
  dict(folder="Job-Recruitment", file="Job-CRUD.md", title="Create / Update / Delete Job", epic="Job Recruitment Management", code="JOB-01",
       purpose="Recruiter quản lý vòng đời tin tuyển dụng: tạo, sửa, xóa (soft delete).",
       actors="- Recruiter, Admin",
       flow="1. CRUD qua `/api/v1/jobs`.\n2. Soft delete khi có applicants.\n3. Invalidate cache listing.",
       rules="- Ownership/org check.\n- Không hard-delete nếu có applications (soft delete).",
       api="| Method | Path |\n|---|---|\n| POST/GET/PUT/DELETE | `/api/v1/jobs`, `/api/v1/jobs/{id}` |",
       db="- `jobs`",
       deps="AUTH-04"),
  dict(folder="Job-Recruitment", file="Job-Publishing.md", title="Job Publishing", epic="Job Recruitment Management", code="JOB-02",
       purpose="Chuyển job giữa DRAFT → PUBLISHED/OPEN → CLOSED/ARCHIVED; kiểm soát visibility.",
       actors="- Recruiter, Admin",
       flow="1. `POST /api/v1/jobs/{id}/publish`.\n2. `POST /api/v1/jobs/{id}/close`.\n3. Event `job.events` → Redis/search/notify.",
       rules="- Chỉ PUBLISHED nhận applicant mới.\n- Publish cần đủ title, description, skills tối thiểu.",
       api="| Method | Path |\n|---|---|\n| POST | `/api/v1/jobs/{id}/publish` |\n| POST | `/api/v1/jobs/{id}/close` |",
       db="- `jobs.status`, `published_at`, `closed_at`",
       deps="JOB-01"),
  dict(folder="Job-Recruitment", file="Skill-Requirements.md", title="Skill Requirement Management", epic="Job Recruitment Management", code="JOB-03",
       purpose="Gắn skill bắt buộc/ưu tiên + weight cho job để matching/assessment.",
       actors="- Recruiter",
       flow="1. CRUD `job_skills`.\n2. Weight dùng cho matching score.",
       rules="- Skill name normalize.\n- Tổng weight = 100 hoặc normalize khi chấm.",
       api="| Method | Path |\n|---|---|\n| PUT | `/api/v1/jobs/{id}/skills` |\n| GET | `/api/v1/jobs/{id}/skills` |",
       db="- `skills`, `job_skills` (required, weight, level)",
       deps="JOB-01"),
  dict(folder="Job-Recruitment", file="Recruitment-Stages.md", title="Recruitment Stage Management", epic="Job Recruitment Management", code="JOB-04",
       purpose="Định nghĩa pipeline stages cho từng job (Applied → Screening → Assessment → Interview → Offer → Hired).",
       actors="- Recruiter, Admin",
       flow="1. Template stages mặc định khi tạo job.\n2. Recruiter tùy chỉnh order/name.\n3. Applicant chuyển stage theo workflow.",
       rules="- Ít nhất 1 stage đầu/cuối.\n- Không xóa stage đang có candidate (archive).",
       api="| Method | Path |\n|---|---|\n| GET/PUT | `/api/v1/jobs/{id}/stages` |",
       db="- `recruitment_stages`",
       deps="JOB-01"),
  dict(folder="Job-Recruitment", file="Applicant-Management.md", title="Applicant Management", epic="Job Recruitment Management", code="JOB-05",
       purpose="Quản lý danh sách ứng viên apply vào job: xem, lọc, gán stage, ghi chú.",
       actors="- Recruiter, Admin\n- Candidate (apply)",
       flow="1. Candidate apply → `applications`.\n2. Recruiter list/filter/sort.\n3. Update stage/status/notes.",
       rules="- 1 application / (job, candidate) trừ khi reopen policy.\n- Recruiter chỉ job của mình.",
       api="| Method | Path |\n|---|---|\n| POST | `/api/v1/jobs/{id}/applications` |\n| GET | `/api/v1/jobs/{id}/applications` |\n| PATCH | `/api/v1/applications/{id}` |",
       db="- `applications`",
       deps="JOB-02, JOB-04"),

  # CV
  dict(folder="CV-Screening", file="CV-Upload.md", title="CV Upload", epic="AI-Powered CV Screening & Analysis", code="CV-01",
       purpose="Upload CV (PDF/DOCX) gắn application/job.",
       actors="- Candidate, Recruiter",
       flow="1. Multipart upload → storage + `cvs`.\n2. Status `UPLOADED`.\n3. Optional auto-enqueue parse.",
       rules="- MIME/size whitelist.\n- Job phải PUBLISHED khi candidate apply.",
       api="| Method | Path |\n|---|---|\n| POST | `/api/v1/cvs` |",
       db="- `cvs`",
       deps="JOB-05"),
  dict(folder="CV-Screening", file="CV-Parsing.md", title="CV Parsing", epic="AI-Powered CV Screening & Analysis", code="CV-02",
       purpose="Parse file CV thành text/structured blocks (async RabbitMQ).",
       actors="- System worker",
       flow="1. Queue `cv.parse`.\n2. Extract text → `cv_documents`.\n3. Status `PARSED` / `PARSE_FAILED`.",
       rules="- Idempotent theo cvId.\n- DLQ khi fail.",
       api="| Method | Path |\n|---|---|\n| POST | `/api/v1/cvs/{id}/parse` |\n| GET | `/api/v1/cvs/{id}` |",
       db="- `cvs`, `cv_documents`",
       deps="CV-01"),
  dict(folder="CV-Screening", file="Information-Extraction.md", title="Information Extraction", epic="AI-Powered CV Screening & Analysis", code="CV-03",
       purpose="Trích xuất thông tin có cấu trúc: education, experience, contacts, certifications.",
       actors="- System (AI)\n- Recruiter (xem)",
       flow="1. Sau parse → queue `cv.extract`.\n2. Lưu JSON structured vào `cv_extractions`.",
       rules="- Không overwrite manual edits trừ khi re-run có flag.\n- PII chỉ role được phép xem.",
       api="| Method | Path |\n|---|---|\n| POST | `/api/v1/cvs/{id}/extract` |\n| GET | `/api/v1/cvs/{id}/extraction` |",
       db="- `cv_extractions`",
       deps="CV-02"),
  dict(folder="CV-Screening", file="AI-Skill-Analysis.md", title="AI Skill Analysis", epic="AI-Powered CV Screening & Analysis", code="CV-04",
       purpose="AI phân tích skill/level từ CV so với taxonomy skills.",
       actors="- System, Recruiter",
       flow="1. Queue `cv.analysis`.\n2. Skill list + confidence → `cv_skills` / `cv_analyses`.",
       rules="- Redis lock chống double-run.\n- Lưu `model_version`.",
       api="| Method | Path |\n|---|---|\n| POST | `/api/v1/cvs/{id}/analyze` |",
       db="- `cv_analyses`, `cv_skills`",
       deps="CV-03"),
  dict(folder="CV-Screening", file="Matching-Score.md", title="Candidate Matching Score", epic="AI-Powered CV Screening & Analysis", code="CV-05",
       purpose="Tính điểm khớp CV ↔ Job (skills weighted + experience).",
       actors="- Recruiter, System",
       flow="1. Queue `cv.matching` hoặc sync nếu nhẹ.\n2. Lưu `match_scores` + Redis cache.",
       rules="- Cần CV analyzed + job skills.\n- Score 0–100 + breakdown.",
       api="| Method | Path |\n|---|---|\n| GET/POST | `/api/v1/jobs/{jobId}/cvs/{cvId}/match` |",
       db="- `match_scores`",
       deps="CV-04, JOB-03"),

  # Matching ranking
  dict(folder="Matching-Ranking", file="Ranking-Algorithm.md", title="Candidate Ranking Algorithm", epic="Candidate-Job Matching & Ranking", code="RANK-01",
       purpose="Xếp hạng applicants của một job theo nhiều tín hiệu (match, assessment, interview).",
       actors="- Recruiter, System",
       flow="1. `GET /api/v1/jobs/{id}/rankings`.\n2. Tính/ cập nhật bảng xếp hạng khi có event score mới.\n3. FE bảng sort theo rank.",
       rules="- Công thức versioned (`ranking_version`).\n- Tie-break: updated_at / experience.",
       api="| Method | Path |\n|---|---|\n| GET | `/api/v1/jobs/{id}/rankings` |\n| POST | `/api/v1/jobs/{id}/rankings/recompute` |",
       db="- `candidate_rankings`",
       deps="CV-05"),
  dict(folder="Matching-Ranking", file="Recommendation-Engine.md", title="Recommendation Engine", epic="Candidate-Job Matching & Ranking", code="RANK-02",
       purpose="Gợi ý job cho candidate / gợi ý candidate cho recruiter.",
       actors="- Candidate, Recruiter, System",
       flow="1. Async `recommend.jobs` / `recommend.candidates`.\n2. Lưu `recommendations` TTL Redis + MySQL.",
       rules="- Không recommend job CLOSED.\n- Respect privacy settings.",
       api="| Method | Path |\n|---|---|\n| GET | `/api/v1/recommendations/jobs` |\n| GET | `/api/v1/jobs/{id}/recommendations/candidates` |",
       db="- `recommendations`",
       deps="RANK-01"),
  dict(folder="Matching-Ranking", file="Overall-Candidate-Score.md", title="Overall Candidate Score", epic="Candidate-Job Matching & Ranking", code="RANK-03",
       purpose="Tổng hợp điểm overall: CV match + assessment + interview (+ weights cấu hình).",
       actors="- Recruiter, System",
       flow="1. Aggregate khi từng cột điểm cập nhật.\n2. Hiển thị trên applicant detail + ranking.",
       rules="- Weight cấu hình per job hoặc global.\n- Missing component → partial score + flag.",
       api="| Method | Path |\n|---|---|\n| GET | `/api/v1/applications/{id}/overall-score` |",
       db="- `overall_scores`",
       deps="RANK-01, ASSESS-03, INT-04"),

  # Assessment FE-05
  dict(folder="Technical-Assessment", file="Multiple-Choice-Test.md", title="Multiple Choice Test", epic="FE-05 Online Technical Assessment", code="ASSESS-01",
       purpose="Tạo/làm bài trắc nghiệm kỹ thuật gắn job/stage.",
       actors="- Recruiter (tạo), Candidate (làm)",
       flow="1. Recruiter tạo bank câu hỏi + đề.\n2. Candidate start attempt.\n3. Submit answers.",
       rules="- Randomize order optional.\n- 1 active attempt / assignment (policy).",
       api="| Method | Path |\n|---|---|\n| POST | `/api/v1/assessments` |\n| POST | `/api/v1/assessments/{id}/attempts` |\n| POST | `/api/v1/attempts/{id}/answers` |",
       db="- `assessments`, `questions`, `question_options`, `attempts`, `attempt_answers`",
       deps="JOB-04"),
  dict(folder="Technical-Assessment", file="Coding-Challenge.md", title="Coding Challenge", epic="FE-05 Online Technical Assessment", code="ASSESS-02",
       purpose="Bài coding: đề, nộp code, chạy test cases (sandbox/worker).",
       actors="- Recruiter, Candidate, System grader",
       flow="1. Candidate submit source.\n2. Queue `assessment.code.grade`.\n3. Chạy test → kết quả.",
       rules="- Timeout/memory limit.\n- Không tin tưởng client-side grade.",
       api="| Method | Path |\n|---|---|\n| POST | `/api/v1/attempts/{id}/coding-submissions` |\n| GET | `/api/v1/coding-submissions/{id}` |",
       db="- `coding_problems`, `test_cases`, `coding_submissions`",
       deps="ASSESS-01"),
  dict(folder="Technical-Assessment", file="Auto-Grading.md", title="Auto Grading", epic="FE-05 Online Technical Assessment", code="ASSESS-03",
       purpose="Tự chấm MCQ + coding; tổng điểm assessment.",
       actors="- System",
       flow="1. MCQ chấm ngay khi submit.\n2. Coding chờ worker.\n3. Cập nhật `attempt_scores` → overall.",
       rules="- Deterministic grading.\n- Regrade khi sửa đáp án (audit).",
       api="| Method | Path |\n|---|---|\n| POST | `/api/v1/attempts/{id}/grade` |\n| GET | `/api/v1/attempts/{id}/score` |",
       db="- `attempt_scores`",
       deps="ASSESS-01, ASSESS-02"),
  dict(folder="Technical-Assessment", file="Timer-Control.md", title="Timer Control", epic="FE-05 Online Technical Assessment", code="ASSESS-04",
       purpose="Giới hạn thời gian làm bài; server là nguồn sự thật.",
       actors="- Candidate, System",
       flow="1. Start → `started_at` + duration.\n2. FE countdown từ server remaining.\n3. Auto-submit khi hết giờ.",
       rules="- Không tin timer client.\n- Clock skew tolerance nhỏ.",
       api="| Method | Path |\n|---|---|\n| GET | `/api/v1/attempts/{id}/timer` |\n| POST | `/api/v1/attempts/{id}/submit` |",
       db="- `attempts.started_at`, `duration_seconds`, `submitted_at`",
       deps="ASSESS-01"),
  dict(folder="Technical-Assessment", file="Anti-Cheating.md", title="Anti-cheating Detection", epic="FE-05 Online Technical Assessment", code="ASSESS-05",
       purpose="Ghi nhận tín hiệu gian lận (tab blur, paste, multi-focus) và gắn risk score.",
       actors="- System, Recruiter (xem)",
       flow="1. FE gửi events `POST /attempts/{id}/proctor-events`.\n2. BE aggregate risk.\n3. Recruiter xem báo cáo.",
       rules="- Events append-only.\n- Risk không auto-fail trừ khi policy bật.",
       api="| Method | Path |\n|---|---|\n| POST | `/api/v1/attempts/{id}/proctor-events` |\n| GET | `/api/v1/attempts/{id}/proctor-report` |",
       db="- `proctor_events`, `proctor_reports`",
       deps="ASSESS-01"),

  # AI Interview
  dict(folder="AI-Interview", file="Question-Generation.md", title="AI Question Generation", epic="AI Interview System", code="INT-01",
       purpose="Sinh câu hỏi phỏng vấn theo JD + CV + level (RabbitMQ).",
       actors="- Recruiter, System",
       flow="1. `POST .../questions/generate` → queue `interview.questions`.\n2. Lưu `interview_questions`.",
       rules="- Số câu giới hạn.\n- Có thể edit trước khi start.",
       api="| Method | Path |\n|---|---|\n| POST | `/api/v1/interviews/{id}/questions/generate` |",
       db="- `interviews`, `interview_questions`",
       deps="JOB-05, CV-04"),
  dict(folder="AI-Interview", file="Speech-to-Text.md", title="Speech-to-Text Integration", epic="AI Interview System", code="INT-02",
       purpose="Chuyển audio câu trả lời thành transcript để NLP scoring.",
       actors="- Candidate, System",
       flow="1. Upload/stream audio.\n2. Queue `interview.stt`.\n3. Lưu transcript.",
       rules="- Ngôn ngữ cấu hình (vi/en).\n- Giữ audio URL + transcript.",
       api="| Method | Path |\n|---|---|\n| POST | `/api/v1/interviews/{id}/voice` |",
       db="- `interview_answers.audio_url`, `transcript`",
       deps="INT-01"),
  dict(folder="AI-Interview", file="NLP-Response-Analysis.md", title="NLP Response Analysis", epic="AI Interview System", code="INT-03",
       purpose="Phân tích ngữ nghĩa câu trả lời: relevance, depth, soft-skills signals.",
       actors="- System",
       flow="1. Sau STT → queue `interview.nlp`.\n2. Lưu analysis JSON per answer.",
       rules="- Model versioned.\n- Không expose raw prompt lỗi cho client.",
       api="Nội bộ worker + `GET /api/v1/interviews/{id}` gồm analysis.",
       db="- `interview_answer_analyses`",
       deps="INT-02"),
  dict(folder="AI-Interview", file="AI-Scoring.md", title="AI Interview Scoring", epic="AI Interview System", code="INT-04",
       purpose="Chấm điểm session phỏng vấn AI tổng hợp.",
       actors="- Recruiter, System",
       flow="1. `POST .../score` → `interview.score`.\n2. Lưu overall + breakdown.",
       rules="- Idempotent re-score.\n- Cập nhật overall candidate score.",
       api="| Method | Path |\n|---|---|\n| POST | `/api/v1/interviews/{id}/score` |",
       db="- `interview_scores`",
       deps="INT-03"),
  dict(folder="AI-Interview", file="Interview-Feedback.md", title="Interview Feedback", epic="AI Interview System", code="INT-05",
       purpose="Tạo feedback readable cho recruiter/candidate (policy hiển thị).",
       actors="- Recruiter, Candidate (nếu được share), System",
       flow="1. Sau scoring sinh feedback.\n2. Recruiter approve/share.\n3. Candidate xem nếu được phép.",
       rules="- Phân quyền nội dung feedback.\n- Có thể chỉnh tay trước khi share.",
       api="| Method | Path |\n|---|---|\n| GET | `/api/v1/interviews/{id}/feedback` |\n| POST | `/api/v1/interviews/{id}/feedback/share` |",
       db="- `interview_feedbacks`",
       deps="INT-04"),

  # Workflow
  dict(folder="Recruitment-Workflow", file="Recruitment-Pipeline.md", title="Recruitment Pipeline", epic="Recruitment Workflow Management", code="WF-01",
       purpose="Kanban/pipeline theo stages của job; kéo thả chuyển ứng viên.",
       actors="- Recruiter",
       flow="1. `GET /jobs/{id}/pipeline`.\n2. Move application → stage.\n3. Emit notification + analytics invalidate.",
       rules="- Transition rules (optional gates: cần assessment pass).",
       api="| Method | Path |\n|---|---|\n| GET | `/api/v1/jobs/{id}/pipeline` |\n| POST | `/api/v1/applications/{id}/move` |",
       db="- `applications.stage_id`, `recruitment_stages`",
       deps="JOB-04, JOB-05"),
  dict(folder="Recruitment-Workflow", file="Candidate-Status.md", title="Candidate Status Management", epic="Recruitment Workflow Management", code="WF-02",
       purpose="Status ứng viên: NEW, IN_REVIEW, ASSESSMENT, INTERVIEW, OFFER, HIRED, REJECTED, WITHDRAWN.",
       actors="- Recruiter, Candidate (withdraw)",
       flow="1. PATCH status.\n2. Audit history.\n3. Notify.",
       rules="- Transition matrix hợp lệ.\n- Reject/hired cần lý do optional.",
       api="| Method | Path |\n|---|---|\n| PATCH | `/api/v1/applications/{id}/status` |\n| GET | `/api/v1/applications/{id}/status-history` |",
       db="- `applications.status`, `application_status_history`",
       deps="WF-01"),
  dict(folder="Recruitment-Workflow", file="Hiring-Decision.md", title="Hiring Decision Management", epic="Recruitment Workflow Management", code="WF-03",
       purpose="Ghi nhận quyết định tuyển dụng (hire/reject/hold) + approver.",
       actors="- Recruiter, Admin",
       flow="1. Submit decision form.\n2. Lock application terminal state.\n3. Analytics + email.",
       rules="- Terminal states không reopen trừ Admin.\n- Cần quyền quyết định.",
       api="| Method | Path |\n|---|---|\n| POST | `/api/v1/applications/{id}/decisions` |\n| GET | `/api/v1/applications/{id}/decisions` |",
       db="- `hiring_decisions`",
       deps="WF-02, RANK-03"),

  # Analytics
  dict(folder="Analytics-Dashboard", file="Recruitment-Statistics.md", title="Recruitment Statistics", epic="Recruitment Analytics Dashboard", code="DASH-01",
       purpose="KPI: open jobs, applicants, hire rate, avg time-to-hire, avg scores.",
       actors="- Recruiter, Admin",
       flow="1. `GET /dashboard/summary`.\n2. Redis cache + invalidate by events.",
       rules="- Scope theo org.\n- Candidate 403.",
       api="| Method | Path |\n|---|---|\n| GET | `/api/v1/dashboard/summary` |",
       db="- aggregates từ jobs/applications/scores; Redis cache",
       deps="WF-01"),
  dict(folder="Analytics-Dashboard", file="Dashboard-Charts.md", title="Dashboard Charts", epic="Recruitment Analytics Dashboard", code="DASH-02",
       purpose="API dữ liệu biểu đồ (funnel, distribution scores, source).",
       actors="- Recruiter, Admin",
       flow="1. `GET /dashboard/charts?type=`.\n2. FE render charts (theo DESIGN).",
       rules="- Giới hạn range ngày.\n- Aggregation server-side.",
       api="| Method | Path |\n|---|---|\n| GET | `/api/v1/dashboard/charts` |",
       db="- read models / SQL aggregate",
       deps="DASH-01"),
  dict(folder="Analytics-Dashboard", file="Trend-Analysis.md", title="Recruitment Trend Analysis", epic="Recruitment Analytics Dashboard", code="DASH-03",
       purpose="Phân tích xu hướng theo thời gian (applications, hires, scores).",
       actors="- Recruiter, Admin",
       flow="1. `GET /dashboard/trends?from&to&granularity=`.\n2. FE line/area charts.",
       rules="- Granularity day/week/month.\n- Max window (vd 365d).",
       api="| Method | Path |\n|---|---|\n| GET | `/api/v1/dashboard/trends` |",
       db="- time-series aggregates",
       deps="DASH-01"),

  # Scheduling & notifications
  dict(folder="Scheduling-Notifications", file="Interview-Scheduling.md", title="Interview Scheduling", epic="Interview Scheduling & Real-time Notifications", code="SCHED-01",
       purpose="Đặt lịch phỏng vấn (AI hoặc human), slot thời gian, participants.",
       actors="- Recruiter, Candidate",
       flow="1. Recruiter tạo schedule.\n2. Candidate confirm/reschedule.\n3. Reminder email + websocket.",
       rules="- Conflict check timezone.\n- Status: PROPOSED, CONFIRMED, CANCELLED, DONE.",
       api="| Method | Path |\n|---|---|\n| POST | `/api/v1/schedules` |\n| PATCH | `/api/v1/schedules/{id}` |\n| POST | `/api/v1/schedules/{id}/confirm` |",
       db="- `interview_schedules`",
       deps="JOB-05, INT-01"),
  dict(folder="Scheduling-Notifications", file="WebSocket-Notifications.md", title="WebSocket Notification", epic="Interview Scheduling & Real-time Notifications", code="SCHED-02",
       purpose="Đẩy thông báo realtime (stage change, schedule, score ready) qua WebSocket/STOMP.",
       actors="- All authenticated users",
       flow="1. FE subscribe `/user/queue/notifications`.\n2. BE publish khi domain events.\n3. Lưu inbox `notifications`.",
       rules="- Auth trên WS connect (JWT).\n- At-least-once + idempotent client.",
       api="WS endpoint `/ws` + REST `GET /api/v1/notifications`",
       db="- `notifications`",
       deps="AUTH-02"),
  dict(folder="Scheduling-Notifications", file="Email-Notifications.md", title="Email Notification", epic="Interview Scheduling & Real-time Notifications", code="SCHED-03",
       purpose="Gửi email (OTP, schedule, decision, feedback) qua RabbitMQ mail worker.",
       actors="- System",
       flow="1. Publish `notify.email`.\n2. Worker template + SMTP/provider.\n3. Log delivery status.",
       rules="- Retry + DLQ.\n- Unsubscribe/preference (optional).",
       api="Internal queue `notify.email`; templates trong `mail_templates`.",
       db="- `email_outbox` / `notification_logs`",
       deps="SCHED-01, SCHED-02"),

  # Practice interview
  dict(folder="Practice-Interview", file="Practice-Session.md", title="Practice Interview Session", epic="AI Practice Interview for Candidates", code="PRACT-01",
       purpose="Candidate luyện phỏng vấn AI không gắn hiring decision (sandbox).",
       actors="- Candidate",
       flow="1. Chọn topic/job-like template.\n2. Generate questions + voice/text answers.\n3. Không ảnh hưởng ranking job thật.",
       rules="- Tách biệt `practice_sessions` vs `interviews`.\n- Quota/ngày optional.",
       api="| Method | Path |\n|---|---|\n| POST | `/api/v1/practice/sessions` |\n| POST | `/api/v1/practice/sessions/{id}/answers` |",
       db="- `practice_sessions`, `practice_answers`",
       deps="INT-01, INT-02"),
  dict(folder="Practice-Interview", file="AI-Feedback-Generation.md", title="AI Feedback Generation", epic="AI Practice Interview for Candidates", code="PRACT-02",
       purpose="Sinh feedback luyện tập sau session (async).",
       actors="- Candidate, System",
       flow="1. Queue `practice.feedback`.\n2. Lưu feedback + tips.",
       rules="- Tone constructive.\n- Không lộ đáp án ideal nguyên văn nếu policy.",
       api="| Method | Path |\n|---|---|\n| POST | `/api/v1/practice/sessions/{id}/feedback` |\n| GET | `/api/v1/practice/sessions/{id}/feedback` |",
       db="- `practice_feedbacks`",
       deps="PRACT-01"),
  dict(folder="Practice-Interview", file="Practice-History.md", title="Practice History Management", epic="AI Practice Interview for Candidates", code="PRACT-03",
       purpose="Xem lịch sử luyện tập, điểm, tiến bộ theo thời gian.",
       actors="- Candidate",
       flow="1. `GET /practice/sessions`.\n2. Detail + feedback.\n3. Optional progress chart.",
       rules="- Chỉ owner xem.\n- Soft delete history.",
       api="| Method | Path |\n|---|---|\n| GET | `/api/v1/practice/sessions` |\n| GET | `/api/v1/practice/sessions/{id}` |\n| DELETE | `/api/v1/practice/sessions/{id}` |",
       db="- `practice_sessions`",
       deps="PRACT-02"),
]

# Remove old narrow docs that conflict (keep folder clean)
obsolete = [
  ROOT/"Authentication"/"Login.md",
  ROOT/"Authentication"/"Register.md",
  ROOT/"Authentication"/"Google-Login.md",
  ROOT/"Job-Management"/"Create-Job.md",
  ROOT/"Job-Management"/"Update-Job.md",
  ROOT/"Job-Management"/"Close-Job.md",
  ROOT/"CV-Screening"/"Upload-CV.md",
  ROOT/"CV-Screening"/"AI-Analysis.md",
  ROOT/"AI-Interview"/"Generate-Question.md",
  ROOT/"AI-Interview"/"Voice-Interview.md",
  ROOT/"AI-Interview"/"AI-Scoring.md",
  ROOT/"Dashboard"/"Dashboard.md",
]
for p in obsolete:
  if p.exists():
    p.unlink()

# remove empty old dirs later
for feat in FEATURES:
  d = ROOT / feat["folder"]
  d.mkdir(parents=True, exist_ok=True)
  content = TEMPLATE.format(**feat)
  (d / feat["file"]).write_text(content, encoding="utf-8")

# Keep Matching-Score in CV-Screening already in FEATURES; remove old if duplicate path handled

print(f"Wrote {len(FEATURES)} feature docs")
