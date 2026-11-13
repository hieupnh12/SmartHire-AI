-- Master DB Migration: Persist proposed tenant code/subdomain & quoted plan on consultation_requests
ALTER TABLE consultation_requests
    ADD COLUMN IF NOT EXISTS proposed_code VARCHAR(64) NULL,
    ADD COLUMN IF NOT EXISTS proposed_subdomain VARCHAR(128) NULL,
    ADD COLUMN IF NOT EXISTS quoted_plan_id BIGINT NULL;
