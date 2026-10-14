package com.smarthire.multitenancy.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.master.tenant.dto.TenantAdminRequest;
import com.smarthire.multitenancy.datasource.TenantDataSourceFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

@Service
public class TenantProvisioningService {
    public record ProvisionResult(TenantInfo tenant, String activationToken) {}

    private final DataSource master;
    private final TenantInfoRepository tenants;
    private final TenantDataSourceFactory factory;
    private final TenantCredentialService credentials;
    private final String provisionUrl;
    private final String provisionUser;
    private final String provisionPassword;
    private final long inviteExpireHours;

    public TenantProvisioningService(@Qualifier("masterDataSource") DataSource master,
            TenantInfoRepository tenants, TenantDataSourceFactory factory, TenantCredentialService credentials,
            @Value("${app.tenant.provisioning.url}") String provisionUrl,
            @Value("${app.tenant.provisioning.username}") String provisionUser,
            @Value("${app.tenant.provisioning.password}") String provisionPassword,
            @Value("${smarthire.invite.expire-hours:72}") long inviteExpireHours) {
        this.master = master;
        this.tenants = tenants;
        this.factory = factory;
        this.credentials = credentials;
        this.provisionUrl = provisionUrl;
        this.provisionUser = provisionUser;
        this.provisionPassword = provisionPassword;
        this.inviteExpireHours = inviteExpireHours;
    }

    public TenantInfo provision(Long id, TenantAdminRequest admin) {
        return provisionWithInvitation(id, admin).tenant();
    }

