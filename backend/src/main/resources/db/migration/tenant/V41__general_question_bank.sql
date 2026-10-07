-- Standalone bank questions do not require a JobTest. Existing test questions retain their FK.
ALTER TABLE questions
    MODIFY COLUMN test_id BIGINT NULL,
    ADD COLUMN authoring_metadata JSON NULL,
    ADD COLUMN bank_archived BOOLEAN NOT NULL DEFAULT FALSE;
