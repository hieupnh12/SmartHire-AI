package com.smarthire.tenant.auth.service;

import com.smarthire.tenant.company.service.CompanyEmailSettingService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class InviteMailSender {

    private final ObjectProvider<CompanyEmailSettingService> emailSettingServiceProvider;

    public InviteMailSender(ObjectProvider<CompanyEmailSettingService> emailSettingServiceProvider) {
        this.emailSettingServiceProvider = emailSettingServiceProvider;
    }

    public boolean isConfigured() {
        CompanyEmailSettingService service = emailSettingServiceProvider.getIfAvailable();
        return service != null && service.isConfigured();
    }

    public boolean send(String to, String subject, String body) {
        CompanyEmailSettingService service = emailSettingServiceProvider.getIfAvailable();
        if (service == null) {
            log.warn("CompanyEmailSettingService is not available");
            return false;
        }
        return service.sendMail(to, subject, body);
    }
}
