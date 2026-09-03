-- Baseline schema for Tenant Database in SmartHire-AI Multi-Tenant SaaS
-- Executed per Tenant DB

CREATE TABLE users (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(32)  NOT NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_users_email (email)
);

CREATE TABLE oauth_accounts (
    id                BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id           BIGINT       NOT NULL,
    provider          VARCHAR(32)  NOT NULL,
    provider_user_id  VARCHAR(255) NOT NULL,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_oauth_user FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE KEY uk_oauth_provider_user (provider, provider_user_id)
);

CREATE TABLE jobs (
    id               BIGINT PRIMARY KEY AUTO_INCREMENT,
    title            VARCHAR(255) NOT NULL,
    description      TEXT         NOT NULL,
    location         VARCHAR(255) NULL,
    employment_type  VARCHAR(32)  NULL,
    status           VARCHAR(32)  NOT NULL DEFAULT 'DRAFT',
    created_by       BIGINT       NOT NULL,
    closed_at        TIMESTAMP    NULL,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_jobs_user FOREIGN KEY (created_by) REFERENCES users (id)
);

CREATE TABLE cvs (
    id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
    job_id             BIGINT       NOT NULL,
    user_id            BIGINT       NOT NULL,
    original_filename  VARCHAR(255) NOT NULL,
    file_url           VARCHAR(512) NOT NULL,
    status             VARCHAR(32)  NOT NULL DEFAULT 'UPLOADED',
    created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cvs_job FOREIGN KEY (job_id) REFERENCES jobs (id),
    CONSTRAINT fk_cvs_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE cv_analyses (
    id               BIGINT PRIMARY KEY AUTO_INCREMENT,
    cv_id            BIGINT       NOT NULL,
    summary          TEXT         NULL,
    skills_json      JSON         NULL,
    years_experience DECIMAL(4,1) NULL,
    raw_json         JSON         NULL,
    model_version    VARCHAR(64)  NULL,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cv_analyses_cv FOREIGN KEY (cv_id) REFERENCES cvs (id),
    UNIQUE KEY uk_cv_analyses_cv (cv_id)
);

CREATE TABLE match_scores (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    job_id          BIGINT         NOT NULL,
    cv_id           BIGINT         NOT NULL,
    score           DECIMAL(5,2)   NOT NULL,
    breakdown_json  JSON           NULL,
    model_version   VARCHAR(64)    NULL,
    created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_match_job FOREIGN KEY (job_id) REFERENCES jobs (id),
    CONSTRAINT fk_match_cv FOREIGN KEY (cv_id) REFERENCES cvs (id),
    UNIQUE KEY uk_match_job_cv (job_id, cv_id)
);

CREATE TABLE interviews (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    job_id       BIGINT      NOT NULL,
    candidate_id BIGINT      NOT NULL,
    cv_id        BIGINT      NULL,
    status       VARCHAR(32) NOT NULL DEFAULT 'CREATED',
    created_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_interviews_job FOREIGN KEY (job_id) REFERENCES jobs (id),
    CONSTRAINT fk_interviews_candidate FOREIGN KEY (candidate_id) REFERENCES users (id),
    CONSTRAINT fk_interviews_cv FOREIGN KEY (cv_id) REFERENCES cvs (id)
);

CREATE TABLE interview_questions (
    id            BIGINT PRIMARY KEY AUTO_INCREMENT,
    interview_id  BIGINT       NOT NULL,
    sort_order    INT          NOT NULL,
    question_text TEXT         NOT NULL,
    competency    VARCHAR(128) NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_iq_interview FOREIGN KEY (interview_id) REFERENCES interviews (id)
);

CREATE TABLE interview_answers (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    question_id  BIGINT       NOT NULL,
    audio_url    VARCHAR(512) NULL,
    transcript   TEXT         NULL,
    status       VARCHAR(32)  NOT NULL DEFAULT 'RECORDED',
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ia_question FOREIGN KEY (question_id) REFERENCES interview_questions (id),
    UNIQUE KEY uk_answer_question (question_id)
);

CREATE TABLE interview_scores (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    interview_id    BIGINT       NOT NULL,
    overall_score   DECIMAL(5,2) NOT NULL,
    breakdown_json  JSON         NULL,
    feedback        TEXT         NULL,
    model_version   VARCHAR(64)  NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_is_interview FOREIGN KEY (interview_id) REFERENCES interviews (id),
    UNIQUE KEY uk_score_interview (interview_id)
);
