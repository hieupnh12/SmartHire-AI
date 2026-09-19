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

    private static final String[] FEATURES = {
            "DASHBOARD", "JOBS", "APPLICANTS", "CV_SCREENING", "RANKING", "PIPELINE",
            "ANALYTICS", "ASSESSMENTS", "INTERVIEWS", "SCHEDULES", "NOTIFICATIONS"
    };

    public void apply(DataSource dataSource) {
        try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
            statement.execute(CREATE_ROLES);
            statement.execute(SEED_ROLES);
            statement.execute(CREATE_PERMISSIONS);
            widenRoleColumn(statement, "users", "role");
            widenRoleColumn(statement, "member_invitations", "role");
            widenRoleColumn(statement, "role_permissions", "role");
            seedDefaultFeatures(statement);
        } catch (SQLException ex) {
            log.error("Failed to ensure tenant role tables", ex);
            throw new IllegalStateException("Failed to ensure tenant role tables", ex);
        }
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
