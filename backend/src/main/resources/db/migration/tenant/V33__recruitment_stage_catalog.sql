ALTER TABLE recruitment_stages
    ADD COLUMN stage_code VARCHAR(32) NULL AFTER job_id,
    ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1 AFTER is_terminal;

UPDATE recruitment_stages rs
    INNER JOIN (
        SELECT id,
               CASE rn
                   WHEN 1 THEN 'APPLIED'
                   WHEN 2 THEN 'SCREENING'
                   WHEN 3 THEN 'ASSESSMENT'
                   WHEN 4 THEN 'INTERVIEW'
                   WHEN 5 THEN 'OFFER'
                   WHEN 6 THEN 'HIRED'
                   ELSE CONCAT('LEGACY_', rn)
               END AS mapped_code
        FROM (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY job_id ORDER BY sort_order, id) AS rn
            FROM recruitment_stages
        ) ranked
    ) mapped ON rs.id = mapped.id
SET rs.stage_code = mapped.mapped_code
WHERE rs.stage_code IS NULL;

UPDATE recruitment_stages SET stage_code = CONCAT('LEGACY_', id) WHERE stage_code IS NULL;

ALTER TABLE recruitment_stages
    MODIFY COLUMN stage_code VARCHAR(32) NOT NULL;

ALTER TABLE recruitment_stages
    ADD UNIQUE KEY uk_recruitment_stages_job_code (job_id, stage_code);
