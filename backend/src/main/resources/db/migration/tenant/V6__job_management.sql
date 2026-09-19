-- Job recruitment fields used by recruiter management and public career pages.

ALTER TABLE jobs
    ADD COLUMN department VARCHAR(128) NULL,
    ADD COLUMN work_mode VARCHAR(32) NULL,
    ADD COLUMN headcount INT NULL,
    ADD COLUMN deadline DATE NULL,
    ADD COLUMN salary_min DECIMAL(12, 2) NULL,
    ADD COLUMN salary_max DECIMAL(12, 2) NULL,
    ADD COLUMN salary_currency VARCHAR(8) NULL,
    ADD COLUMN salary_visible BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN responsibilities TEXT NULL,
    ADD COLUMN benefits TEXT NULL,
    ADD COLUMN min_years_experience DECIMAL(4, 1) NULL,
    ADD COLUMN education_level VARCHAR(64) NULL,
    ADD COLUMN paused_at TIMESTAMP NULL;
