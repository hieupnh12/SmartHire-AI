ALTER TABLE jobs
    ADD COLUMN ai_interview_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN ai_interview_passing_score DECIMAL(5,2) NOT NULL DEFAULT 70.00,
    ADD COLUMN ai_interview_question_count INT NOT NULL DEFAULT 5,
    ADD COLUMN ai_interview_available_until TIMESTAMP NULL;

ALTER TABLE applications
    ADD COLUMN cv_screening_status VARCHAR(16) NOT NULL DEFAULT 'PENDING';

-- Only an actual screening verdict on the latest linked CV can backfill eligibility.
UPDATE applications a
JOIN cvs c ON c.application_id = a.id
JOIN match_scores m ON m.cv_id = c.id AND m.job_id = a.job_id
LEFT JOIN cvs newer ON newer.application_id = a.id AND newer.id > c.id
SET a.cv_screening_status = CASE
    WHEN JSON_UNQUOTE(JSON_EXTRACT(m.breakdown_json, '$.passed')) = 'true' THEN 'PASSED'
    WHEN JSON_UNQUOTE(JSON_EXTRACT(m.breakdown_json, '$.passed')) = 'false' THEN 'FAILED'
    ELSE 'PENDING' END
WHERE newer.id IS NULL;

ALTER TABLE ai_interviews
    ADD COLUMN passing_score_snapshot DECIMAL(5,2) NULL,
    ADD COLUMN error_message VARCHAR(255) NULL;

CREATE INDEX idx_ai_interview_work_status ON ai_interviews(status, id);
ALTER TABLE email_outbox ADD COLUMN purpose VARCHAR(64) NULL;
CREATE INDEX idx_email_outbox_delivery ON email_outbox(purpose, status, attempts, id);
