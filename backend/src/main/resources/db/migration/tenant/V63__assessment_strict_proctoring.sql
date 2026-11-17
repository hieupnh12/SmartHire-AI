-- V63: Assessment strict live proctoring (secondary device Google Meet & HR approval gate)
ALTER TABLE tests
    ADD COLUMN strict_proctor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN proctor_meet_url VARCHAR(512) NULL;

ALTER TABLE submissions
    ADD COLUMN proctor_approved BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN proctor_approved_at TIMESTAMP NULL,
    ADD COLUMN proctor_candidate_ready BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN proctor_meet_url VARCHAR(512) NULL,
    ADD COLUMN proctor_violations_count INT NOT NULL DEFAULT 0,
    ADD COLUMN proctor_terminated_reason VARCHAR(255) NULL;

