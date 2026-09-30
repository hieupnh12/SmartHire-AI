-- V12: Align the legacy schema with the current assessment/interview entities.
-- V9 is reserved for recruiter analytics in existing tenant histories.
-- Preserve legacy rows; conversion into the new model requires a separate review.

-- ---------------------------------------------------------------------------
-- 1) Detach ranking_sources FKs that point at old attempt/interview tables
-- ---------------------------------------------------------------------------
ALTER TABLE ranking_sources DROP FOREIGN KEY fk_rank_source_attempt;
ALTER TABLE ranking_sources DROP FOREIGN KEY fk_rank_source_interview;

-- ---------------------------------------------------------------------------
-- 2) Archive legacy AI-interview child tables
-- ---------------------------------------------------------------------------
RENAME TABLE `interview_answer_analyses` TO `legacy_v12_interview_answer_analyses`;
RENAME TABLE `interview_answers` TO `legacy_v12_interview_answers`;
RENAME TABLE `interview_questions` TO `legacy_v12_interview_questions`;
RENAME TABLE `interview_scores` TO `legacy_v12_interview_scores`;
RENAME TABLE `interview_feedbacks` TO `legacy_v12_interview_feedbacks`;

-- ---------------------------------------------------------------------------
-- 3) Archive legacy assessment tables before creating the current model
-- ---------------------------------------------------------------------------
ALTER TABLE coding_submissions DROP FOREIGN KEY fk_cs_att;
ALTER TABLE coding_submissions DROP FOREIGN KEY fk_cs_cp;
ALTER TABLE proctor_events DROP FOREIGN KEY fk_pe_att;
ALTER TABLE proctor_reports DROP FOREIGN KEY fk_pr_att;
ALTER TABLE attempt_answers DROP FOREIGN KEY fk_aa_att;
ALTER TABLE attempt_answers DROP FOREIGN KEY fk_aa_q;
ALTER TABLE attempt_scores DROP FOREIGN KEY fk_ascore_att;
ALTER TABLE attempts DROP FOREIGN KEY fk_att_as;
ALTER TABLE attempts DROP FOREIGN KEY fk_att_app;
ALTER TABLE questions DROP FOREIGN KEY fk_q_as;
ALTER TABLE question_options DROP FOREIGN KEY fk_qo_q;
ALTER TABLE coding_problems DROP FOREIGN KEY fk_cp_as;
ALTER TABLE test_cases DROP FOREIGN KEY fk_tc_cp;

RENAME TABLE `attempt_scores` TO `legacy_v12_attempt_scores`;
RENAME TABLE `attempt_answers` TO `legacy_v12_attempt_answers`;
RENAME TABLE `coding_submissions` TO `legacy_v12_coding_submissions`;
RENAME TABLE `proctor_events` TO `legacy_v12_proctor_events`;
RENAME TABLE `proctor_reports` TO `legacy_v12_proctor_reports`;
RENAME TABLE `attempts` TO `legacy_v12_attempts`;
RENAME TABLE `question_options` TO `legacy_v12_question_options`;
RENAME TABLE `test_cases` TO `legacy_v12_test_cases`;
RENAME TABLE `coding_problems` TO `legacy_v12_coding_problems`;
RENAME TABLE `questions` TO `legacy_v12_questions`;
RENAME TABLE `assessments` TO `legacy_v12_assessments`;

-- ---------------------------------------------------------------------------
-- 4) Rebuild Test module tables
-- ---------------------------------------------------------------------------
CREATE TABLE tests (
    id               BIGINT PRIMARY KEY AUTO_INCREMENT,
    job_id           BIGINT NOT NULL,
    title            VARCHAR(255) NOT NULL,
    description      TEXT NULL,
    duration_minutes INT NOT NULL,
    passing_score    DECIMAL(10,2) NULL,
    status           VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tests_job FOREIGN KEY (job_id) REFERENCES jobs (id)
);

CREATE TABLE questions (
    id             BIGINT PRIMARY KEY AUTO_INCREMENT,
    test_id        BIGINT NOT NULL,
    question_text  TEXT NOT NULL,
    question_type  VARCHAR(32) NOT NULL,
    points         INT NOT NULL DEFAULT 1,
    question_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_questions_test FOREIGN KEY (test_id) REFERENCES tests (id)
);

CREATE TABLE options (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    question_id  BIGINT NOT NULL,
    option_text  TEXT NOT NULL,
    is_correct   BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_options_question FOREIGN KEY (question_id) REFERENCES questions (id)
);

CREATE TABLE submissions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    test_id         BIGINT NOT NULL,
    candidate_id    BIGINT NOT NULL,
    application_id  BIGINT NOT NULL,
    started_at      TIMESTAMP NULL,
    submitted_at    TIMESTAMP NULL,
    score           DECIMAL(10,2) NULL,
    notes           TEXT NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_submissions_test FOREIGN KEY (test_id) REFERENCES tests (id),
    CONSTRAINT fk_submissions_candidate FOREIGN KEY (candidate_id) REFERENCES users (id),
    CONSTRAINT fk_submissions_application FOREIGN KEY (application_id) REFERENCES applications (id)
);

