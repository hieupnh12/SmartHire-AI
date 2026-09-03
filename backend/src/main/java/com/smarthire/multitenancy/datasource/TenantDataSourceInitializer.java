package com.smarthire.multitenancy.datasource;

import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.List;

@Component
public class TenantDataSourceInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(TenantDataSourceInitializer.class);

    private final TenantInfoRepository tenantInfoRepository;
    private final DynamicMultiTenantConnectionProvider connectionProvider;
    private final DataSourceProperties dataSourceProperties;

    public TenantDataSourceInitializer(TenantInfoRepository tenantInfoRepository,
                                       DynamicMultiTenantConnectionProvider connectionProvider,
                                       DataSourceProperties dataSourceProperties) {
        this.tenantInfoRepository = tenantInfoRepository;
        this.connectionProvider = connectionProvider;
        this.dataSourceProperties = dataSourceProperties;
    }

    @Override
    public void run(ApplicationArguments args) {
        log.info("Initializing active Tenant DataSources from Master DB...");
        try {
            List<TenantInfo> activeTenants = tenantInfoRepository.findAll().stream()
                    .filter(t -> "ACTIVE".equalsIgnoreCase(t.getStatus()))
                    .toList();

            for (TenantInfo tenant : activeTenants) {
                try {
                    String baseUrl = dataSourceProperties.getUrl();
                    String dbUrl;
                    if (tenant.getDbUrl() != null && !tenant.getDbUrl().isBlank()) {
                        dbUrl = tenant.getDbUrl();
                    } else if (baseUrl.contains("smarthire_master")) {
                        dbUrl = baseUrl.replace("smarthire_master", tenant.getDbName());
                    } else {
                        dbUrl = baseUrl.replace("smarthire", tenant.getDbName());
                    }

                    String user = (tenant.getDbUsername() != null && !tenant.getDbUsername().isBlank())
                            ? tenant.getDbUsername()
                            : dataSourceProperties.getUsername();

                    String pass = (tenant.getDbPassword() != null && !tenant.getDbPassword().isBlank())
                            ? tenant.getDbPassword()
                            : dataSourceProperties.getPassword();

                    DataSource tenantDataSource = DataSourceBuilder.create()
                            .driverClassName(dataSourceProperties.getDriverClassName())
                            .url(dbUrl)
                            .username(user)
                            .password(pass)
                            .build();

                    connectionProvider.addTenantDataSource(tenant.getCode(), tenantDataSource);
                    log.info("Loaded Tenant DataSource for tenant code: {} [DB: {}]", tenant.getCode(), tenant.getDbName());
                } catch (Exception e) {
                    log.error("Failed to initialize DataSource for tenant: {}", tenant.getCode(), e);
                }
            }
            log.info("Successfully loaded {} active Tenant DataSources.", activeTenants.size());
        } catch (Exception e) {
            log.warn("Master DB tenants table not found or empty on initial boot: {}", e.getMessage());
        }
    }
}
