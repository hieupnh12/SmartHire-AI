-- Idempotent: tenants migrated under the old numbering (V20) already have this column.
SET @db := DATABASE();

SET @exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'jobs' AND COLUMN_NAME = 'screening_mode'
);
SET @sql := IF(
    @exists = 0,
    'ALTER TABLE jobs ADD COLUMN screening_mode VARCHAR(16) NOT NULL DEFAULT ''MANUAL'' AFTER work_mode',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
