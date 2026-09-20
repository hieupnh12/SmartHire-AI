package com.smarthire.multitenancy;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.multitenancy.service.TenantRegistryService;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TenantRegistryServiceTest {

    private final TenantInfoRepository repository = mock(TenantInfoRepository.class);
    private final TenantRegistryService registry = new TenantRegistryService(repository);

    @Test
    void resolvesHostnameOnlyBySubdomain() {
        TenantInfo tenant = TenantInfo.builder()
                .code("ttqt")
                .subdomain("tuyen-dung-ttqt")
                .status("ACTIVE")
                .build();
        when(repository.findBySubdomain("tuyen-dung-ttqt")).thenReturn(Optional.of(tenant));

        TenantInfo resolved = registry.requireActiveBySubdomain("TUYEN-DUNG-TTQT");

        assertThat(resolved.getCode()).isEqualTo("ttqt");
        verify(repository).findBySubdomain("tuyen-dung-ttqt");
    }

    @Test
    void rejectsCompanyCodeWhenItIsNotTheSubdomain() {
        when(repository.findBySubdomain("ttqt")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> registry.requireActiveBySubdomain("ttqt"))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo("TENANT_NOT_FOUND");

        verify(repository).findBySubdomain("ttqt");
    }
}
