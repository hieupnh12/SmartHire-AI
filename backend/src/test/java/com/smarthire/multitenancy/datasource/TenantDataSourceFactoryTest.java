package com.smarthire.multitenancy.datasource;

import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.multitenancy.service.TenantCredentialService;
import org.junit.jupiter.api.Test;
import com.zaxxer.hikari.HikariDataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.flywaydb.core.api.configuration.FluentConfiguration;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class TenantDataSourceFactoryTest {

    @Test
    void failedMigrationIsNotRepairedOrSilentlyAccepted() {
        var bootstrap = mock(TenantSchemaBootstrap.class);
        var factory = new TenantDataSourceFactory(mock(TenantCredentialService.class), bootstrap,
                5, "jdbc:mysql://localhost:3306", "");
        var configuration = mock(FluentConfiguration.class, RETURNS_SELF);
        var flyway = mock(Flyway.class);
        var failure = new FlywayException("Migration failed");
        when(configuration.load()).thenReturn(flyway);
        when(flyway.migrate()).thenThrow(failure);
        try (var mocked = mockStatic(Flyway.class)) {
            mocked.when(Flyway::configure).thenReturn(configuration);
            assertThatThrownBy(() -> factory.migrate(mock(HikariDataSource.class))).isSameAs(failure);
        }
        verify(flyway, never()).repair();
        verifyNoInteractions(bootstrap);
    }

    @Test
    void tenantMigrationVersionsAreUnique() throws Exception {
        try (var files = Files.list(Path.of("src/main/resources/db/migration/tenant"))) {
            var versions = files.map(path -> path.getFileName().toString())
                    .filter(name -> name.matches("V[0-9]+__.*\\.sql"))
                    .map(name -> Integer.parseInt(name.substring(1, name.indexOf("__"))))
                    .toList();
            assertThat(versions).doesNotHaveDuplicates().contains(10, 11, 12, 16);
        }
    }

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

    @Test
    void quotedEnvOptionsAreNotCopiedIntoJdbcUrl() {
        var factory = new TenantDataSourceFactory(mock(TenantCredentialService.class),
                mock(TenantSchemaBootstrap.class), 5,
                "jdbc:mysql://mysql:3306/", "'sslMode=PREFERRED&allowPublicKeyRetrieval=true'");
        var tenant = new TenantInfo();
        tenant.setManagedDatabase(true);
        tenant.setDbName("smarthire_tenant_ttqt");

        assertThat(factory.resolveJdbcUrl(tenant)).isEqualTo(
                "jdbc:mysql://mysql:3306/smarthire_tenant_ttqt?sslMode=PREFERRED&allowPublicKeyRetrieval=true");
    }
}
