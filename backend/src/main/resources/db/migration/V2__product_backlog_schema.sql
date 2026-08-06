-- Expand schema for full product backlog (AUTH→PRACT)
-- Applied after V1__init_schema.sql

-- Profiles & orgs (lightweight)
CREATE TABLE IF NOT EXISTS user_profiles (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT       NOT NULL,
    phone           VARCHAR(32)  NULL,
    avatar_url      VARCHAR(512) NULL,
    bio             TEXT         NULL,
    headline        VARCHAR(255) NULL,
    links_json      JSON         NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE KEY uk_profile_user (user_id)
);

CREATE TABLE IF NOT EXISTS skills (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(128) NOT NULL,
    category    VARCHAR(64)  NULL,
    UNIQUE KEY uk_skills_name (name)
);

CREATE TABLE IF NOT EXISTS job_skills (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    job_id      BIGINT         NOT NULL,
    skill_id    BIGINT         NOT NULL,
    required    BOOLEAN        NOT NULL DEFAULT TRUE,
    weight      DECIMAL(5,2)   NOT NULL DEFAULT 1.00,
    min_level   VARCHAR(32)    NULL,
    CONSTRAINT fk_js_job FOREIGN KEY (job_id) REFERENCES jobs (id),
    CONSTRAINT fk_js_skill FOREIGN KEY (skill_id) REFERENCES skills (id),
    UNIQUE KEY uk_job_skill (job_id, skill_id)
);

CREATE TABLE IF NOT EXISTS recruitment_stages (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    job_id      BIGINT       NOT NULL,
    name        VARCHAR(128) NOT NULL,
    sort_order  INT          NOT NULL,
    is_terminal BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_rs_job FOREIGN KEY (job_id) REFERENCES jobs (id)
);

CREATE TABLE IF NOT EXISTS applications (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    job_id          BIGINT       NOT NULL,
    candidate_id    BIGINT       NOT NULL,
    stage_id        BIGINT       NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'NEW',
    source          VARCHAR(64)  NULL,
    notes           TEXT         NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_app_job FOREIGN KEY (job_id) REFERENCES jobs (id),
    CONSTRAINT fk_app_candidate FOREIGN KEY (candidate_id) REFERENCES users (id),
    CONSTRAINT fk_app_stage FOREIGN KEY (stage_id) REFERENCES recruitment_stages (id),
    UNIQUE KEY uk_app_job_candidate (job_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS application_status_history (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    application_id  BIGINT       NOT NULL,
    from_status     VARCHAR(32)  NULL,
    to_status       VARCHAR(32)  NOT NULL,
    changed_by      BIGINT       NULL,
    note            TEXT         NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ash_app FOREIGN KEY (application_id) REFERENCES applications (id)
);

CREATE TABLE IF NOT EXISTS hiring_decisions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    application_id  BIGINT       NOT NULL,
    decision        VARCHAR(32)  NOT NULL,
    reason          TEXT         NULL,
    decided_by      BIGINT       NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_hd_app FOREIGN KEY (application_id) REFERENCES applications (id)
);

-- CV pipeline extras
CREATE TABLE IF NOT EXISTS cv_documents (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    cv_id        BIGINT NOT NULL,
    raw_text     LONGTEXT NULL,
    page_count   INT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cvdoc_cv FOREIGN KEY (cv_id) REFERENCES cvs (id),
    UNIQUE KEY uk_cvdoc_cv (cv_id)
);

CREATE TABLE IF NOT EXISTS cv_extractions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    cv_id           BIGINT NOT NULL,
    extraction_json JSON NOT NULL,
    model_version   VARCHAR(64) NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cvext_cv FOREIGN KEY (cv_id) REFERENCES cvs (id),
    UNIQUE KEY uk_cvext_cv (cv_id)
);

CREATE TABLE IF NOT EXISTS cv_skills (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    cv_id       BIGINT NOT NULL,
    skill_id    BIGINT NULL,
    skill_name  VARCHAR(128) NOT NULL,
    confidence  DECIMAL(5,2) NULL,
    level       VARCHAR(32) NULL,
    CONSTRAINT fk_cvsk_cv FOREIGN KEY (cv_id) REFERENCES cvs (id)
);

