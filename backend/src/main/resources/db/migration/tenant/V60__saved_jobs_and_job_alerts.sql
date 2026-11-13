CREATE TABLE saved_jobs (
    id           BIGINT NOT NULL AUTO_INCREMENT,
    candidate_id BIGINT NOT NULL,
    job_id       BIGINT NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_saved_jobs_candidate FOREIGN KEY (candidate_id) REFERENCES candidates (id) ON DELETE CASCADE,
    CONSTRAINT fk_saved_jobs_job FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE,
    CONSTRAINT uk_saved_jobs_candidate_job UNIQUE (candidate_id, job_id),
    KEY idx_saved_jobs_candidate (candidate_id, created_at DESC),
    KEY idx_saved_jobs_job (job_id)
);

CREATE TABLE job_alerts (
    id              BIGINT NOT NULL AUTO_INCREMENT,
    candidate_id    BIGINT NOT NULL,
    keyword         VARCHAR(255) NULL,
    department      VARCHAR(128) NULL,
    location        VARCHAR(255) NULL,
    work_mode       VARCHAR(32) NULL,
    employment_type VARCHAR(32) NULL,
    web_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_job_alerts_candidate FOREIGN KEY (candidate_id) REFERENCES candidates (id) ON DELETE CASCADE,
    KEY idx_job_alerts_candidate (candidate_id),
    KEY idx_job_alerts_active (active)
);

CREATE INDEX idx_rec_subject_target ON recommendations (subject_type, subject_id, target_type, score DESC);

