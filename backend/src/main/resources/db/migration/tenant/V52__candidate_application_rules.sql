ALTER TABLE applications
    ADD COLUMN withdraw_reason VARCHAR(255) NULL;

CREATE INDEX idx_app_candidate_status ON applications (candidate_id, status);
CREATE INDEX idx_app_status_updated ON applications (status, updated_at);
CREATE INDEX idx_cvs_retain_until ON cvs (retain_until);
