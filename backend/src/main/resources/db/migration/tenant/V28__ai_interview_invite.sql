-- Idempotent: tenants migrated under the old numbering (V14/V18) already have this column.
SET @db := DATABASE();

SET @exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'applications' AND COLUMN_NAME = 'ai_interview_invited_at'
);
SET @sql := IF(
    @exists = 0,
    'ALTER TABLE applications ADD COLUMN ai_interview_invited_at TIMESTAMP NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
