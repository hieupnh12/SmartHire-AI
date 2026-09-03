package com.smarthire.multitenancy.datasource;

import org.flywaydb.core.Flyway;
import org.hibernate.engine.jdbc.connections.spi.MultiTenantConnectionProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class DynamicMultiTenantConnectionProvider implements MultiTenantConnectionProvider<String> {

    private static final Logger log = LoggerFactory.getLogger(DynamicMultiTenantConnectionProvider.class);

    private final DataSource masterDataSource;
    private final DataSourceProperties dataSourceProperties;
    private final Map<String, DataSource> tenantDataSources = new ConcurrentHashMap<>();

    public DynamicMultiTenantConnectionProvider(@Qualifier("dataSource") DataSource masterDataSource,
                                                 DataSourceProperties dataSourceProperties) {
        this.masterDataSource = masterDataSource;
        this.dataSourceProperties = dataSourceProperties;
    }

    public void addTenantDataSource(String tenantId, DataSource dataSource) {
        tenantDataSources.put(tenantId, dataSource);
    }

    public DataSource getTenantDataSource(String tenantId) {
        return tenantDataSources.get(tenantId);
    }

    @Override
    public Connection getAnyConnection() throws SQLException {
        return masterDataSource.getConnection();
    }

    @Override
    public void releaseAnyConnection(Connection connection) throws SQLException {
        if (connection != null && !connection.isClosed()) {
            connection.close();
        }
    }

    @Override
    public Connection getConnection(String tenantIdentifier) throws SQLException {
        DataSource ds = selectDataSource(tenantIdentifier);
        return ds.getConnection();
    }

    @Override
    public void releaseConnection(String tenantIdentifier, Connection connection) throws SQLException {
        if (connection != null && !connection.isClosed()) {
            connection.close();
        }
    }

    @Override
    public boolean supportsAggressiveRelease() {
        return false;
    }

    @Override
    public boolean isUnwrappableAs(Class<?> unwrapType) {
        return false;
    }

    @Override
    public <T> T unwrap(Class<T> unwrapType) {
        return null;
    }

    private synchronized DataSource selectDataSource(String tenantIdentifier) {
        if (tenantIdentifier == null || "smarthire_master".equalsIgnoreCase(tenantIdentifier)) {
            return masterDataSource;
        }

        if (tenantDataSources.containsKey(tenantIdentifier)) {
            return tenantDataSources.get(tenantIdentifier);
        }

        // Lazy initialize tenant database on demand
        log.info("Lazy initializing tenant DB for tenantIdentifier: {}", tenantIdentifier);
        try {
            String dbName = "smarthire_tenant_" + tenantIdentifier.toLowerCase();
            String baseUrl = dataSourceProperties.getUrl();
            String dbUrl;
            if (baseUrl.contains("smarthire_master")) {
                dbUrl = baseUrl.replace("smarthire_master", dbName);
            } else {
                dbUrl = baseUrl.replace("smarthire", dbName);
            }

            DataSource tenantDs = DataSourceBuilder.create()
                    .driverClassName(dataSourceProperties.getDriverClassName())
                    .url(dbUrl)
                    .username(dataSourceProperties.getUsername())
                    .password(dataSourceProperties.getPassword())
                    .build();

            Flyway flyway = Flyway.configure()
                    .dataSource(tenantDs)
                    .locations("classpath:db/migration/tenant")
                    .baselineOnMigrate(true)
                    .load();

            flyway.migrate();

            // Seed primary admin user if missing
            try (Connection conn = tenantDs.getConnection();
                 PreparedStatement checkStmt = conn.prepareStatement("SELECT COUNT(*) FROM users WHERE email = ?")) {
                String adminEmail = "admin@" + tenantIdentifier.toLowerCase() + ".com";
                checkStmt.setString(1, adminEmail);
                try (ResultSet rs = checkStmt.executeQuery()) {
                    if (rs.next() && rs.getInt(1) == 0) {
                        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
                        String hash = encoder.encode("Password123!");
                        try (PreparedStatement insertStmt = conn.prepareStatement(
                                "INSERT INTO users (email, password_hash, full_name, role, status) VALUES (?, ?, ?, ?, ?)")) {
                            insertStmt.setString(1, adminEmail);
                            insertStmt.setString(2, hash);
                            insertStmt.setString(3, tenantIdentifier.toUpperCase() + " Primary Admin");
                            insertStmt.setString(4, "TENANT_ADMIN");
                            insertStmt.setString(5, "ACTIVE");
                            insertStmt.executeUpdate();
                            log.info("Lazy seeded primary TENANT_ADMIN user: {}", adminEmail);
                        }
                    }
                }
            }

            tenantDataSources.put(tenantIdentifier, tenantDs);
            return tenantDs;
        } catch (Exception e) {
            log.error("Failed lazy initialization for tenant {}: {}", tenantIdentifier, e.getMessage(), e);
            return masterDataSource;
        }
    }
}
