package com.smarthire.multitenancy.service;

import com.smarthire.multitenancy.datasource.DynamicMultiTenantConnectionProvider;
import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

@Service
public class TenantProvisioningService {

    private static final Logger log = LoggerFactory.getLogger(TenantProvisioningService.class);

    private final DynamicMultiTenantConnectionProvider connectionProvider;
    private final DataSourceProperties dataSourceProperties;

    public TenantProvisioningService(DynamicMultiTenantConnectionProvider connectionProvider,
                                     DataSourceProperties dataSourceProperties) {
        this.connectionProvider = connectionProvider;
        this.dataSourceProperties = dataSourceProperties;
    }

    public void initAndMigrateTenantDb(String tenantId, String dbName, String customUrl, String username, String password) {
        String baseUrl = dataSourceProperties.getUrl();
        String dbUrl;
        if (customUrl != null && !customUrl.isBlank()) {
            dbUrl = customUrl;
        } else if (baseUrl.contains("smarthire_master")) {
            dbUrl = baseUrl.replace("smarthire_master", dbName);
        } else {
            dbUrl = baseUrl.replace("smarthire", dbName);
        }
        String dbUser = (username != null && !username.isBlank()) ? username : dataSourceProperties.getUsername();
        String dbPass = (password != null && !password.isBlank()) ? password : dataSourceProperties.getPassword();

        log.info("Provisioning & running Flyway for Tenant: {} [DB: {}]", tenantId, dbName);

        DataSource tenantDataSource = DataSourceBuilder.create()
                .driverClassName(dataSourceProperties.getDriverClassName())
                .url(dbUrl)
                .username(dbUser)
                .password(dbPass)
                .build();

        Flyway flyway = Flyway.configure()
                .dataSource(tenantDataSource)
                .locations("classpath:db/migration/tenant")
                .baselineOnMigrate(true)
                .load();

        flyway.migrate();

        // Seed default TENANT_ADMIN user (admin@<tenantId>.com / Password123!)
        try (Connection conn = tenantDataSource.getConnection();
             PreparedStatement checkStmt = conn.prepareStatement("SELECT COUNT(*) FROM users WHERE email = ?")) {
            String adminEmail = "admin@" + tenantId.toLowerCase() + ".com";
            checkStmt.setString(1, adminEmail);
            try (ResultSet rs = checkStmt.executeQuery()) {
                if (rs.next() && rs.getInt(1) == 0) {
                    BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
                    String hash = encoder.encode("Password123!");
                    try (PreparedStatement insertStmt = conn.prepareStatement(
                            "INSERT INTO users (email, password_hash, full_name, role, status) VALUES (?, ?, ?, ?, ?)")) {
                        insertStmt.setString(1, adminEmail);
                        insertStmt.setString(2, hash);
                        insertStmt.setString(3, tenantId.toUpperCase() + " Primary Admin");
                        insertStmt.setString(4, "TENANT_ADMIN");
                        insertStmt.setString(5, "ACTIVE");
                        insertStmt.executeUpdate();
                        log.info("Successfully seeded primary TENANT_ADMIN user: {} for tenant {}", adminEmail, tenantId);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error seeding primary admin user for tenant {}: {}", tenantId, e.getMessage(), e);
        }

        connectionProvider.addTenantDataSource(tenantId, tenantDataSource);
        log.info("Successfully provisioned Tenant: {}", tenantId);
    }
}
