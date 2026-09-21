package com.smarthire.multitenancy.datasource;

import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.multitenancy.service.TenantCredentialService;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class TenantDataSourceFactory {
    private static final Logger log = LoggerFactory.getLogger(TenantDataSourceFactory.class);
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
        this.mysqlOptions = mysqlOptions;
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
                .load();
        try {
            flyway.migrate();
        } catch (Exception ex) {
            log.error("Tenant Flyway migrate failed; repairing and retrying", ex);
            try {
                flyway.repair();
                flyway.migrate();
            } catch (Exception retry) {
                log.error("Tenant Flyway retry failed; applying JDBC role schema anyway", retry);
            }
        }
        schemaBootstrap.apply(dataSource);
    }
}