CREATE TABLE IF NOT EXISTS overall_scores (
    id               BIGINT PRIMARY KEY AUTO_INCREMENT,
    application_id   BIGINT NOT NULL,
    overall          DECIMAL(5,2) NOT NULL,
    breakdown_json   JSON NULL,
    ranking_version  VARCHAR(32) NULL,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_os_app FOREIGN KEY (application_id) REFERENCES applications (id),
    UNIQUE KEY uk_os_app (application_id)
);

CREATE TABLE IF NOT EXISTS candidate_rankings (
    id               BIGINT PRIMARY KEY AUTO_INCREMENT,
    job_id           BIGINT NOT NULL,
    application_id   BIGINT NOT NULL,
    rank_position    INT NOT NULL,
    score            DECIMAL(5,2) NOT NULL,
    ranking_version  VARCHAR(32) NULL,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cr_job FOREIGN KEY (job_id) REFERENCES jobs (id),
    CONSTRAINT fk_cr_app FOREIGN KEY (application_id) REFERENCES applications (id),
    UNIQUE KEY uk_cr_job_app (job_id, application_id)
);

CREATE TABLE IF NOT EXISTS recommendations (
    id            BIGINT PRIMARY KEY AUTO_INCREMENT,
    subject_type  VARCHAR(32) NOT NULL,
    subject_id    BIGINT NOT NULL,
    target_type   VARCHAR(32) NOT NULL,
    target_id     BIGINT NOT NULL,
    score         DECIMAL(5,2) NOT NULL,
    reason_json   JSON NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Assessment
CREATE TABLE IF NOT EXISTS assessments (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    job_id       BIGINT NOT NULL,
    title        VARCHAR(255) NOT NULL,
    duration_seconds INT NOT NULL,
    status       VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_as_job FOREIGN KEY (job_id) REFERENCES jobs (id)
);

CREATE TABLE IF NOT EXISTS questions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    assessment_id   BIGINT NOT NULL,
    question_type   VARCHAR(32) NOT NULL,
    prompt          TEXT NOT NULL,
    points          DECIMAL(5,2) NOT NULL DEFAULT 1,
    sort_order      INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_q_as FOREIGN KEY (assessment_id) REFERENCES assessments (id)
);

CREATE TABLE IF NOT EXISTS question_options (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    question_id  BIGINT NOT NULL,
    option_text  TEXT NOT NULL,
    is_correct   BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_qo_q FOREIGN KEY (question_id) REFERENCES questions (id)
);

CREATE TABLE IF NOT EXISTS coding_problems (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    assessment_id   BIGINT NOT NULL,
    title           VARCHAR(255) NOT NULL,
    prompt          TEXT NOT NULL,
    time_limit_ms   INT NOT NULL DEFAULT 2000,
    memory_mb       INT NOT NULL DEFAULT 256,
    CONSTRAINT fk_cp_as FOREIGN KEY (assessment_id) REFERENCES assessments (id)
);

CREATE TABLE IF NOT EXISTS test_cases (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    coding_problem_id   BIGINT NOT NULL,
    input_data          TEXT NOT NULL,
    expected_output     TEXT NOT NULL,
    is_sample           BOOLEAN NOT NULL DEFAULT FALSE,
    weight              DECIMAL(5,2) NOT NULL DEFAULT 1,
    CONSTRAINT fk_tc_cp FOREIGN KEY (coding_problem_id) REFERENCES coding_problems (id)
);

CREATE TABLE IF NOT EXISTS attempts (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    assessment_id   BIGINT NOT NULL,
    application_id  BIGINT NOT NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED',
    started_at      TIMESTAMP NULL,
    submitted_at    TIMESTAMP NULL,
    duration_seconds INT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_att_as FOREIGN KEY (assessment_id) REFERENCES assessments (id),
    CONSTRAINT fk_att_app FOREIGN KEY (application_id) REFERENCES applications (id)
);

CREATE TABLE IF NOT EXISTS attempt_answers (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    attempt_id   BIGINT NOT NULL,
    question_id  BIGINT NOT NULL,
    option_id    BIGINT NULL,
    answer_text  TEXT NULL,
    CONSTRAINT fk_aa_att FOREIGN KEY (attempt_id) REFERENCES attempts (id),
    CONSTRAINT fk_aa_q FOREIGN KEY (question_id) REFERENCES questions (id)
);

