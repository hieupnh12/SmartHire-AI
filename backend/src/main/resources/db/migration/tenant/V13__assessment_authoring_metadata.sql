-- Enrich assessment authoring metadata used by recruiter Excel/UI flows.
-- difficulty/skill/explanation are persisted for staff; never required for candidate take-test.

ALTER TABLE tests
    ADD COLUMN created_by BIGINT NULL,
    ADD COLUMN updated_at TIMESTAMP NULL,
    ADD CONSTRAINT fk_tests_created_by FOREIGN KEY (created_by) REFERENCES users (id);

UPDATE tests SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE questions
    ADD COLUMN difficulty VARCHAR(16) NULL,
    ADD COLUMN skill VARCHAR(255) NULL,
    ADD COLUMN explanation TEXT NULL;
