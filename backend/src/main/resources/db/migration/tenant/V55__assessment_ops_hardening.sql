-- Publish gate verification, configurable coding weights, custom-run counters, email idempotency key.
ALTER TABLE coding_problems
    ADD COLUMN verified_at TIMESTAMP NULL,
    ADD COLUMN verified_language VARCHAR(32) NULL;

ALTER TABLE tests
    ADD COLUMN coding_test_weight_percent INT NOT NULL DEFAULT 90;

ALTER TABLE answers
    ADD COLUMN custom_run_count INT NOT NULL DEFAULT 0;

ALTER TABLE email_outbox
    ADD COLUMN reference_key VARCHAR(128) NULL;

CREATE UNIQUE INDEX uk_email_outbox_purpose_ref ON email_outbox (purpose, reference_key);
