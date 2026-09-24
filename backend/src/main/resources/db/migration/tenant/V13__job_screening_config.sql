-- Per-job CV Screening weights and independent Gate Screening weights.
-- Live tenant flyway_schema_history already has V9–V12 (analytics, roles, interview/test redesign).
-- Recruiter can change both groups later; they are never shared with ranking_configs (RANK-03).

CREATE TABLE job_screening_configs (
    job_id BIGINT PRIMARY KEY,
    cv_skill_weight DECIMAL(5,2) NOT NULL,
    cv_preferred_weight DECIMAL(5,2) NOT NULL,
    cv_experience_weight DECIMAL(5,2) NOT NULL,
    cv_education_weight DECIMAL(5,2) NOT NULL,
    cv_jaccard_weight DECIMAL(5,2) NOT NULL,
    cv_semantic_weight DECIMAL(5,2) NOT NULL,
    cv_pass_threshold DECIMAL(5,2) NOT NULL,
    gate_cv_weight DECIMAL(5,2) NOT NULL,
    gate_interview_weight DECIMAL(5,2) NOT NULL,
    gate_assessment_weight DECIMAL(5,2) NOT NULL,
    gate_pass_threshold DECIMAL(5,2) NOT NULL,
    CONSTRAINT fk_job_screening_job FOREIGN KEY (job_id) REFERENCES jobs(id),
    CONSTRAINT chk_cv_weights_nonneg CHECK (
        cv_skill_weight >= 0 AND cv_preferred_weight >= 0 AND cv_experience_weight >= 0
        AND cv_education_weight >= 0 AND cv_jaccard_weight >= 0 AND cv_semantic_weight >= 0
    ),
    CONSTRAINT chk_gate_weights_nonneg CHECK (
        gate_cv_weight >= 0 AND gate_interview_weight >= 0 AND gate_assessment_weight >= 0
    ),
    CONSTRAINT chk_cv_threshold CHECK (cv_pass_threshold >= 0 AND cv_pass_threshold <= 100),
    CONSTRAINT chk_gate_threshold CHECK (gate_pass_threshold >= 0 AND gate_pass_threshold <= 100)
);

INSERT INTO job_screening_configs (
    job_id,
    cv_skill_weight, cv_preferred_weight, cv_experience_weight, cv_education_weight, cv_jaccard_weight, cv_semantic_weight,
    cv_pass_threshold,
    gate_cv_weight, gate_interview_weight, gate_assessment_weight, gate_pass_threshold
)
SELECT
    id,
    40.00, 8.00, 12.00, 0.00, 15.00, 25.00,
    60.00,
    40.00, 35.00, 25.00, 70.00
FROM jobs;

CREATE TABLE gate_scores (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    application_id BIGINT NOT NULL UNIQUE,
    score DECIMAL(5,2) NOT NULL,
    breakdown_json JSON NOT NULL,
    passed BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_gate_score_application FOREIGN KEY (application_id) REFERENCES applications(id)
);