CREATE TABLE IF NOT EXISTS coding_submissions (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    attempt_id          BIGINT NOT NULL,
    coding_problem_id   BIGINT NOT NULL,
    language            VARCHAR(32) NOT NULL,
    source_code         LONGTEXT NOT NULL,
    status              VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
    result_json         JSON NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cs_att FOREIGN KEY (attempt_id) REFERENCES attempts (id),
    CONSTRAINT fk_cs_cp FOREIGN KEY (coding_problem_id) REFERENCES coding_problems (id)
);

CREATE TABLE IF NOT EXISTS attempt_scores (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    attempt_id   BIGINT NOT NULL,
    total_score  DECIMAL(5,2) NOT NULL,
    breakdown_json JSON NULL,
    graded_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ascore_att FOREIGN KEY (attempt_id) REFERENCES attempts (id),
    UNIQUE KEY uk_ascore_att (attempt_id)
);

CREATE TABLE IF NOT EXISTS proctor_events (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    attempt_id   BIGINT NOT NULL,
    event_type   VARCHAR(64) NOT NULL,
    payload_json JSON NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pe_att FOREIGN KEY (attempt_id) REFERENCES attempts (id)
);

CREATE TABLE IF NOT EXISTS proctor_reports (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    attempt_id   BIGINT NOT NULL,
    risk_score   DECIMAL(5,2) NOT NULL,
    summary_json JSON NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pr_att FOREIGN KEY (attempt_id) REFERENCES attempts (id),
    UNIQUE KEY uk_pr_att (attempt_id)
);

-- Interview extras
CREATE TABLE IF NOT EXISTS interview_answer_analyses (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    answer_id    BIGINT NOT NULL,
    analysis_json JSON NOT NULL,
    model_version VARCHAR(64) NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_iaa_ans FOREIGN KEY (answer_id) REFERENCES interview_answers (id),
    UNIQUE KEY uk_iaa_ans (answer_id)
);

CREATE TABLE IF NOT EXISTS interview_feedbacks (
    id            BIGINT PRIMARY KEY AUTO_INCREMENT,
    interview_id  BIGINT NOT NULL,
    content       TEXT NOT NULL,
    shared_with_candidate BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_if_int FOREIGN KEY (interview_id) REFERENCES interviews (id),
    UNIQUE KEY uk_if_int (interview_id)
);

CREATE TABLE IF NOT EXISTS interview_schedules (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    application_id  BIGINT NOT NULL,
    interview_id    BIGINT NULL,
    starts_at       TIMESTAMP NOT NULL,
    ends_at         TIMESTAMP NOT NULL,
    timezone        VARCHAR(64) NOT NULL DEFAULT 'UTC',
    status          VARCHAR(32) NOT NULL DEFAULT 'PROPOSED',
    location_or_url VARCHAR(512) NULL,
    created_by      BIGINT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_isched_app FOREIGN KEY (application_id) REFERENCES applications (id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id      BIGINT NOT NULL,
    type         VARCHAR(64) NOT NULL,
    title        VARCHAR(255) NOT NULL,
    body         TEXT NULL,
    payload_json JSON NULL,
    read_at      TIMESTAMP NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS email_outbox (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    to_email     VARCHAR(255) NOT NULL,
    subject      VARCHAR(255) NOT NULL,
    body         TEXT NOT NULL,
    status       VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    attempts     INT NOT NULL DEFAULT 0,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at      TIMESTAMP NULL
);

-- Practice
CREATE TABLE IF NOT EXISTS practice_sessions (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    candidate_id BIGINT NOT NULL,
    topic        VARCHAR(255) NULL,
    status       VARCHAR(32) NOT NULL DEFAULT 'CREATED',
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ps_user FOREIGN KEY (candidate_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS practice_answers (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id   BIGINT NOT NULL,
    question_text TEXT NOT NULL,
    answer_text  TEXT NULL,
    audio_url    VARCHAR(512) NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pa_ps FOREIGN KEY (session_id) REFERENCES practice_sessions (id)
);

CREATE TABLE IF NOT EXISTS practice_feedbacks (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id   BIGINT NOT NULL,
    content      TEXT NOT NULL,
    score        DECIMAL(5,2) NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pf_ps FOREIGN KEY (session_id) REFERENCES practice_sessions (id),
    UNIQUE KEY uk_pf_ps (session_id)
);

-- Job publishing columns
ALTER TABLE jobs
    ADD COLUMN published_at TIMESTAMP NULL,
    ADD COLUMN deleted_at TIMESTAMP NULL;

ALTER TABLE cvs
    ADD COLUMN application_id BIGINT NULL;
