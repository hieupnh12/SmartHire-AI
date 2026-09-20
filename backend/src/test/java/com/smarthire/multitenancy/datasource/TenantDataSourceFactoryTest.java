package com.smarthire.multitenancy.datasource;

import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.multitenancy.service.TenantCredentialService;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class TenantDataSourceFactoryTest {

    @Test
    void managedTenantUsesEnvironmentBaseUrlAndStoredDatabaseName() {
        var factory = new TenantDataSourceFactory(mock(TenantCredentialService.class),
                mock(TenantSchemaBootstrap.class), 5,
                "jdbc:mysql://mysql:3306/", "sslMode=PREFERRED&allowPublicKeyRetrieval=true");
        var tenant = new TenantInfo();
        tenant.setManagedDatabase(true);
        tenant.setDbName("smarthire_tenant_ttqt");
        tenant.setDbUrl("jdbc:mysql://42.96.2.6:3306/smarthire_tenant_ttqt");

        assertThat(factory.resolveJdbcUrl(tenant)).isEqualTo(
                "jdbc:mysql://mysql:3306/smarthire_tenant_ttqt?sslMode=PREFERRED&allowPublicKeyRetrieval=true");
    }

    @Test
    void customTenantKeepsItsStoredDatabaseUrl() {
        var factory = new TenantDataSourceFactory(mock(TenantCredentialService.class),
                mock(TenantSchemaBootstrap.class), 5,
                "jdbc:mysql://mysql:3306", "sslMode=PREFERRED");
        var tenant = new TenantInfo();
        tenant.setManagedDatabase(false);
        tenant.setDbName("customer_database");
        tenant.setDbUrl("jdbc:mysql://customer-db.example:3306/customer_database?sslMode=REQUIRED");

        assertThat(factory.resolveJdbcUrl(tenant)).isEqualTo(
                "jdbc:mysql://customer-db.example:3306/customer_database?sslMode=REQUIRED");
    }
}
