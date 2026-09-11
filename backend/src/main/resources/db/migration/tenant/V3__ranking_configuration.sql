CREATE TABLE ranking_configs (
    job_id BIGINT PRIMARY KEY,
    config_json JSON NOT NULL,
    revision BIGINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_rank_config_job FOREIGN KEY (job_id) REFERENCES jobs(id)
);
CREATE TABLE ranking_sources (
    application_id BIGINT PRIMARY KEY,
    cv_id BIGINT NULL,
    attempt_id BIGINT NULL,
    interview_id BIGINT NULL,
    CONSTRAINT fk_rank_source_app FOREIGN KEY (application_id) REFERENCES applications(id),
    CONSTRAINT fk_rank_source_cv FOREIGN KEY (cv_id) REFERENCES cvs(id),
    CONSTRAINT fk_rank_source_attempt FOREIGN KEY (attempt_id) REFERENCES attempts(id),
    CONSTRAINT fk_rank_source_interview FOREIGN KEY (interview_id) REFERENCES interviews(id)
);
