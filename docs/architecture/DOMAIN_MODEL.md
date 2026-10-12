# Domain Model (logical)

Nguồn sự thật schema: Flyway `backend/src/main/resources/db/migration`.  
File này mô tả quan hệ logic theo product backlog — một bản phác nhanh để định hướng.

> **Đặc tả vật lý đầy đủ và cập nhật nằm ở [`docs/database/`](../database/README.md)**: ERD theo từng nhóm
> nghiệp vụ, data dictionary chi tiết từng cột, danh sách 59 khoá ngoại, ràng buộc và index. Khi hai file
> mâu thuẫn, `docs/database/` thắng.

## Core identity

```
users 1──1 user_profiles
users 1──* oauth_accounts
users.role ∈ {ADMIN, RECRUITER, CANDIDATE}
```

## Jobs & applicants

```
users(recruiter) 1──* jobs
jobs 1──* job_assignments ──▷ users(staff)
jobs 1──* job_skills ──▷ skills
jobs 1──* recruitment_stages
jobs 1──* applications ──▷ users(candidate)
applications 1──* application_status_history
applications 1──* hiring_decisions
```

## CV & matching

```
applications 1──* cvs
cvs 1──0..1 cv_documents
cvs 1──0..1 cv_extractions
cvs 1──0..1 cv_analyses
cvs 1──* cv_skills
jobs + cvs → match_scores
applications → overall_scores
jobs → candidate_rankings
users/jobs → recommendations
```

## Assessment (FE-05)

```
jobs 1──* tests
jobs.assessment_config_json = cấu trúc và tùy chọn tự tạo đề (V43)
applications 0..1──0..1 tests (assigned_application_id; NULL = đề chung)
questions *──0..1 tests (NULL = câu hỏi ngân hàng chung)
questions 1──* options
questions 1──* questionskills ──▷ skills
tests 1──* coding_problems 1──* test_cases
applications 1──* submissions ──▷ tests
submissions 1──* answers ──▷ questions
answers 1──* answer_selected_options ──▷ options
submissions 1──* coding_submissions
submissions 1──* proctor_events → proctor_reports
```

## AI interview & practice

Phiên Conversation mới (V44, snapshot `conversationVersion=1`): `ai_interviews 1──0..1 interview_sessions 1──* interview_messages`. Session có ngân sách lượt/count và ended_at; message có USER/ASSISTANT, sequence, UUID chống gửi trùng và metadata audio riêng tư. Streaming dialogue không grading; worker sau complete chấm toàn transcript vào report_json schemaVersion3. Quan hệ AiQuestion/AiAnswer bên dưới chỉ dùng cho snapshot legacy.

```
applications 1──* interviews
interviews 1──* interview_questions
interview_questions 1──0..1 interview_answers
interview_answers 1──0..1 interview_answer_analyses
interviews 1──0..1 interview_scores
interviews 1──0..1 interview_feedbacks

users(candidate) 1──* practice_sessions
practice_sessions 1──* practice_answers
practice_sessions 1──0..1 practice_feedbacks
```

## Scheduling & notifications

```
applications/interviews → interview_schedules
users 1──* notifications
email_outbox / notification_logs
```

## Enums chính (gợi ý)

| Area | Values |
|---|---|
| Job status | `DRAFT`, `PUBLISHED`, `CLOSED`, `ARCHIVED` |
| Application status | `NEW`, `IN_REVIEW`, `ASSESSMENT`, `INTERVIEW`, `OFFER`, `HIRED`, `REJECTED`, `WITHDRAWN` |
| CV status | `UPLOADED`, `PARSING`, `PARSED`, `EXTRACTING`, `ANALYZING`, `ANALYZED`, `FAILED` |
| Attempt status | `NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED`, `GRADED`, `EXPIRED` |
| Interview status | `CREATED`, `QUESTIONS_READY`, `IN_PROGRESS`, `SCORING`, `SCORED`, `FAILED` |
| Schedule status | `PROPOSED`, `CONFIRMED`, `CANCELLED`, `DONE` |

## Async ownership

| Producer domain | Queues |
|---|---|
| CV | `cv.parse`, `cv.extract`, `cv.analysis`, `cv.matching` |
| Assessment | `assessment.code.grade` |
| Interview | `interview.questions`, `interview.stt`, `interview.nlp`, `interview.score` |
| Practice | `practice.feedback` |
| Notify | `notify.email`, `auth.email.otp` |
| Job | `job.events` |
