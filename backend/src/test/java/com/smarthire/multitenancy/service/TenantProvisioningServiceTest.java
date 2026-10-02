package com.smarthire.multitenancy.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TenantProvisioningServiceTest {

    @Test
    void provisioningUrlAlwaysTargetsTheMysqlServer() {
        assertThat(TenantProvisioningService.serverJdbcUrl("jdbc:mysql://mysql:3306/smarthire_mysql/"))
                .isEqualTo("jdbc:mysql://mysql:3306/");
        assertThat(TenantProvisioningService.serverJdbcUrl(
                "jdbc:mysql://mysql:3306/registry?sslMode=PREFERRED"))
                .isEqualTo("jdbc:mysql://mysql:3306/?sslMode=PREFERRED");
    }

    @Test
    void rejectsNonMysqlProvisioningUrl() {
        assertThatThrownBy(() -> TenantProvisioningService.serverJdbcUrl("jdbc:postgresql://db/master"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
