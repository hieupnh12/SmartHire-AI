package com.smarthire.multitenancy.datasource;

import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.multitenancy.service.TenantCredentialService;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class TenantDataSourceFactory {
    private final TenantCredentialService credentials;
    private final TenantSchemaBootstrap schemaBootstrap;
    private final int poolSize;
    private final String mysqlBaseUrl;
    private final String mysqlOptions;

    public TenantDataSourceFactory(TenantCredentialService credentials,
            TenantSchemaBootstrap schemaBootstrap,
            @Value("${app.tenant.pool-size:5}") int poolSize,
            @Value("${app.tenant.mysql-base-url}") String mysqlBaseUrl,
            @Value("${app.tenant.mysql-options:sslMode=PREFERRED&allowPublicKeyRetrieval=true}") String mysqlOptions) {
        if (poolSize < 1) throw new IllegalArgumentException("Tenant pool size must be positive");
        this.credentials = credentials;
        this.schemaBootstrap = schemaBootstrap;
        this.poolSize = poolSize;
        this.mysqlBaseUrl = mysqlBaseUrl.endsWith("/")
                ? mysqlBaseUrl.substring(0, mysqlBaseUrl.length() - 1)
                : mysqlBaseUrl;
        this.mysqlOptions = unwrapQuotes(mysqlOptions);
    }

    public HikariDataSource create(TenantInfo tenant) {
        HikariConfig config = new HikariConfig();
        config.setDriverClassName("com.mysql.cj.jdbc.Driver");
        config.setJdbcUrl(resolveJdbcUrl(tenant));
        config.setUsername(tenant.getDbUsername());
        config.setPassword(credentials.decrypt(tenant.getCode(), tenant.getDbPassword()));
        config.addDataSourceProperty("connectTimeout", "10000");
        config.addDataSourceProperty("socketTimeout", "120000");
        config.setMaximumPoolSize(poolSize);
        config.setMinimumIdle(0);
        config.setConnectionTimeout(10000);
        config.setValidationTimeout(3000);
        config.setIdleTimeout(300000);
        config.setMaxLifetime(1800000);
        config.setPoolName("tenant-" + tenant.getCode());
        return new HikariDataSource(config);
    }

    String resolveJdbcUrl(TenantInfo tenant) {
        if (!tenant.isManagedDatabase()) return tenant.getDbUrl();
        String url = mysqlBaseUrl + "/" + tenant.getDbName();
        return mysqlOptions == null || mysqlOptions.isBlank() ? url : url + "?" + mysqlOptions;
    }

    public void migrate(HikariDataSource dataSource) {
        Flyway flyway = Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration/tenant")
                .cleanDisabled(true)
                .baselineOnMigrate(false)
                .validateOnMigrate(false)
                // Ignore migrations applied in old DB versions that no longer exist in code
                // (e.g. V21/V22 from a previous schema, superseded by V13-V17 renumbering).
                .ignoreMigrationPatterns("*:ignored", "*:future")
                .load();
        // Never admit a partially migrated tenant or rewrite its history automatically.
        flyway.migrate();
        schemaBootstrap.apply(dataSource);
    }

    /** Spring `file:.env` keeps shell quotes; MySQL rejects them in the JDBC query string. */
    static String unwrapQuotes(String value) {
        if (value == null || value.length() < 2) {
            return value;
        }
        char first = value.charAt(0);
        char last = value.charAt(value.length() - 1);
        if ((first == '\'' && last == '\'') || (first == '"' && last == '"')) {
            return value.substring(1, value.length() - 1);
        }
        return value;
    }
}
