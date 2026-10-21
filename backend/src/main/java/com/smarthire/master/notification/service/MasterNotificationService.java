package com.smarthire.master.notification.service;

import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.master.entity.ConsultationRequest;
import com.smarthire.domain.master.entity.Invoice;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.master.lead.dto.SendQuotationRequest;
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
        if (invoice == null || !StringUtils.hasText(tenantCode)) {
            return;
        }
        String invoiceCode = StringUtils.hasText(invoice.getInvoiceNumber())
                ? invoice.getInvoiceNumber()
                : String.valueOf(invoice.getId());
        if (!shouldSendEmail(tenantCode, "INVOICE_CREATED_" + invoiceCode)) {
            return;
        }

        TenantInfo tenant = getTenant(tenantCode);
        if (tenant == null) return;

        String recipient = getRecipient(tenant);
        if (!StringUtils.hasText(recipient)) {
            log.warn("Cannot send invoice-created email: no recipient email for tenant {}", tenantCode);
            return;
        }

        DecimalFormatSymbols symbols = new DecimalFormatSymbols(new Locale("vi", "VN"));
        symbols.setGroupingSeparator('.');
        DecimalFormat formatter = new DecimalFormat("#,###", symbols);
        String formattedAmount = formatter.format(invoice.getAmount() != null ? invoice.getAmount() : BigDecimal.ZERO);
        String formattedDueDate = invoice.getDueDate() != null
                ? invoice.getDueDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                : LocalDate.now().plusDays(14).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        Map<String, Object> vars = new HashMap<>();
        vars.put("tenantName", tenant.getName());
        vars.put("invoiceCode", invoiceCode);
        vars.put("amount", formattedAmount);
        vars.put("dueDate", formattedDueDate);

        MasterEmailPayload payload = MasterEmailPayload.builder()
                .tenantCode(tenant.getCode())
                .toEmail(recipient)
                .subject("SmartHire-AI - Thông báo phát hành hóa đơn #" + invoiceCode)
                .templateName("invoice-created")
                .templateVariables(vars)
                .notificationType("INVOICE_CREATED")
                .build();

        publisher.publishEmail(payload);
        log.info("Queued invoice-created email for invoice #{} to {} (tenant={})", invoiceCode, recipient, tenant.getCode());
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
        if (type == null || limit <= 0L || !StringUtils.hasText(tenantCode)) {
            return;
        }
        long percentage = Math.round(((double) used / limit) * 100);
        String thresholdTier = percentage >= 100 ? "100" : "80";
        if (!shouldSendEmail(tenantCode, "QUOTA_WARNING_" + type.name() + "_" + thresholdTier)) {
            return;
        }

        TenantInfo tenant = getTenant(tenantCode);
        if (tenant == null) return;

        String recipient = getRecipient(tenant);
        if (!StringUtils.hasText(recipient)) {
            log.warn("Cannot send quota warning email: no recipient email for tenant {}", tenantCode);
            return;
        }

        String displayQuotaName = switch (type) {
            case CV_PARSE -> "Lượt phân tích CV bằng AI (CV_PARSE)";
            case AI_VOICE_SECONDS -> "Thời lượng phỏng vấn AI Voice (giây)";
            case AI_TOKENS -> "Hạn ngạch AI Tokens (AI_TOKENS)";
            case ACTIVE_JOBS -> "Số tin tuyển dụng đang mở (ACTIVE_JOBS)";
            case MAX_SEATS -> "Số lượng tài khoản nhân sự (MAX_SEATS)";
            case STORAGE_BYTES -> "Dung lượng lưu trữ (Bytes)";
            case PROCTORING_SECONDS -> "Thời lượng giám sát thi Proctoring (giây)";
            case VIDEO_RETENTION_DAYS -> "Thời hạn lưu trữ Video";
        };

        Map<String, Object> vars = new HashMap<>();
        vars.put("tenantName", tenant.getName());
        vars.put("quotaType", displayQuotaName);
        vars.put("used", used);
        vars.put("limit", limit);
        vars.put("percentage", percentage);

        MasterEmailPayload payload = MasterEmailPayload.builder()
                .tenantCode(tenant.getCode())
                .toEmail(recipient)
                .subject("SmartHire-AI - Cảnh báo chạm ngưỡng tài nguyên (" + percentage + "%) - " + displayQuotaName)
                .templateName("quota-warning")
                .templateVariables(vars)
                .notificationType("QUOTA_WARNING")
                .build();

        publisher.publishEmail(payload);
        log.info("Queued quota warning email ({} - {}%) for tenant {} to {}", type.name(), percentage, tenant.getCode(), recipient);
    }

    public void sendQuotationProposal(SendQuotationRequest request, SubscriptionPlan plan) {
        if (request == null || !StringUtils.hasText(request.getRecipientEmail())) {
            log.warn("Cannot send quotation email: recipient email missing");
            return;
        }

        DecimalFormatSymbols symbols = new DecimalFormatSymbols(new Locale("vi", "VN"));
        symbols.setGroupingSeparator('.');
        DecimalFormat formatter = new DecimalFormat("#,###", symbols);

        BigDecimal platformFee = request.getPlatformFee() != null ? request.getPlatformFee() : BigDecimal.ZERO;
        BigDecimal addonFee = request.getAddonFee() != null ? request.getAddonFee() : BigDecimal.ZERO;
        BigDecimal discount = request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO;
        BigDecimal totalQuote = request.getTotalQuote() != null ? request.getTotalQuote() : BigDecimal.ZERO;

        Map<String, Object> vars = new HashMap<>();
        vars.put("companyName", request.getCompanyName());
        vars.put("contactName", request.getContactName());
        vars.put("recipientEmail", request.getRecipientEmail());
        vars.put("phoneNumber", request.getPhoneNumber());

        vars.put("planName", plan != null && StringUtils.hasText(plan.getName()) ? plan.getName() : "Gói Doanh Nghiệp Tùy Chỉnh (Enterprise Custom)");
        vars.put("formattedPlatformFee", formatter.format(platformFee));
        vars.put("formattedAddonFee", formatter.format(addonFee));
        vars.put("formattedDiscount", formatter.format(discount));
        vars.put("discountAmount", discount.compareTo(BigDecimal.ZERO) > 0 ? formatter.format(discount) : "0");
        vars.put("formattedTotalQuote", formatter.format(totalQuote));

        vars.put("maxJobs", plan != null && plan.getMaxJobs() != null ? (plan.getMaxJobs() == -1 ? "Không giới hạn" : String.valueOf(plan.getMaxJobs())) : "10");
        vars.put("maxCvParses", plan != null && plan.getMaxCvParses() != null ? (plan.getMaxCvParses() == -1 ? "Không giới hạn" : formatter.format(plan.getMaxCvParses())) : "500");
        vars.put("maxAiInterviewHours", plan != null && plan.getMaxAiInterviewHours() != null ? (plan.getMaxAiInterviewHours() == -1 ? "Không giới hạn" : String.valueOf(plan.getMaxAiInterviewHours())) : "10");
        vars.put("maxStorageGb", plan != null && plan.getMaxStorageGb() != null ? (plan.getMaxStorageGb() == -1 ? "Không giới hạn" : String.valueOf(plan.getMaxStorageGb())) : "10");

        vars.put("validUntil", LocalDate.now().plusDays(15).format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));

        MasterEmailPayload payload = MasterEmailPayload.builder()
                .tenantCode("PLATFORM")
                .toEmail(request.getRecipientEmail())
                .subject("SmartHire-AI - Bảng Báo Giá Thương Mại B2B [" + request.getCompanyName() + "]")
                .templateName("quotation-proposal")
                .templateVariables(vars)
                .notificationType("QUOTATION_PROPOSAL")
                .build();

        publisher.publishEmail(payload);
        log.info("Queued commercial quotation email for company {} to {}", request.getCompanyName(), request.getRecipientEmail());
    }

    public void sendConsultationReceived(ConsultationRequest request) {
        if (request == null || !StringUtils.hasText(request.getWorkEmail())) {
            return;
        }

        Map<String, Object> vars = new HashMap<>();
        vars.put("contactName", request.getContactName());
        vars.put("companyName", request.getCompanyName());
        vars.put("requestType", request.getRequestType());
        vars.put("planTier", request.getPlanTier());
        vars.put("receivedDate", LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));

        MasterEmailPayload payload = MasterEmailPayload.builder()
                .tenantCode("PLATFORM")
                .toEmail(request.getWorkEmail())
                .subject("SmartHire-AI - Xác nhận tiếp nhận yêu cầu tư vấn [" + request.getCompanyName() + "]")
                .templateName("consultation-received")
                .templateVariables(vars)
                .notificationType("CONSULTATION_RECEIVED")
                .build();

        publisher.publishEmail(payload);
        log.info("Queued consultation acknowledgment email for lead {} to {}", request.getCompanyName(), request.getWorkEmail());
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
        return tenantRepository.findByCode(tenantCode)
                .or(() -> tenantRepository.findBySubdomain(tenantCode))
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
