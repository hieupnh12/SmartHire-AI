package com.smarthire.multitenancy.datasource;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Idempotent JDBC bootstrap for role tables. Runs on the tenant pool after Flyway,
 * outside Hibernate transactions (MySQL DDL would otherwise commit the JPA tx).
 */
@Component
public class TenantSchemaBootstrap {
    private static final Logger log = LoggerFactory.getLogger(TenantSchemaBootstrap.class);

    private static final String CREATE_ROLES = """
            CREATE TABLE IF NOT EXISTS roles (
                id         BIGINT PRIMARY KEY AUTO_INCREMENT,
                code       VARCHAR(64)  NOT NULL,
                name       VARCHAR(128) NOT NULL,
                workspace  VARCHAR(32)  NOT NULL,
                is_system  TINYINT(1)   NOT NULL DEFAULT 0,
                created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uk_roles_code (code)
            )
            """;

    private static final String SEED_ROLES = """
            INSERT IGNORE INTO roles (code, name, workspace, is_system)
            VALUES
                ('TENANT_ADMIN', 'Tenant Admin', 'ADMIN', 1),
                ('ADMIN', 'Admin', 'ADMIN', 1),
                ('HR', 'HR', 'RECRUITER', 1),
                ('RECRUITER', 'Recruiter', 'RECRUITER', 1),
                ('CANDIDATE', 'Candidate', 'CANDIDATE', 1)
            """;

    private static final String CREATE_PERMISSIONS = """
            CREATE TABLE IF NOT EXISTS role_permissions (
                id           BIGINT PRIMARY KEY AUTO_INCREMENT,
                `role`       VARCHAR(64)  NOT NULL,
                feature_code VARCHAR(64)  NOT NULL,
                created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uk_role_permissions_role_feature (`role`, feature_code)
            )
            """;

    private static final String CREATE_JOB_ASSIGNMENTS = """
            CREATE TABLE IF NOT EXISTS job_assignments (
                id               BIGINT PRIMARY KEY AUTO_INCREMENT,
                job_id           BIGINT NOT NULL,
                user_id          BIGINT NOT NULL,
                assignment_role  VARCHAR(32) NOT NULL,
                can_view         BOOLEAN NOT NULL DEFAULT TRUE,
                can_edit         BOOLEAN NOT NULL DEFAULT FALSE,
                assigned_by      BIGINT NOT NULL,
                created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_ja_job FOREIGN KEY (job_id) REFERENCES jobs (id),
                CONSTRAINT fk_ja_user FOREIGN KEY (user_id) REFERENCES users (id),
                CONSTRAINT fk_ja_assigned_by FOREIGN KEY (assigned_by) REFERENCES users (id),
                UNIQUE KEY uk_job_assignments_job_user (job_id, user_id),
                KEY idx_job_assignments_user (user_id)
            )
            """;

    private static final String BACKFILL_JOB_ASSIGNMENTS = """
            INSERT INTO job_assignments (job_id, user_id, assignment_role, assigned_by, created_at, updated_at)
            SELECT j.id, j.created_by, 'PRIMARY_RECRUITER', j.created_by,
                   COALESCE(j.created_at, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP
            FROM jobs j
            INNER JOIN users u ON u.id = j.created_by
            WHERE u.role NOT IN ('TENANT_ADMIN', 'ADMIN', 'CANDIDATE')
              AND j.deleted_at IS NULL
              AND NOT EXISTS (
                  SELECT 1 FROM job_assignments a WHERE a.job_id = j.id AND a.user_id = j.created_by
              )
            """;

    private static final String[] FEATURES = {
            "DASHBOARD", "JOBS", "APPLICANTS", "CV_SCREENING", "RANKING", "PIPELINE",
            "ANALYTICS", "ASSESSMENTS", "AI_INTERVIEWS", "INTERVIEWS", "SCHEDULES", "NOTIFICATIONS"
    };

    private static final String CREATE_LANDING_PAGE_SETTINGS = """
            CREATE TABLE IF NOT EXISTS landing_page_settings (
                id         BIGINT PRIMARY KEY AUTO_INCREMENT,
                config_json JSON NOT NULL,
                is_published BOOLEAN NOT NULL DEFAULT TRUE,
                published_at TIMESTAMP NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
            """;

    private static final String BACKFILL_STAGE_CODES = """
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
            WHERE rs.stage_code IS NULL
            """;

