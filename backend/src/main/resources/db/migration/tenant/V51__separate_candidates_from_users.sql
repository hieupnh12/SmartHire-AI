-- V51: Physically separate external Candidates (candidates) from internal Staff (users)
-- and merge user_profiles into candidates / users.
-- Uses V51 so existing tenants with V50__company_email_settings.sql in flyway_schema_history execute this migration.

-- 1. Create dedicated candidates table (merging candidate profile columns from user_profiles)
CREATE TABLE candidates (
    id            BIGINT PRIMARY KEY AUTO_INCREMENT,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NULL,
    full_name     VARCHAR(255) NOT NULL,
    phone         VARCHAR(32)  NULL,
    avatar_url    VARCHAR(512) NULL,
    headline      VARCHAR(255) NULL,
    bio           TEXT         NULL,
    links_json    JSON         NULL,
    status        VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_candidates_email UNIQUE (email),
    INDEX idx_candidates_status (status)
);

-- 2. Add staff profile columns and role/status index to users
ALTER TABLE users
    ADD COLUMN phone      VARCHAR(32)  NULL AFTER full_name,
    ADD COLUMN avatar_url VARCHAR(512) NULL AFTER phone,
    ADD COLUMN job_title  VARCHAR(128) NULL AFTER avatar_url,
    ADD INDEX idx_users_role_status (role, status);

-- 3. Migrate staff profile fields from user_profiles into users
UPDATE users u
INNER JOIN user_profiles up ON up.user_id = u.id
SET u.phone = up.phone,
    u.avatar_url = up.avatar_url,
    u.job_title = LEFT(up.headline, 128)
WHERE u.role <> 'CANDIDATE';

-- 4. Migrate candidate rows (and any user referenced by candidate FKs) into candidates preserving IDs
INSERT INTO candidates (
    id, email, password_hash, full_name, phone, avatar_url, headline, bio, links_json, status, created_at, updated_at
)
SELECT
    u.id,
    u.email,
    u.password_hash,
    u.full_name,
    up.phone,
    up.avatar_url,
    up.headline,
    up.bio,
    up.links_json,
    u.status,
    u.created_at,
    u.updated_at
FROM users u
LEFT JOIN user_profiles up ON up.user_id = u.id
WHERE u.role = 'CANDIDATE'
   OR EXISTS (SELECT 1 FROM applications a WHERE a.candidate_id = u.id)
   OR EXISTS (SELECT 1 FROM cvs c WHERE c.user_id = u.id)
   OR EXISTS (SELECT 1 FROM submissions s WHERE s.candidate_id = u.id)
   OR EXISTS (SELECT 1 FROM practice_sessions ps WHERE ps.candidate_id = u.id)
   OR EXISTS (SELECT 1 FROM ai_interview_consents aic WHERE aic.candidate_id = u.id);

-- 5. Repoint candidate Foreign Keys from users(id) to candidates(id)
-- Note: MySQL 8.x requires DROP FOREIGN KEY and ADD CONSTRAINT with the same name in separate ALTER TABLE statements.
ALTER TABLE applications DROP FOREIGN KEY fk_app_candidate;
ALTER TABLE applications ADD CONSTRAINT fk_app_candidate FOREIGN KEY (candidate_id) REFERENCES candidates (id);

ALTER TABLE cvs DROP FOREIGN KEY fk_cvs_user;
ALTER TABLE cvs CHANGE COLUMN user_id candidate_id BIGINT NOT NULL;
ALTER TABLE cvs ADD CONSTRAINT fk_cvs_candidate FOREIGN KEY (candidate_id) REFERENCES candidates (id);

ALTER TABLE submissions DROP FOREIGN KEY fk_submissions_candidate;
ALTER TABLE submissions ADD CONSTRAINT fk_submissions_candidate FOREIGN KEY (candidate_id) REFERENCES candidates (id);

ALTER TABLE practice_sessions DROP FOREIGN KEY fk_ps_user;
ALTER TABLE practice_sessions ADD CONSTRAINT fk_ps_candidate FOREIGN KEY (candidate_id) REFERENCES candidates (id);

ALTER TABLE ai_interview_consents DROP FOREIGN KEY fk_ai_consent_candidate;
ALTER TABLE ai_interview_consents ADD CONSTRAINT fk_ai_consent_candidate FOREIGN KEY (candidate_id) REFERENCES candidates (id);

DELETE FROM oauth_accounts
WHERE user_id NOT IN (SELECT id FROM candidates);

ALTER TABLE oauth_accounts DROP FOREIGN KEY fk_oauth_user;
ALTER TABLE oauth_accounts CHANGE COLUMN user_id candidate_id BIGINT NOT NULL;
ALTER TABLE oauth_accounts ADD CONSTRAINT fk_oauth_candidate FOREIGN KEY (candidate_id) REFERENCES candidates (id) ON DELETE CASCADE;

-- 6. Update dual-actor tables (notifications & notification_preferences) to support both users and candidates
ALTER TABLE notifications
    DROP FOREIGN KEY fk_notif_user,
    MODIFY COLUMN user_id BIGINT NULL,
    ADD COLUMN candidate_id BIGINT NULL AFTER user_id;

UPDATE notifications n
INNER JOIN candidates c ON c.id = n.user_id
SET n.candidate_id = n.user_id,
    n.user_id = NULL;

ALTER TABLE notifications
    ADD CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_notif_candidate FOREIGN KEY (candidate_id) REFERENCES candidates (id) ON DELETE CASCADE,
    ADD INDEX idx_notif_candidate (candidate_id, id);

ALTER TABLE notification_preferences
    DROP FOREIGN KEY fk_notification_preference_user,
    MODIFY COLUMN user_id BIGINT NULL,
    ADD COLUMN candidate_id BIGINT NULL AFTER user_id;

UPDATE notification_preferences np
INNER JOIN candidates c ON c.id = np.user_id
SET np.candidate_id = np.user_id,
    np.user_id = NULL;

ALTER TABLE notification_preferences
    ADD CONSTRAINT fk_notification_preference_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_notification_preference_candidate FOREIGN KEY (candidate_id) REFERENCES candidates (id) ON DELETE CASCADE,
    ADD CONSTRAINT uk_notification_preference_candidate_category UNIQUE (candidate_id, category);

-- 7. Drop obsolete user_profiles table and remove migrated candidate rows from users
DROP TABLE user_profiles;

DELETE u FROM users u
WHERE u.role = 'CANDIDATE'
  AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.created_by = u.id)
  AND NOT EXISTS (SELECT 1 FROM job_assignments ja WHERE ja.user_id = u.id OR ja.assigned_by = u.id)
  AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.assignee_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM tests t WHERE t.created_by = u.id)
  AND NOT EXISTS (SELECT 1 FROM interview_participants ip WHERE ip.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM interview_evaluations ie WHERE ie.evaluator_id = u.id);
