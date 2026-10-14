package com.smarthire.tenant.company.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.tenant.entity.CompanyEmailSetting;
import com.smarthire.domain.tenant.repository.CompanyEmailSettingRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.service.TenantCredentialService;
import com.smarthire.tenant.company.dto.CompanyEmailSettingResponse;
import com.smarthire.tenant.company.dto.SaveCompanyEmailSettingRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CompanyEmailSettingServiceTest {

    @Mock
    private CompanyEmailSettingRepository settingRepository;

    @Mock
    private TenantCredentialService credentialService;

    @InjectMocks
    private CompanyEmailSettingService service;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant("test_tenant");
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void getSettings_WhenEmpty_ReturnsNotConfigured() {
        when(settingRepository.findFirstByOrderByIdDesc()).thenReturn(Optional.empty());

        CompanyEmailSettingResponse res = service.getSettings();

        assertFalse(res.isConfigured());
        assertEquals("GMAIL", res.getProvider());
    }

    @Test
    void getSettings_WhenExists_ReturnsMaskedResponse() {
        CompanyEmailSetting setting = CompanyEmailSetting.builder()
                .provider("GMAIL")
                .mailUsername("admin@company.com")
                .fromName("Admin HR")
                .mailPasswordEncrypted("v1:secret")
                .isActive(true)
                .build();
        when(settingRepository.findFirstByOrderByIdDesc()).thenReturn(Optional.of(setting));

        CompanyEmailSettingResponse res = service.getSettings();

        assertTrue(res.isConfigured());
        assertEquals("admin@company.com", res.getMailUsername());
        assertEquals("Admin HR", res.getFromName());
    }

    @Test
    void saveSettings_WithNewPassword_EncryptsAndSaves() {
        when(settingRepository.findFirstByOrderByIdDesc()).thenReturn(Optional.empty());
        when(credentialService.encrypt("test_tenant", "puexryxwssmsyfjz")).thenReturn("v1:encryptedPass");
        when(settingRepository.save(any(CompanyEmailSetting.class))).thenAnswer(i -> i.getArgument(0));

        SaveCompanyEmailSettingRequest req = SaveCompanyEmailSettingRequest.builder()
                .mailUsername("admin@company.com")
                .mailPassword("puex ryxw ssms yfjz")
                .fromName("Admin HR")
                .build();

        CompanyEmailSettingResponse res = service.saveSettings(req);

        ArgumentCaptor<CompanyEmailSetting> captor = ArgumentCaptor.forClass(CompanyEmailSetting.class);
        verify(settingRepository).save(captor.capture());
        CompanyEmailSetting saved = captor.getValue();

        assertEquals("admin@company.com", saved.getMailUsername());
        assertEquals("v1:encryptedPass", saved.getMailPasswordEncrypted());
        assertEquals("Admin HR", saved.getFromName());
        assertTrue(saved.getIsActive());
    }

    @Test
    void sendMail_WhenNotConfigured_ThrowsBusinessException() {
        when(settingRepository.findFirstByIsActiveTrueOrderByIdDesc()).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class, () ->
                service.sendMail("recipient@test.com", "Subject", "Body"));

        assertEquals("MAIL_CONFIG_REQUIRED", ex.getCode());
    }
}
