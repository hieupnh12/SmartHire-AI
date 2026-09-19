package com.smarthire.tenant.company.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.company.dto.CompanyProfileResponse;
import com.smarthire.tenant.company.dto.UpdateCompanyProfileRequest;
import com.smarthire.tenant.company.mapper.CompanyProfileMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CompanyProfileServiceTest {

    @Mock
    private TenantInfoRepository tenantInfoRepository;

    @Spy
    private CompanyProfileMapper companyProfileMapper = Mappers.getMapper(CompanyProfileMapper.class);

    @InjectMocks
    private CompanyProfileServiceImpl companyProfileService;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant("acme");
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private TenantInfo acmeTenant() {
        TenantInfo tenant = new TenantInfo();
        tenant.setCode("acme");
        tenant.setName("Acme Corporation");
        tenant.setSubdomain("acme");
        tenant.setDbName("smarthire_tenant_acme");
        tenant.setDbPassword("super-secret");
        tenant.setIndustry("Information Technology");
        tenant.setVerified(true);
        return tenant;
    }

    @Test
    void getProfile_ExistingTenant_ReturnsBrandingData() {
        when(tenantInfoRepository.findByCode("acme")).thenReturn(Optional.of(acmeTenant()));

        CompanyProfileResponse response = companyProfileService.getProfile();

        assertNotNull(response);
        assertEquals("acme", response.getTenantId());
        assertEquals("Acme Corporation", response.getCompanyName());
        assertEquals("Information Technology", response.getIndustry());
        assertTrue(response.isVerified());
    }

    @Test
    void updateProfile_ValidRequest_PersistsBrandingAndKeepsInfrastructureFields() {
        TenantInfo tenant = acmeTenant();
        when(tenantInfoRepository.findByCode("acme")).thenReturn(Optional.of(tenant));
        when(tenantInfoRepository.save(any(TenantInfo.class))).thenAnswer(call -> call.getArgument(0));

        UpdateCompanyProfileRequest request = UpdateCompanyProfileRequest.builder()
                .companyName("Acme Vietnam")
                .description("Enterprise multi-tenant hiring platform")
                .logoUrl("https://cdn.smarthire.ai/acme/logo.png")
                .website("https://acme.vn")
                .address("Tầng 12, Enterprise Tech Tower, Hà Nội")
                .industry("Software")
                .companySize("100 - 500")
                .build();

        CompanyProfileResponse response = companyProfileService.updateProfile(request);

        assertEquals("Acme Vietnam", response.getCompanyName());
        assertEquals("https://acme.vn", response.getWebsite());
        assertEquals("Software", response.getIndustry());
        assertEquals("smarthire_tenant_acme", tenant.getDbName());
        assertEquals("super-secret", tenant.getDbPassword());
        assertTrue(tenant.isVerified());
        verify(tenantInfoRepository, times(1)).save(tenant);
    }

    @Test
    void updateProfile_BlankOptionalFields_AreStoredAsNull() {
        TenantInfo tenant = acmeTenant();
        tenant.setWebsite("https://old.acme.vn");
        when(tenantInfoRepository.findByCode("acme")).thenReturn(Optional.of(tenant));
        when(tenantInfoRepository.save(any(TenantInfo.class))).thenAnswer(call -> call.getArgument(0));

        UpdateCompanyProfileRequest request = UpdateCompanyProfileRequest.builder()
                .companyName("Acme Vietnam")
                .website("  ")
                .logoUrl("")
                .build();

        companyProfileService.updateProfile(request);

        assertEquals("Acme Vietnam", tenant.getName());
        assertNull(tenant.getWebsite());
        assertNull(tenant.getLogoUrl());
        assertTrue(tenant.isVerified());
    }

    @Test
    void getProfile_UnknownTenant_ThrowsBusinessException() {
        when(tenantInfoRepository.findByCode("acme")).thenReturn(Optional.empty());
        when(tenantInfoRepository.findBySubdomain("acme")).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class, () -> companyProfileService.getProfile());
        assertEquals("TENANT_NOT_FOUND", ex.getCode());
    }

    @Test
    void getProfile_MissingTenantContext_ThrowsBusinessException() {
        TenantContext.clear();

        BusinessException ex = assertThrows(BusinessException.class, () -> companyProfileService.getProfile());
        assertEquals("TENANT_REQUIRED", ex.getCode());
        verifyNoInteractions(tenantInfoRepository);
    }
}