    public ProvisionResult provisionWithInvitation(Long id, TenantAdminRequest admin) {
        // A session advisory lock survives individual registry commits and releases on process failure.
        try (Connection lock = master.getConnection()) {
            try (PreparedStatement stmt = lock.prepareStatement("SELECT pg_try_advisory_lock(?)")) {
                stmt.setLong(1, id);
                try (ResultSet rs = stmt.executeQuery()) {
                    rs.next();
                    if (!rs.getBoolean(1)) throw new BusinessException("Tenant provisioning is already running",
                            HttpStatus.CONFLICT, "PROVISIONING_IN_PROGRESS");
                }
            }
            try {
                TenantInfo tenant = tenants.findById(id).orElseThrow(() ->
                        new BusinessException("Tenant not found", HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND"));
                if (!"FAILED".equals(tenant.getStatus()) && !"PROVISIONING".equals(tenant.getStatus())) {
                    throw new BusinessException("Only incomplete tenants can be provisioned",
                            HttpStatus.CONFLICT, "INVALID_TENANT_STATE");
                }
                tenant.setStatus("PROVISIONING");
                tenants.saveAndFlush(tenant);
                try {
                    if (tenant.isManagedDatabase()) createDatabaseAndUser(tenant);
                    String activationToken;
                    try (var pool = factory.create(tenant)) {
                        factory.migrate(pool);
                        activationToken = seedAdminInvitation(pool, admin);
                    }
                    tenant.setStatus("ACTIVE");
                    TenantInfo saved = tenants.saveAndFlush(tenant);
                    return new ProvisionResult(saved, activationToken);
                } catch (Exception ex) {
                    ex.printStackTrace(); // Log the actual provisioning exception!
                    tenant.setStatus("FAILED");
                    tenants.saveAndFlush(tenant);
                    // Keep partially created resources for idempotent retry; never drop customer data.
                    throw new BusinessException("Tenant provisioning failed: " + ex.getMessage(),
                            HttpStatus.SERVICE_UNAVAILABLE, "TENANT_PROVISIONING_FAILED");
                }
            } finally {
                try (PreparedStatement stmt = lock.prepareStatement("SELECT pg_advisory_unlock(?)")) {
                    stmt.setLong(1, id);
                    stmt.execute();
                }
            }
        } catch (SQLException ex) {
            ex.printStackTrace();
            throw new BusinessException("Provisioning registry is unavailable",
                    HttpStatus.SERVICE_UNAVAILABLE, "PROVISIONING_REGISTRY_UNAVAILABLE");
        }
    }

    private void createDatabaseAndUser(TenantInfo tenant) throws SQLException {
        String database = tenant.getDbName();
        String username = tenant.getDbUsername();
        String password = credentials.decrypt(tenant.getCode(), tenant.getDbPassword());
        if (!database.matches("[a-z0-9_]{1,64}") || !username.matches("[a-z0-9_]{1,32}")
                || !password.matches("[A-Za-z0-9_-]{32,}")) {
            throw new IllegalArgumentException("Invalid managed database credentials");
        }
        // Identifiers and generated secrets are restricted above; no request text enters DDL.
        var properties = new java.util.Properties();
        properties.setProperty("user", provisionUser);
        properties.setProperty("password", provisionPassword);
        properties.setProperty("connectTimeout", "10000");
        properties.setProperty("socketTimeout", "120000");
        try (Connection connection = DriverManager.getConnection(serverJdbcUrl(provisionUrl), properties);
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("CREATE DATABASE IF NOT EXISTS `" + database
                    + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            statement.executeUpdate("CREATE USER IF NOT EXISTS '" + username + "'@'%' IDENTIFIED BY '" + password + "'");
            // Escape underscore wildcards in database-level grants.
            String grantDatabase = database.replace("_", "\\_");
            statement.executeUpdate("GRANT ALL PRIVILEGES ON `" + grantDatabase + "`.* TO '" + username + "'@'%'");
        }
    }

    public void deleteDatabaseAndUser(TenantInfo tenant) throws SQLException {
        if (!tenant.isManagedDatabase()) return;
        String database = tenant.getDbName();
        String username = tenant.getDbUsername();
        var properties = new java.util.Properties();
        properties.setProperty("user", provisionUser);
        properties.setProperty("password", provisionPassword);
        properties.setProperty("connectTimeout", "10000");
        properties.setProperty("socketTimeout", "120000");
        try (Connection connection = DriverManager.getConnection(serverJdbcUrl(provisionUrl), properties);
             Statement statement = connection.createStatement()) {
            if (database != null && database.matches("[a-z0-9_]{1,64}")) {
                statement.executeUpdate("DROP DATABASE IF EXISTS `" + database + "`");
            }
            if (username != null && username.matches("[a-z0-9_]{1,32}")) {
                statement.executeUpdate("DROP USER IF EXISTS '" + username + "'@'%'");
            }
        }
    }

    String seedAdminInvitation(DataSource dataSource, TenantAdminRequest admin) throws SQLException {
        String email = admin.getAdminEmail().trim().toLowerCase(Locale.ROOT);
        String fullName = admin.getAdminName().trim();
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                try (PreparedStatement query = connection.prepareStatement(
                        "SELECT role FROM users WHERE LOWER(email) = ?")) {
                    query.setString(1, email);
                    try (ResultSet rs = query.executeQuery()) {
                        if (rs.next()) {
                            if (!"TENANT_ADMIN".equals(rs.getString(1))) throw new SQLException("Admin role conflict");
                            connection.commit();
                            return null;
                        }
                    }
                }

                String rawToken = UUID.randomUUID().toString();
                String tokenHash = sha256(rawToken);
                Timestamp expiresAt = Timestamp.from(Instant.now().plus(inviteExpireHours, ChronoUnit.HOURS));

                Long existingInviteId = null;
                try (PreparedStatement findPending = connection.prepareStatement(
                        "SELECT id FROM member_invitations WHERE LOWER(email) = ? AND status = 'PENDING'")) {
                    findPending.setString(1, email);
                    try (ResultSet rs = findPending.executeQuery()) {
                        if (rs.next()) {
                            existingInviteId = rs.getLong(1);
                        }
                    }
                }

                if (existingInviteId != null) {
                    try (PreparedStatement update = connection.prepareStatement(
                            "UPDATE member_invitations SET full_name = ?, role = 'TENANT_ADMIN', token_hash = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")) {
                        update.setString(1, fullName);
                        update.setString(2, tokenHash);
                        update.setTimestamp(3, expiresAt);
                        update.setLong(4, existingInviteId);
                        update.executeUpdate();
                    }
                } else {
                    try (PreparedStatement insert = connection.prepareStatement(
                            "INSERT INTO member_invitations (email, full_name, role, token_hash, status, expires_at) VALUES (?, ?, 'TENANT_ADMIN', ?, 'PENDING', ?)")) {
                        insert.setString(1, email);
                        insert.setString(2, fullName);
                        insert.setString(3, tokenHash);
                        insert.setTimestamp(4, expiresAt);
                        insert.executeUpdate();
                    }
                }

                connection.commit();
                return rawToken;
            } catch (Exception ex) {
                connection.rollback();
                throw ex;
            }
        }
    }

    static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is required", ex);
        }
    }

    static String serverJdbcUrl(String jdbcUrl) {
        final String prefix = "jdbc:mysql://";
        if (jdbcUrl == null || !jdbcUrl.startsWith(prefix)) {
            throw new IllegalArgumentException("Provisioning URL must be a MySQL JDBC URL");
        }

        int queryStart = jdbcUrl.indexOf('?', prefix.length());
        String authorityAndPath = queryStart < 0 ? jdbcUrl : jdbcUrl.substring(0, queryStart);
        String query = queryStart < 0 ? "" : jdbcUrl.substring(queryStart);
        int pathStart = authorityAndPath.indexOf('/', prefix.length());
        String authority = pathStart < 0
                ? authorityAndPath.substring(prefix.length())
                : authorityAndPath.substring(prefix.length(), pathStart);
        if (authority.isBlank()) {
            throw new IllegalArgumentException("Provisioning URL must include a MySQL server");
        }
        return prefix + authority + "/" + query;
    }
}
