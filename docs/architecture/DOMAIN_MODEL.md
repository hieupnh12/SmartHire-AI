# Domain Model (logical)

Nguồn sự thật schema: Flyway `backend/src/main/resources/db/migration`.  
File này mô tả quan hệ logic theo product backlog.

## Core identity

```
users 1──1 user_profiles
users 1──* oauth_accounts
users.role ∈ {ADMIN, RECRUITER, CANDIDATE}
```

## Jobs & applicants

```
users(recruiter) 1──* jobs
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
jobs 1──* assessments
assessments 1──* questions 1──* question_options
assessments 1──* coding_problems 1──* test_cases
applications 1──* attempts
attempts 1──* attempt_answers
attempts 1──* coding_submissions
attempts 1──0..1 attempt_scores
attempts 1──* proctor_events → proctor_reports
```

## AI interview & practice

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
