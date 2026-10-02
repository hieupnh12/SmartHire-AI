-- Re-apply V13 assessment authoring columns for tenants whose V13 was a different
-- migration (e.g. ttqt: "job screening config"). Idempotent — no-op when already present.

SET @db := DATABASE();

SET @exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tests' AND COLUMN_NAME = 'created_by'
);
SET @sql := IF(
    @exists = 0,
    'ALTER TABLE tests ADD COLUMN created_by BIGINT NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tests' AND COLUMN_NAME = 'updated_at'
);
SET @sql := IF(
    @exists = 0,
    'ALTER TABLE tests ADD COLUMN updated_at TIMESTAMP NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'tests' AND CONSTRAINT_NAME = 'fk_tests_created_by'
);
SET @sql := IF(
    @exists = 0,
    'ALTER TABLE tests ADD CONSTRAINT fk_tests_created_by FOREIGN KEY (created_by) REFERENCES users (id)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE tests SET updated_at = created_at WHERE updated_at IS NULL;

SET @exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'questions' AND COLUMN_NAME = 'difficulty'
);
SET @sql := IF(
    @exists = 0,
    'ALTER TABLE questions ADD COLUMN difficulty VARCHAR(16) NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'questions' AND COLUMN_NAME = 'skill'
);
SET @sql := IF(
    @exists = 0,
    'ALTER TABLE questions ADD COLUMN skill VARCHAR(255) NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'questions' AND COLUMN_NAME = 'explanation'
);
SET @sql := IF(
    @exists = 0,
    'ALTER TABLE questions ADD COLUMN explanation TEXT NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
