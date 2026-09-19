ALTER TABLE applications
    ADD COLUMN referral_code VARCHAR(64) NULL,
    ADD COLUMN tags VARCHAR(512) NULL,
    ADD COLUMN assignee_id BIGINT NULL,
    ADD COLUMN archived_at TIMESTAMP NULL,
    ADD COLUMN reject_reason TEXT NULL,
    ADD COLUMN withdrawn_at TIMESTAMP NULL,
    ADD CONSTRAINT fk_app_assignee FOREIGN KEY (assignee_id) REFERENCES users (id);

CREATE INDEX idx_app_job_status ON applications (job_id, status);
CREATE INDEX idx_app_archived ON applications (job_id, archived_at);

ALTER TABLE cvs
    ADD COLUMN retain_until TIMESTAMP NULL;

UPDATE cvs SET retain_until = DATE_ADD(created_at, INTERVAL 24 MONTH) WHERE retain_until IS NULL;
