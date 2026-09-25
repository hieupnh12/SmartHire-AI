CREATE TABLE job_recruiter_assignments (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    job_id          BIGINT      NOT NULL,
    recruiter_id    BIGINT      NOT NULL,
    assignment_role VARCHAR(32) NOT NULL DEFAULT 'OWNER',
    assigned_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unassigned_at   TIMESTAMP   NULL,
    created_by      BIGINT      NULL,
    CONSTRAINT fk_jra_job FOREIGN KEY (job_id) REFERENCES jobs (id),
    CONSTRAINT fk_jra_recruiter FOREIGN KEY (recruiter_id) REFERENCES users (id),
    UNIQUE KEY uk_jra_job_recruiter (job_id, recruiter_id),
    INDEX idx_jra_recruiter_active (recruiter_id, unassigned_at)
);

INSERT INTO job_recruiter_assignments (job_id, recruiter_id, assignment_role, created_by)
SELECT id, created_by, 'OWNER', created_by FROM jobs;

CREATE TABLE recruitment_sla_policies (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    job_id              BIGINT      NULL,
    stage_id            BIGINT      NULL,
    application_status  VARCHAR(32) NOT NULL,
    threshold_minutes   INT         NOT NULL,
    active              BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sla_job FOREIGN KEY (job_id) REFERENCES jobs (id),
    CONSTRAINT fk_sla_stage FOREIGN KEY (stage_id) REFERENCES recruitment_stages (id),
    INDEX idx_sla_lookup (job_id, stage_id, application_status, active)
);

INSERT INTO recruitment_sla_policies (application_status, threshold_minutes) VALUES
    ('NEW', 1440), ('IN_REVIEW', 1440), ('ASSESSMENT', 2880),
    ('INTERVIEW', 1440), ('OFFER', 1440);

CREATE TABLE offers (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    application_id  BIGINT       NOT NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'DRAFT',
    offered_at      TIMESTAMP    NULL,
    expires_at      TIMESTAMP    NULL,
    accepted_at     TIMESTAMP    NULL,
    declined_at     TIMESTAMP    NULL,
    withdrawn_at    TIMESTAMP    NULL,
    created_by      BIGINT       NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_offer_application FOREIGN KEY (application_id) REFERENCES applications (id),
    CONSTRAINT fk_offer_creator FOREIGN KEY (created_by) REFERENCES users (id),
    INDEX idx_offer_status_date (status, offered_at)
);

ALTER TABLE attempts
    ADD COLUMN review_status VARCHAR(32) NOT NULL DEFAULT 'NOT_REQUIRED',
    ADD COLUMN reviewed_by BIGINT NULL,
    ADD COLUMN reviewed_at TIMESTAMP NULL,
    ADD COLUMN review_note TEXT NULL,
    ADD CONSTRAINT fk_attempt_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id);

CREATE TABLE candidate_quality_snapshots (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    application_id  BIGINT         NOT NULL,
    score           DECIMAL(5,2)   NOT NULL,
    components_json JSON           NULL,
    model_version   VARCHAR(64)    NULL,
    calculated_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cqs_application FOREIGN KEY (application_id) REFERENCES applications (id),
    INDEX idx_cqs_application_date (application_id, calculated_at)
);

INSERT INTO candidate_quality_snapshots (application_id, score, model_version, calculated_at)
SELECT application_id, overall, ranking_version, updated_at FROM overall_scores;

CREATE TABLE analytics_targets (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    metric_code         VARCHAR(64)   NOT NULL,
    target_value        DECIMAL(12,2) NOT NULL,
    comparison_operator VARCHAR(8)    NOT NULL,
    effective_from      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_to        TIMESTAMP     NULL,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_target_effective (metric_code, effective_from, effective_to)
);

INSERT INTO analytics_targets (metric_code, target_value, comparison_operator) VALUES
    ('TIME_TO_SHORTLIST_DAYS', 3, 'LTE'),
    ('RESPONSE_TIME_HOURS', 24, 'LTE'),
    ('OFFER_ACCEPTANCE_PERCENT', 75, 'GTE'),
    ('HIRE_RATE_PERCENT', 14.8, 'GTE');

CREATE INDEX idx_app_assignee_created ON applications (assignee_id, created_at);
CREATE INDEX idx_app_source_created ON applications (source, created_at);
CREATE INDEX idx_history_status_created ON application_status_history (to_status, created_at);
CREATE INDEX idx_schedule_status_start ON interview_schedules (status, starts_at);