    public void apply(DataSource dataSource) {
        try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
            statement.execute(CREATE_ROLES);
            statement.execute(SEED_ROLES);
            statement.execute(CREATE_PERMISSIONS);
            statement.execute(CREATE_LANDING_PAGE_SETTINGS);
            statement.execute(CREATE_JOB_ASSIGNMENTS);
            backfillJobAssignments(statement);
            widenRoleColumn(statement, "users", "role");
            widenRoleColumn(statement, "member_invitations", "role");
            widenRoleColumn(statement, "role_permissions", "role");
            seedDefaultFeatures(statement);
            ensureRecruitmentStageCatalog(statement);
            ensureCvApplicationCopy(statement);
            ensureJobAssignmentPermissions(statement);
        } catch (SQLException ex) {
            log.error("Failed to ensure tenant role tables", ex);
            throw new IllegalStateException("Failed to ensure tenant role tables", ex);
        }
    }

    /** Mirrors V37 for tenants whose Flyway history skipped it. */
    private static void ensureJobAssignmentPermissions(Statement statement) throws SQLException {
        if (!tableExists(statement, "job_assignments")) {
            return;
        }
        if (!columnExists(statement, "job_assignments", "can_view")) {
            statement.execute("ALTER TABLE job_assignments ADD COLUMN can_view BOOLEAN NOT NULL DEFAULT TRUE AFTER assignment_role");
        }
        if (!columnExists(statement, "job_assignments", "can_edit")) {
            statement.execute("ALTER TABLE job_assignments ADD COLUMN can_edit BOOLEAN NOT NULL DEFAULT FALSE AFTER can_view");
        }
        statement.execute("UPDATE job_assignments SET can_view = TRUE, can_edit = TRUE WHERE assignment_role IN ('OWNER', 'COLLABORATOR', 'PRIMARY_RECRUITER', 'CO_RECRUITER')");
        statement.execute("UPDATE job_assignments SET can_view = TRUE, can_edit = FALSE WHERE assignment_role IN ('VIEWER', 'HIRING_MANAGER')");
    }

    private static void widenRoleColumn(Statement statement, String table, String column) throws SQLException {
        if (!tableExists(statement, table)) {
            return;
        }
        Integer length = columnLength(statement, table, column);
        if (length != null && length >= 64) {
            return;
        }
        statement.execute("ALTER TABLE `" + table + "` MODIFY COLUMN `" + column + "` VARCHAR(64) NOT NULL");
    }

    /** Mirrors V36 for tenants whose Flyway history skipped it (ignored/future versions). */
    private static void ensureRecruitmentStageCatalog(Statement statement) throws SQLException {
        if (!tableExists(statement, "recruitment_stages")) {
            return;
        }
        if (!columnExists(statement, "recruitment_stages", "stage_code")) {
            statement.execute("ALTER TABLE recruitment_stages ADD COLUMN stage_code VARCHAR(32) NULL AFTER job_id");
            statement.execute(BACKFILL_STAGE_CODES);
        }
        if (!columnExists(statement, "recruitment_stages", "active")) {
            statement.execute(
                    "ALTER TABLE recruitment_stages ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1 AFTER is_terminal");
        }
        if (columnNullable(statement, "recruitment_stages", "stage_code")) {
            statement.execute(
                    "UPDATE recruitment_stages SET stage_code = CONCAT('LEGACY_', id) WHERE stage_code IS NULL");
            statement.execute("ALTER TABLE recruitment_stages MODIFY COLUMN stage_code VARCHAR(32) NOT NULL");
        }
        if (!indexExists(statement, "recruitment_stages", "uk_recruitment_stages_job_code")) {
            statement.execute(
                    "ALTER TABLE recruitment_stages ADD UNIQUE KEY uk_recruitment_stages_job_code (job_id, stage_code)");
        }
    }

    /** Mirrors V34 for tenants whose Flyway history skipped it. */
    private static void ensureCvApplicationCopy(Statement statement) throws SQLException {
        if (!tableExists(statement, "cvs") || columnExists(statement, "cvs", "is_application_copy")) {
            return;
        }
        statement.execute(
                "ALTER TABLE cvs ADD COLUMN is_application_copy TINYINT(1) NOT NULL DEFAULT 0 AFTER application_id");
    }

    private static void backfillJobAssignments(Statement statement) throws SQLException {
        if (!tableExists(statement, "jobs") || !tableExists(statement, "users")) {
            return;
        }
        statement.execute(BACKFILL_JOB_ASSIGNMENTS);
    }

    private static void seedDefaultFeatures(Statement statement) throws SQLException {
        try (ResultSet rs = statement.executeQuery("SELECT COUNT(*) FROM role_permissions")) {
            if (!rs.next() || rs.getLong(1) > 0) {
                return;
            }
        }
        for (String role : new String[] {"HR", "RECRUITER"}) {
            for (String feature : FEATURES) {
                statement.execute(
                        "INSERT IGNORE INTO role_permissions (`role`, feature_code) VALUES ('"
                                + role + "', '" + feature + "')");
            }
        }
    }

    private static boolean tableExists(Statement statement, String table) throws SQLException {
        try (ResultSet rs = statement.executeQuery(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '"
                        + table + "'")) {
            return rs.next() && rs.getLong(1) > 0;
        }
    }

    private static boolean columnExists(Statement statement, String table, String column) throws SQLException {
        try (ResultSet rs = statement.executeQuery(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE()"
                        + " AND table_name = '" + table + "' AND column_name = '" + column + "'")) {
            return rs.next() && rs.getLong(1) > 0;
        }
    }

    private static boolean columnNullable(Statement statement, String table, String column) throws SQLException {
        try (ResultSet rs = statement.executeQuery(
                "SELECT IS_NULLABLE FROM information_schema.columns WHERE table_schema = DATABASE()"
                        + " AND table_name = '" + table + "' AND column_name = '" + column + "'")) {
            return rs.next() && "YES".equalsIgnoreCase(rs.getString(1));
        }
    }

    private static boolean indexExists(Statement statement, String table, String index) throws SQLException {
        try (ResultSet rs = statement.executeQuery(
                "SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE()"
                        + " AND table_name = '" + table + "' AND index_name = '" + index + "'")) {
            return rs.next() && rs.getLong(1) > 0;
        }
    }

    private static Integer columnLength(Statement statement, String table, String column) throws SQLException {
        try (ResultSet rs = statement.executeQuery(
                "SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.columns WHERE table_schema = DATABASE()"
                        + " AND table_name = '" + table + "' AND column_name = '" + column + "'")) {
            if (!rs.next()) {
                return null;
            }
            long value = rs.getLong(1);
            return rs.wasNull() ? null : (int) value;
        }
    }
}
