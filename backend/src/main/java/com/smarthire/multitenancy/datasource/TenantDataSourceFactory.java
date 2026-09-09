package com.smarthire.multitenancy.datasource;

import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.multitenancy.service.TenantCredentialService;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.flywaydb.core.Flyway;

@Component
public class TenantDataSourceFactory {
    private final TenantCredentialService credentials;
    private final int poolSize;

    public TenantDataSourceFactory(TenantCredentialService credentials,
            @Value("${app.tenant.pool-size:5}") int poolSize) {
        if (poolSize < 1) throw new IllegalArgumentException("Tenant pool size must be positive");
        this.credentials = credentials;
        this.poolSize = poolSize;
    }

    public HikariDataSource create(TenantInfo tenant) {
        HikariConfig config = new HikariConfig();
        config.setDriverClassName("com.mysql.cj.jdbc.Driver");
        config.setJdbcUrl(tenant.getDbUrl());
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

    public void migrate(HikariDataSource dataSource) {
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration/tenant")
                .cleanDisabled(true).baselineOnMigrate(false).load().migrate();
    }
}
