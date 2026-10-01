-- V37: Granular Job Permissions (can_view, can_edit) and Role Backfill
SET @db := DATABASE();

SET @exists_view := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'job_assignments' AND COLUMN_NAME = 'can_view'
);
SET @sql_view := IF(
    @exists_view = 0,
    'ALTER TABLE job_assignments ADD COLUMN can_view BOOLEAN NOT NULL DEFAULT TRUE AFTER assignment_role',
    'SELECT 1'
);
PREPARE stmt FROM @sql_view; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists_edit := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'job_assignments' AND COLUMN_NAME = 'can_edit'
);
SET @sql_edit := IF(
    @exists_edit = 0,
    'ALTER TABLE job_assignments ADD COLUMN can_edit BOOLEAN NOT NULL DEFAULT FALSE AFTER can_view',
    'SELECT 1'
);
PREPARE stmt FROM @sql_edit; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill legacy roles and flags
UPDATE job_assignments
SET assignment_role = 'OWNER', can_view = TRUE, can_edit = TRUE
WHERE assignment_role = 'PRIMARY_RECRUITER';

UPDATE job_assignments
SET assignment_role = 'COLLABORATOR', can_view = TRUE, can_edit = TRUE
WHERE assignment_role = 'CO_RECRUITER';

UPDATE job_assignments
SET can_view = TRUE, can_edit = TRUE
WHERE assignment_role IN ('OWNER', 'COLLABORATOR');

UPDATE job_assignments
SET can_view = TRUE, can_edit = FALSE
WHERE assignment_role IN ('VIEWER', 'HIRING_MANAGER');
