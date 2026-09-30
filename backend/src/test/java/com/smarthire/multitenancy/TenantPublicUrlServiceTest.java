package com.smarthire.multitenancy;

import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.service.TenantPublicUrlService;
import com.smarthire.multitenancy.service.TenantRegistryService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TenantPublicUrlServiceTest {
    @Mock TenantRegistryService registry;

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void usesSubdomainNotTenantCode() {
        TenantInfo tenant = new TenantInfo();
        tenant.setCode("ttqt");
        tenant.setSubdomain("se36");
        TenantContext.setCurrentTenant("ttqt");
        when(registry.requireActive("ttqt")).thenReturn(tenant);

        TenantPublicUrlService urls = new TenantPublicUrlService(registry, "http://localhost:5173", "smarthire.top");

        assertThat(urls.path("/candidate/interviews"))
                .isEqualTo("http://se36.localhost:5173/candidate/interviews");
    }

    @Test
    void stripsExistingTenantFromPublicOrigin() {
        TenantInfo tenant = new TenantInfo();
        tenant.setCode("ttqt");
        tenant.setSubdomain("se36");
        TenantContext.setCurrentTenant("ttqt");
        when(registry.requireActive("ttqt")).thenReturn(tenant);

        TenantPublicUrlService urls = new TenantPublicUrlService(
                registry, "http://ttqt.localhost:5173", "smarthire.top");

        assertThat(urls.path("/candidate/interviews"))
                .isEqualTo("http://se36.localhost:5173/candidate/interviews");
    }
}
