-- CV screening operations. Idempotent so a previous failed apply can be retried.
-- Do not use a second TIMESTAMP ... ON UPDATE CURRENT_TIMESTAMP (MySQL 5.7 rejects it).

SET @db := DATABASE();

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'cvs' AND COLUMN_NAME = 'mime_type');
SET @sql := IF(@exists = 0, 'ALTER TABLE cvs ADD COLUMN mime_type VARCHAR(128) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'cvs' AND COLUMN_NAME = 'file_size');
SET @sql := IF(@exists = 0, 'ALTER TABLE cvs ADD COLUMN file_size BIGINT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'cvs' AND COLUMN_NAME = 'checksum_sha256');
SET @sql := IF(@exists = 0, 'ALTER TABLE cvs ADD COLUMN checksum_sha256 CHAR(64) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'cvs' AND COLUMN_NAME = 'storage_key');
SET @sql := IF(@exists = 0, 'ALTER TABLE cvs ADD COLUMN storage_key VARCHAR(512) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'cvs' AND COLUMN_NAME = 'error_code');
SET @sql := IF(@exists = 0, 'ALTER TABLE cvs ADD COLUMN error_code VARCHAR(64) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'cvs' AND COLUMN_NAME = 'error_message');
SET @sql := IF(@exists = 0, 'ALTER TABLE cvs ADD COLUMN error_message VARCHAR(512) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'cv_documents' AND COLUMN_NAME = 'parser_version');
SET @sql := IF(@exists = 0, 'ALTER TABLE cv_documents ADD COLUMN parser_version VARCHAR(64) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'cv_documents' AND COLUMN_NAME = 'ocr_used');
SET @sql := IF(@exists = 0, 'ALTER TABLE cv_documents ADD COLUMN ocr_used BOOLEAN NOT NULL DEFAULT FALSE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'cv_extractions' AND COLUMN_NAME = 'prompt_version');
SET @sql := IF(@exists = 0, 'ALTER TABLE cv_extractions ADD COLUMN prompt_version VARCHAR(64) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'cv_extractions' AND COLUMN_NAME = 'updated_at');
SET @sql := IF(@exists = 0, 'ALTER TABLE cv_extractions ADD COLUMN updated_at DATETIME NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'cv_analyses' AND COLUMN_NAME = 'prompt_version');
SET @sql := IF(@exists = 0, 'ALTER TABLE cv_analyses ADD COLUMN prompt_version VARCHAR(64) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'skills' AND COLUMN_NAME = 'aliases_json');
SET @sql := IF(@exists = 0, 'ALTER TABLE skills ADD COLUMN aliases_json JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
