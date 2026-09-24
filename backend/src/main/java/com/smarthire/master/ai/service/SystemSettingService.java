package com.smarthire.master.ai.service;

import com.smarthire.domain.master.entity.PlatformAuditLog;
import com.smarthire.domain.master.entity.SystemSetting;
import com.smarthire.domain.master.repository.PlatformAuditLogRepository;
import com.smarthire.domain.master.repository.SystemSettingRepository;
import com.smarthire.multitenancy.service.TenantCredentialService;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SystemSettingService {

    private final SystemSettingRepository settingRepository;
    private final PlatformAuditLogRepository auditLogRepository;
    private final TenantCredentialService credentialService;

    public SystemSettingService(
            SystemSettingRepository settingRepository,
            PlatformAuditLogRepository auditLogRepository,
            TenantCredentialService credentialService) {
        this.settingRepository = settingRepository;
        this.auditLogRepository = auditLogRepository;
        this.credentialService = credentialService;
    }

    public List<SystemSetting> getAllSettings(String category) {
        if (category != null && !category.isBlank()) {
            return settingRepository.findByCategory(category.toUpperCase());
        }
        return settingRepository.findAll();
    }

    public Optional<String> getSettingValue(String key) {
        return settingRepository.findById(key).map(setting -> {
            if (Boolean.TRUE.equals(setting.getIsEncrypted())) {
                try {
                    return credentialService.decrypt("SYSTEM_SETTING", setting.getSettingValue());
                } catch (Exception ignored) {}
            }
            return setting.getSettingValue();
        });
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public SystemSetting saveSetting(String key, String value, String category, String description, boolean encrypt, String adminEmail) {
        String storedValue = value;
        if (encrypt && value != null && !value.isBlank()) {
            storedValue = credentialService.encrypt("SYSTEM_SETTING", value.trim());
        }

        SystemSetting setting = settingRepository.findById(key)
                .orElseGet(() -> SystemSetting.builder().settingKey(key).build());

        setting.setSettingValue(storedValue);
        if (category != null) setting.setCategory(category.toUpperCase());
        if (description != null) setting.setDescription(description);
        setting.setIsEncrypted(encrypt);
        setting.setUpdatedBy(adminEmail);

        SystemSetting saved = settingRepository.save(setting);

        auditLogRepository.save(PlatformAuditLog.builder()
                .action("SYSTEM_SETTING_UPDATED")
                .description("Updated system setting " + key + " by " + adminEmail)
                .build());

        return saved;
    }
}