CREATE TABLE answers (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    submission_id       BIGINT NOT NULL,
    question_id         BIGINT NOT NULL,
    selected_option_id  BIGINT NULL,
    answer_text         TEXT NULL,
    is_correct          BOOLEAN NULL,
    score               DECIMAL(10,2) NULL,
    CONSTRAINT fk_answers_submission FOREIGN KEY (submission_id) REFERENCES submissions (id),
    CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES questions (id),
    CONSTRAINT fk_answers_option FOREIGN KEY (selected_option_id) REFERENCES options (id)
);

CREATE TABLE coding_problems (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    test_id         BIGINT NOT NULL,
    title           VARCHAR(255) NOT NULL,
    prompt          TEXT NOT NULL,
    time_limit_ms   INT NOT NULL DEFAULT 2000,
    memory_mb       INT NOT NULL DEFAULT 256,
    CONSTRAINT fk_cp_test FOREIGN KEY (test_id) REFERENCES tests (id)
);

CREATE TABLE test_cases (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    coding_problem_id   BIGINT NOT NULL,
    input_data          TEXT NOT NULL,
    expected_output     TEXT NOT NULL,
    is_sample           BOOLEAN NOT NULL DEFAULT FALSE,
    weight              DECIMAL(5,2) NOT NULL DEFAULT 1,
    CONSTRAINT fk_tc_cp FOREIGN KEY (coding_problem_id) REFERENCES coding_problems (id)
);

CREATE TABLE coding_submissions (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    submission_id       BIGINT NOT NULL,
    coding_problem_id   BIGINT NOT NULL,
    language            VARCHAR(32) NOT NULL,
    source_code         LONGTEXT NOT NULL,
    status              VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
    result_json         JSON NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cs_submission FOREIGN KEY (submission_id) REFERENCES submissions (id),
    CONSTRAINT fk_cs_cp FOREIGN KEY (coding_problem_id) REFERENCES coding_problems (id)
);

CREATE TABLE proctor_events (
    id             BIGINT PRIMARY KEY AUTO_INCREMENT,
    submission_id  BIGINT NOT NULL,
    event_type     VARCHAR(64) NOT NULL,
    payload_json   JSON NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pe_submission FOREIGN KEY (submission_id) REFERENCES submissions (id)
);

CREATE TABLE proctor_reports (
    id             BIGINT PRIMARY KEY AUTO_INCREMENT,
    submission_id  BIGINT NOT NULL,
    risk_score     DECIMAL(5,2) NOT NULL,
    summary_json   JSON NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pr_submission FOREIGN KEY (submission_id) REFERENCES submissions (id),
    UNIQUE KEY uk_pr_submission (submission_id)
);

-- ---------------------------------------------------------------------------
-- 5) Rebuild interviews as direct (human) interviews
-- ---------------------------------------------------------------------------
ALTER TABLE interview_schedules DROP FOREIGN KEY fk_isched_app;
RENAME TABLE `interview_schedules` TO `legacy_v12_interview_schedules`;
RENAME TABLE `interviews` TO `legacy_v12_interviews`;

CREATE TABLE interviews (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    application_id  BIGINT NOT NULL,
    interview_type  VARCHAR(64) NOT NULL,
    mode            VARCHAR(64) NOT NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'CREATED',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_interviews_application FOREIGN KEY (application_id) REFERENCES applications (id)
);

CREATE TABLE interview_schedules (
    id               BIGINT PRIMARY KEY AUTO_INCREMENT,
    interview_id     BIGINT NOT NULL,
    scheduled_start  TIMESTAMP NOT NULL,
    scheduled_end    TIMESTAMP NOT NULL,
    location         VARCHAR(255) NULL,
    meeting_url      VARCHAR(512) NULL,
    status           VARCHAR(32) NOT NULL DEFAULT 'PROPOSED',
    CONSTRAINT fk_isched_interview FOREIGN KEY (interview_id) REFERENCES interviews (id)
);

