ALTER TABLE jobs ADD COLUMN ai_interview_policy_json JSON NULL;
ALTER TABLE ai_interviews
    ADD COLUMN config_snapshot_json JSON NULL,
    ADD COLUMN context_snapshot_json JSON NULL,
    ADD COLUMN report_json JSON NULL,
    ADD COLUMN attempt_number INT NOT NULL DEFAULT 1,
    ADD COLUMN expires_at TIMESTAMP NULL;
ALTER TABLE ai_questions
    ADD COLUMN rubric_json JSON NULL,
    ADD COLUMN options_json JSON NULL,
    ADD COLUMN correct_option INT NULL,
    ADD COLUMN explanation TEXT NULL;
ALTER TABLE ai_feedbacks ADD COLUMN evaluation_json JSON NULL;
CREATE INDEX idx_ai_interview_expiry ON ai_interviews(status, expires_at, id);
