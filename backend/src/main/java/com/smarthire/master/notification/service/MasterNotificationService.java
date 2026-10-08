package com.smarthire.master.notification.service;

import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.master.entity.Invoice;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.master.notification.dto.MasterEmailPayload;
import com.smarthire.master.notification.messaging.MasterNotificationPublisher;
import com.smarthire.multitenancy.quota.QuotaType;
import com.smarthire.master.billing.dto.OrderPdfData;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Locale;
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

    public void sendCheckoutOrderCreated(OrderPdfData orderData, byte[] pdfBytes, String recipientEmail) {
        String invoiceNumber = orderData.getInvoiceNumber();
        String idempotencyKey = String.format("email_sent:checkout_order:%s", invoiceNumber);
        boolean canSet = redisService.setIfAbsent(idempotencyKey, "1", Duration.ofHours(24));
        if (!canSet) {
            log.info("Checkout order email already sent for invoice #{}. Skipping duplicate.", invoiceNumber);
            return;
        }

        DecimalFormatSymbols symbols = new DecimalFormatSymbols(new Locale("vi", "VN"));
        symbols.setGroupingSeparator('.');
        DecimalFormat formatter = new DecimalFormat("#,###", symbols);

        String formattedUnitPrice = formatter.format(orderData.getUnitPrice() != null ? orderData.getUnitPrice() : BigDecimal.ZERO);
        String formattedTotalPrice = formatter.format(orderData.getTotalPrice() != null ? orderData.getTotalPrice() : BigDecimal.ZERO);

        Map<String, Object> vars = new HashMap<>();
        vars.put("customerName", StringUtils.hasText(orderData.getCustomerName()) ? orderData.getCustomerName() : "Quý khách");
        vars.put("invoiceNumber", orderData.getInvoiceNumber());
        vars.put("orderDate", StringUtils.hasText(orderData.getOrderDate()) ? orderData.getOrderDate() : LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        vars.put("planName", orderData.getPlanName());
        vars.put("quantity", orderData.getQuantity() > 0 ? orderData.getQuantity() : 1);
        vars.put("formattedUnitPrice", formattedUnitPrice);
        vars.put("formattedTotalPrice", formattedTotalPrice);
        vars.put("bankName", orderData.getBankName());
        vars.put("accountNumber", orderData.getAccountNumber());
        vars.put("accountName", orderData.getAccountName());
        vars.put("transferSyntax", orderData.getTransferSyntax());
        vars.put("qrUrl", orderData.getQrUrl());
        vars.put("checkoutUrl", "https://smarthire.top/checkout");

        String pdfFilename = "Thong tin don hang " + orderData.getInvoiceNumber() + ".pdf";

        MasterEmailPayload payload = MasterEmailPayload.builder()
                .tenantCode("PLATFORM")
                .toEmail(recipientEmail)
                .subject("SmartHire-AI - Thông tin đơn hàng #" + orderData.getInvoiceNumber())
                .templateName("checkout-order-created")
                .templateVariables(vars)
                .notificationType("CHECKOUT_ORDER_CREATED")
                .attachmentData(pdfBytes)
                .attachmentFilename(pdfFilename)
                .build();

        publisher.publishEmail(payload);
        log.info("Queued checkout order email with PDF for invoice #{} to {}", orderData.getInvoiceNumber(), recipientEmail);
    }

    public void sendWorkspaceActivated(TenantInfo tenant, String planName, String activationUrl, String workspaceUrl) {
        String recipientEmail = getRecipient(tenant);
        if (!StringUtils.hasText(recipientEmail)) {
            log.warn("Cannot send workspace activation email: recipient email missing for tenant {}", tenant.getCode());
            return;
        }

        String idempotencyKey = String.format("email_sent:workspace_activated:%s", tenant.getCode());
        boolean canSet = redisService.setIfAbsent(idempotencyKey, "1", Duration.ofHours(24));
        if (!canSet) {
            log.info("Workspace activation email already sent for tenant {}. Skipping duplicate.", tenant.getCode());
            return;
        }

        String loginUrl = workspaceUrl.endsWith("/internal/login") ? workspaceUrl : workspaceUrl + "/internal/login";
        String claimUrl = StringUtils.hasText(activationUrl) ? activationUrl : loginUrl;

        Map<String, Object> vars = new HashMap<>();
        vars.put("customerName", StringUtils.hasText(tenant.getContactName()) ? tenant.getContactName() : tenant.getName());
        vars.put("workspaceName", tenant.getName());
        vars.put("subdomain", tenant.getSubdomain());
        vars.put("workspaceLoginUrl", loginUrl);
        vars.put("activationUrl", claimUrl);
        vars.put("adminEmail", recipientEmail);
        vars.put("planName", StringUtils.hasText(planName) ? planName : "Gói Thuê Bao SmartHire");
        vars.put("activatedDate", LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        vars.put("supportEmail", "support@smarthire.top");
        vars.put("supportHotline", "0988.888.888");

        MasterEmailPayload payload = MasterEmailPayload.builder()
                .tenantCode(tenant.getCode())
                .toEmail(recipientEmail)
                .subject("SmartHire-AI - Kích hoạt không gian làm việc & Thiết lập mật khẩu [" + tenant.getName() + "]")
                .templateName("workspace-activated")
                .templateVariables(vars)
                .notificationType("WORKSPACE_ACTIVATED")
                .build();

        publisher.publishEmail(payload);
        log.info("Queued workspace activation email for tenant {} to {}", tenant.getCode(), recipientEmail);
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
