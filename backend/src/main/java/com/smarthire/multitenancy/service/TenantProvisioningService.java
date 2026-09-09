package com.smarthire.multitenancy.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.master.tenant.dto.TenantAdminRequest;
import com.smarthire.multitenancy.datasource.TenantDataSourceFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import javax.sql.DataSource;
import java.sql.*;
import java.nio.charset.StandardCharsets;

@Service
public class TenantProvisioningService {
    private final DataSource master;
    private final TenantInfoRepository tenants;
    private final TenantDataSourceFactory factory;
    private final TenantCredentialService credentials;
    private final PasswordEncoder encoder;
    private final String provisionUrl;
    private final String provisionUser;
    private final String provisionPassword;

    public TenantProvisioningService(@Qualifier("masterDataSource") DataSource master,
            TenantInfoRepository tenants, TenantDataSourceFactory factory, TenantCredentialService credentials,
            PasswordEncoder encoder,
            @Value("${app.tenant.provisioning.url}") String provisionUrl,
            @Value("${app.tenant.provisioning.username}") String provisionUser,
            @Value("${app.tenant.provisioning.password}") String provisionPassword) {
        this.master = master;
        this.tenants = tenants;
        this.factory = factory;
        this.credentials = credentials;
        this.encoder = encoder;
        this.provisionUrl = provisionUrl;
        this.provisionUser = provisionUser;
        this.provisionPassword = provisionPassword;
    }

    public TenantInfo provision(Long id, TenantAdminRequest admin) {
        if (admin.getAdminPassword().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new BusinessException("Admin password must be at most 72 UTF-8 bytes",
                    HttpStatus.BAD_REQUEST, "INVALID_ADMIN_PASSWORD");
        }
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
                    try (var pool = factory.create(tenant)) {
                        factory.migrate(pool);
                        seedAdmin(pool, admin);
                    }
                    tenant.setStatus("ACTIVE");
                    return tenants.saveAndFlush(tenant);
                } catch (Exception ex) {
                    tenant.setStatus("FAILED");
                    tenants.saveAndFlush(tenant);
                    // Keep partially created resources for idempotent retry; never drop customer data.
                    throw new BusinessException("Tenant provisioning failed; correct the configuration and retry",
                            HttpStatus.SERVICE_UNAVAILABLE, "TENANT_PROVISIONING_FAILED");
                }
            } finally {
                try (PreparedStatement stmt = lock.prepareStatement("SELECT pg_advisory_unlock(?)")) {
                    stmt.setLong(1, id);
                    stmt.execute();
                }
            }
        } catch (SQLException ex) {
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
        try (Connection connection = DriverManager.getConnection(provisionUrl, properties);
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("CREATE DATABASE IF NOT EXISTS `" + database
                    + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            statement.executeUpdate("CREATE USER IF NOT EXISTS '" + username + "'@'%' IDENTIFIED BY '" + password + "'");
            // Escape underscore wildcards in database-level grants.
            String grantDatabase = database.replace("_", "\\_");
            statement.executeUpdate("GRANT ALL PRIVILEGES ON `" + grantDatabase + "`.* TO '" + username + "'@'%'");
        }
    }

    private void seedAdmin(DataSource dataSource, TenantAdminRequest admin) throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                try (PreparedStatement query = connection.prepareStatement(
                        "SELECT role FROM users WHERE email = ?")) {
                    query.setString(1, admin.getAdminEmail());
                    try (ResultSet rs = query.executeQuery()) {
                        if (rs.next()) {
                            if (!"TENANT_ADMIN".equals(rs.getString(1))) throw new SQLException("Admin role conflict");
                            connection.commit();
                            return;
                        }
                    }
                }
                try (PreparedStatement insert = connection.prepareStatement(
                        "INSERT INTO users (email, password_hash, full_name, role, status) VALUES (?, ?, ?, 'TENANT_ADMIN', 'ACTIVE')")) {
                    insert.setString(1, admin.getAdminEmail());
                    insert.setString(2, encoder.encode(admin.getAdminPassword()));
                    insert.setString(3, admin.getAdminName());
                    insert.executeUpdate();
                }
                connection.commit();
            } catch (Exception ex) {
                connection.rollback();
                throw ex;
            }
        }
    }
}
