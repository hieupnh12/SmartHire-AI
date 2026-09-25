CREATE TABLE IF NOT EXISTS roles (
    id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    code       VARCHAR(64)  NOT NULL,
    name       VARCHAR(128) NOT NULL,
    workspace  VARCHAR(32)  NOT NULL,
    is_system  TINYINT(1)   NOT NULL DEFAULT 0,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_roles_code (code)
);

INSERT IGNORE INTO roles (code, name, workspace, is_system)
VALUES
    ('TENANT_ADMIN', 'Tenant Admin', 'ADMIN', 1),
    ('ADMIN', 'Admin', 'ADMIN', 1),
    ('HR', 'HR', 'RECRUITER', 1),
    ('RECRUITER', 'Recruiter', 'RECRUITER', 1),
    ('CANDIDATE', 'Candidate', 'CANDIDATE', 1);

ALTER TABLE users MODIFY COLUMN role VARCHAR(64) NOT NULL;
ALTER TABLE member_invitations MODIFY COLUMN role VARCHAR(64) NOT NULL;

-- Widen only when the table exists (half-migrated tenants).
SET @widen_role_permissions := IF(
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'role_permissions') > 0,
    'ALTER TABLE role_permissions MODIFY COLUMN `role` VARCHAR(64) NOT NULL',
    'SELECT 1');
PREPARE stmt FROM @widen_role_permissions;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
