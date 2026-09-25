CREATE TABLE IF NOT EXISTS job_assignments (
    id               BIGINT PRIMARY KEY AUTO_INCREMENT,
    job_id           BIGINT NOT NULL,
    user_id          BIGINT NOT NULL,
    assignment_role  VARCHAR(32) NOT NULL,
    assigned_by      BIGINT NOT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ja_job FOREIGN KEY (job_id) REFERENCES jobs (id),
    CONSTRAINT fk_ja_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_ja_assigned_by FOREIGN KEY (assigned_by) REFERENCES users (id),
    UNIQUE KEY uk_job_assignments_job_user (job_id, user_id),
    KEY idx_job_assignments_user (user_id)
);

INSERT INTO job_assignments (job_id, user_id, assignment_role, assigned_by, created_at, updated_at)
SELECT j.id,
       j.created_by,
       'PRIMARY_RECRUITER',
       j.created_by,
       COALESCE(j.created_at, CURRENT_TIMESTAMP),
       CURRENT_TIMESTAMP
FROM jobs j
INNER JOIN users u ON u.id = j.created_by
WHERE u.role NOT IN ('TENANT_ADMIN', 'ADMIN', 'CANDIDATE')
  AND j.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM job_assignments a WHERE a.job_id = j.id AND a.user_id = j.created_by
  );
