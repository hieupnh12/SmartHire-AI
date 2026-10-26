CREATE TABLE assessment_proctor_events (
    id               BIGINT PRIMARY KEY AUTO_INCREMENT,
    submission_id    BIGINT NOT NULL,
    event            VARCHAR(64) NOT NULL,
    detail           VARCHAR(1000) NULL,
    duration_seconds BIGINT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_assessment_proctor_events_sub (submission_id, id),
    CONSTRAINT fk_assessment_proctor_submission FOREIGN KEY (submission_id)
        REFERENCES submissions (id) ON DELETE CASCADE
);
