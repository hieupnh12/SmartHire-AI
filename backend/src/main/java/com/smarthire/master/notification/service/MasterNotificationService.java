package com.smarthire.master.notification.service;

import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.master.entity.Invoice;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.master.notification.dto.MasterEmailPayload;
import com.smarthire.master.notification.messaging.MasterNotificationPublisher;
import com.smarthire.multitenancy.quota.QuotaType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class MasterNotificationService {

    private final MasterNotificationPublisher publisher;
    private final TenantInfoRepository tenantRepository;
    private final RedisService redisService;

    private static final String IDEMPOTENCY_KEY = "email_sent:%s:%s:%s"; // tenantCode:type:yyyyMMdd

    public void sendInvoiceCreated(String tenantCode, Invoice invoice) {
        if (!shouldSendEmail(tenantCode, "INVOICE_CREATED")) {
            return;
        }

        TenantInfo tenant = getTenant(tenantCode);
        if (tenant == null) return;

        Map<String, Object> vars = new HashMap<>();
        vars.put("tenantName", tenant.getName());
        vars.put("invoiceCode", invoice.getId()); // Adjust according to real Invoice fields
        vars.put("amount", invoice.getAmount());
        vars.put("dueDate", invoice.getDueDate());

        MasterEmailPayload payload = MasterEmailPayload.builder()
                .tenantCode(tenantCode)
                .toEmail(getRecipient(tenant))
                .subject("SmartHire - Hóa đơn mới #" + invoice.getId())
                .templateName("invoice-created")
                .templateVariables(vars)
                .notificationType("INVOICE_CREATED")
                .build();

        publisher.publishEmail(payload);
    }

    public void sendQuotaWarning(String tenantCode, QuotaType type, long used, long limit) {
        if (!shouldSendEmail(tenantCode, "QUOTA_WARNING_" + type.name())) {
            return;
        }

        TenantInfo tenant = getTenant(tenantCode);
        if (tenant == null) return;

        Map<String, Object> vars = new HashMap<>();
        vars.put("tenantName", tenant.getName());
        vars.put("quotaType", type.name());
        vars.put("used", used);
        vars.put("limit", limit);
        vars.put("percentage", Math.round(((double) used / limit) * 100));

        MasterEmailPayload payload = MasterEmailPayload.builder()
                .tenantCode(tenantCode)
                .toEmail(getRecipient(tenant))
                .subject("SmartHire - Cảnh báo vượt mức tài nguyên " + type.name())
                .templateName("quota-warning")
                .templateVariables(vars)
                .notificationType("QUOTA_WARNING")
                .build();

        publisher.publishEmail(payload);
    }

    private boolean shouldSendEmail(String tenantCode, String type) {
        String dateStr = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String key = String.format(IDEMPOTENCY_KEY, tenantCode, type, dateStr);
        
        boolean canSet = redisService.setIfAbsent(key, "1", Duration.ofHours(24));
        if (!canSet) {
            log.info("Email of type {} already sent today for tenant {}. Skipping.", type, tenantCode);
        }
        return canSet;
    }

    private TenantInfo getTenant(String tenantCode) {
        return tenantRepository.findAll().stream() // In a real app, use findByCode
                .filter(t -> t.getCode().equals(tenantCode))
                .findFirst()
                .orElseGet(() -> {
                    log.warn("Tenant {} not found for notification", tenantCode);
                    return null;
                });
    }

    private String getRecipient(TenantInfo tenant) {
        if (StringUtils.hasText(tenant.getBillingEmail())) {
            return tenant.getBillingEmail();
        }
        return tenant.getContactEmail();
    }
}