CREATE TABLE interview_participants (
    interview_id      BIGINT NOT NULL,
    user_id           BIGINT NOT NULL,
    participant_role  VARCHAR(64) NOT NULL,
    joined_at         TIMESTAMP NULL,
    PRIMARY KEY (interview_id, user_id),
    CONSTRAINT fk_ip_interview FOREIGN KEY (interview_id) REFERENCES interviews (id),
    CONSTRAINT fk_ip_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE interview_security_settings (
    id                       BIGINT PRIMARY KEY AUTO_INCREMENT,
    interview_id             BIGINT NOT NULL,
    camera_required          BOOLEAN NOT NULL DEFAULT FALSE,
    microphone_required      BOOLEAN NOT NULL DEFAULT FALSE,
    screen_share_required    BOOLEAN NOT NULL DEFAULT FALSE,
    fullscreen_required      BOOLEAN NOT NULL DEFAULT FALSE,
    browser_restriction      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_iss_interview FOREIGN KEY (interview_id) REFERENCES interviews (id),
    UNIQUE KEY uk_iss_interview (interview_id)
);

CREATE TABLE interview_evaluations (
    id                   BIGINT PRIMARY KEY AUTO_INCREMENT,
    interview_id         BIGINT NOT NULL,
    evaluator_id         BIGINT NOT NULL,
    technical_score      DECIMAL(10,2) NULL,
    communication_score  DECIMAL(10,2) NULL,
    culture_score        DECIMAL(10,2) NULL,
    overall_score        DECIMAL(10,2) NULL,
    comments             TEXT NULL,
    recommendation       VARCHAR(64) NULL,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ie_interview FOREIGN KEY (interview_id) REFERENCES interviews (id),
    CONSTRAINT fk_ie_evaluator FOREIGN KEY (evaluator_id) REFERENCES users (id)
);

-- ---------------------------------------------------------------------------
-- 6) AI Interview module
-- ---------------------------------------------------------------------------
CREATE TABLE ai_interviews (
    id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
    application_id     BIGINT NOT NULL,
    workflow_stage_id  BIGINT NULL,
    started_at         TIMESTAMP NULL,
    completed_at       TIMESTAMP NULL,
    overall_score      DECIMAL(10,2) NULL,
    status             VARCHAR(32) NOT NULL DEFAULT 'CREATED',
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_int_application FOREIGN KEY (application_id) REFERENCES applications (id),
    CONSTRAINT fk_ai_int_stage FOREIGN KEY (workflow_stage_id) REFERENCES recruitment_stages (id)
);

CREATE TABLE ai_questions (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    ai_interview_id BIGINT NOT NULL,
    question_text   TEXT NOT NULL,
    question_type   VARCHAR(32) NOT NULL,
    question_order  INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_q_interview FOREIGN KEY (ai_interview_id) REFERENCES ai_interviews (id)
);

CREATE TABLE ai_answers (
    id               BIGINT PRIMARY KEY AUTO_INCREMENT,
    ai_question_id   BIGINT NOT NULL,
    answer_text      TEXT NULL,
    answer_duration  INT NULL,
    answered_at      TIMESTAMP NULL,
    CONSTRAINT fk_ai_a_question FOREIGN KEY (ai_question_id) REFERENCES ai_questions (id),
    UNIQUE KEY uk_ai_a_question (ai_question_id)
);

CREATE TABLE ai_feedbacks (
    id             BIGINT PRIMARY KEY AUTO_INCREMENT,
    ai_answer_id   BIGINT NOT NULL,
    score          DECIMAL(10,2) NULL,
    feedback_text  TEXT NULL,
    strengths      TEXT NULL,
    weaknesses     TEXT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_f_answer FOREIGN KEY (ai_answer_id) REFERENCES ai_answers (id),
    UNIQUE KEY uk_ai_f_answer (ai_answer_id)
);

-- ---------------------------------------------------------------------------
-- 7) Practice alignment
-- ---------------------------------------------------------------------------
ALTER TABLE practice_feedbacks DROP FOREIGN KEY fk_pf_ps;
RENAME TABLE `practice_feedbacks` TO `legacy_v12_practice_feedbacks`;

ALTER TABLE practice_sessions
    ADD COLUMN started_at TIMESTAMP NULL AFTER topic,
    ADD COLUMN completed_at TIMESTAMP NULL AFTER started_at,
    ADD COLUMN overall_score DECIMAL(10,2) NULL AFTER completed_at;

ALTER TABLE practice_answers
    ADD COLUMN question_type VARCHAR(32) NULL AFTER question_text,
    ADD COLUMN question_order INT NULL AFTER question_type,
    ADD COLUMN answer_duration INT NULL AFTER answer_text,
    ADD COLUMN answered_at TIMESTAMP NULL AFTER audio_url;

CREATE TABLE practice_feedbacks (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    practice_answer_id  BIGINT NOT NULL,
    score               DECIMAL(10,2) NULL,
    feedback_text       TEXT NULL,
    strengths           TEXT NULL,
    weaknesses          TEXT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pf_answer FOREIGN KEY (practice_answer_id) REFERENCES practice_answers (id)
);

-- ---------------------------------------------------------------------------
-- 8) ranking_sources → submission / ai_interview
-- ---------------------------------------------------------------------------
ALTER TABLE ranking_sources
    CHANGE COLUMN attempt_id legacy_attempt_id BIGINT NULL,
    CHANGE COLUMN interview_id legacy_interview_id BIGINT NULL,
    ADD COLUMN submission_id BIGINT NULL,
    ADD COLUMN ai_interview_id BIGINT NULL;

-- Legacy source IDs are retained above; new sources start unselected.

ALTER TABLE ranking_sources
    ADD CONSTRAINT fk_rank_source_submission FOREIGN KEY (submission_id) REFERENCES submissions (id),
    ADD CONSTRAINT fk_rank_source_ai_interview FOREIGN KEY (ai_interview_id) REFERENCES ai_interviews (id);
