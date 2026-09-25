package com.smarthire.master.billing.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.Invoice;
import com.smarthire.domain.master.entity.InvoiceLineItem;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.entity.TenantSubscription;
import com.smarthire.domain.master.repository.InvoiceLineItemRepository;
import com.smarthire.domain.master.repository.InvoiceRepository;
import com.smarthire.domain.master.repository.SubscriptionPlanRepository;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.domain.master.repository.TenantSubscriptionRepository;
import com.smarthire.master.billing.dto.*;
import com.smarthire.master.tenant.service.MasterTenantService;
import com.smarthire.tenant.auth.service.InviteMailSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MasterBillingService {

    private static final Set<String> VALID_STATUSES = Set.of("PENDING", "PAID", "OVERDUE", "CANCELLED");

    private final InvoiceRepository invoiceRepository;
    private final InvoiceLineItemRepository invoiceLineItemRepository;
    private final TenantInfoRepository tenantRepository;
    private final SubscriptionPlanRepository planRepository;
    private final TenantSubscriptionRepository subscriptionRepository;
    private final MasterTenantService masterTenantService;
    private final InviteMailSender mailSender;

    @Value("${app.tenant.base-domain:smarthire.top}")
    private String baseDomain;

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public List<InvoiceResponse> getAllInvoices(String statusFilter, Long tenantId) {
        List<Invoice> invoices;
        if (tenantId != null) {
            invoices = invoiceRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        } else if (StringUtils.hasText(statusFilter) && !"ALL".equalsIgnoreCase(statusFilter)) {
            invoices = invoiceRepository.findByStatusOrderByCreatedAtDesc(statusFilter.toUpperCase());
        } else {
            invoices = invoiceRepository.findAllByOrderByCreatedAtDesc();
        }

        Map<Long, TenantInfo> tenantMap = tenantRepository.findAll().stream()
                .collect(Collectors.toMap(TenantInfo::getId, Function.identity(), (a, b) -> a));
        Map<Long, SubscriptionPlan> planMap = planRepository.findAll().stream()
                .collect(Collectors.toMap(SubscriptionPlan::getId, Function.identity(), (a, b) -> a));

        return invoices.stream().map(inv -> {
            TenantInfo tenant = tenantMap.get(inv.getTenantId());
            SubscriptionPlan plan = null;
            if (inv.getSubscriptionId() != null) {
                TenantSubscription sub = subscriptionRepository.findById(inv.getSubscriptionId()).orElse(null);
                if (sub != null) {
                    plan = planMap.get(sub.getPlanId());
                }
            }
            InvoiceResponse response = InvoiceResponse.from(inv, tenant, plan);
            List<InvoiceLineItem> items = invoiceLineItemRepository.findByInvoiceId(inv.getId());
            response.setLineItems(items.stream().map(InvoiceLineItemResponse::from).toList());
            return response;
        }).toList();
    }

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public InvoiceResponse getInvoiceById(Long id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Hóa đơn không tồn tại", HttpStatus.NOT_FOUND, "INVOICE_NOT_FOUND"));

        TenantInfo tenant = tenantRepository.findById(invoice.getTenantId()).orElse(null);
        SubscriptionPlan plan = null;
        if (invoice.getSubscriptionId() != null) {
            TenantSubscription sub = subscriptionRepository.findById(invoice.getSubscriptionId()).orElse(null);
            if (sub != null) {
                plan = planRepository.findById(sub.getPlanId()).orElse(null);
            }
        }
        InvoiceResponse response = InvoiceResponse.from(invoice, tenant, plan);
        List<InvoiceLineItem> items = invoiceLineItemRepository.findByInvoiceId(invoice.getId());
        response.setLineItems(items.stream().map(InvoiceLineItemResponse::from).toList());
        return response;
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public InvoiceResponse createInvoice(CreateInvoiceRequest request) {
        TenantInfo tenant = tenantRepository.findById(request.getTenantId())
                .orElseThrow(() -> new BusinessException("Doanh nghiệp không tồn tại", HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND"));

        Long subscriptionId = null;
        SubscriptionPlan plan = null;

        if (request.getPlanId() != null) {
            plan = planRepository.findById(request.getPlanId())
                    .orElseThrow(() -> new BusinessException("Gói cước không tồn tại", HttpStatus.NOT_FOUND, "PLAN_NOT_FOUND"));

            LocalDateTime startsAt = request.getBillingPeriodStart() != null ? request.getBillingPeriodStart() : LocalDateTime.now();
            LocalDateTime endsAt = request.getBillingPeriodEnd() != null ? request.getBillingPeriodEnd() : startsAt.plusYears(1);

            TenantSubscription sub = TenantSubscription.builder()
                    .tenantId(tenant.getId())
                    .planId(plan.getId())
                    .status("PENDING")
                    .startsAt(startsAt)
                    .endsAt(endsAt)
                    .autoRenew(true)
                    .build();
            sub = subscriptionRepository.save(sub);
            subscriptionId = sub.getId();
        }

        String invoiceNumber = generateInvoiceNumber();

        Invoice invoice = Invoice.builder()
                .invoiceNumber(invoiceNumber)
                .tenantId(tenant.getId())
                .subscriptionId(subscriptionId)
                .amount(request.getAmount())
                .subtotal(request.getSubtotal() != null ? request.getSubtotal() : request.getAmount())
                .taxRate(request.getTaxRate())
                .currency(StringUtils.hasText(request.getCurrency()) ? request.getCurrency().toUpperCase() : "USD")
                .status("PENDING")
                .dueDate(request.getDueDate() != null ? request.getDueDate() : LocalDateTime.now().plusDays(14))
                .billingPeriodStart(request.getBillingPeriodStart() != null ? request.getBillingPeriodStart() : LocalDateTime.now())
                .billingPeriodEnd(request.getBillingPeriodEnd() != null ? request.getBillingPeriodEnd() : LocalDateTime.now().plusYears(1))
                .paymentGateway(request.getPaymentGateway())
                .notes(request.getNotes())
                .build();

        Invoice saved = invoiceRepository.save(invoice);
        log.info("New B2B Invoice created: #{} for Tenant: {}", saved.getInvoiceNumber(), tenant.getCode());

        if (request.getLineItems() != null && !request.getLineItems().isEmpty()) {
            List<InvoiceLineItem> lineItems = request.getLineItems().stream().map(itemReq -> 
                InvoiceLineItem.builder()
                        .invoiceId(saved.getId())
                        .description(itemReq.getDescription())
                        .quantity(itemReq.getQuantity() != null ? itemReq.getQuantity() : 1)
                        .unitPrice(itemReq.getUnitPrice())
                        .totalPrice(itemReq.getUnitPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity() != null ? itemReq.getQuantity() : 1)))
                        .itemType(itemReq.getItemType())
                        .build()
            ).toList();
            invoiceLineItemRepository.saveAll(lineItems);
        }

        InvoiceResponse response = InvoiceResponse.from(saved, tenant, plan);
        List<InvoiceLineItem> items = invoiceLineItemRepository.findByInvoiceId(saved.getId());
        response.setLineItems(items.stream().map(InvoiceLineItemResponse::from).toList());
        return response;
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public InvoiceResponse updateInvoiceStatus(Long id, UpdateInvoiceStatusRequest request) {
        String nextStatus = request.getStatus().toUpperCase();
        if (!VALID_STATUSES.contains(nextStatus)) {
            throw new BusinessException("Trạng thái hóa đơn không hợp lệ: " + nextStatus, HttpStatus.BAD_REQUEST, "INVALID_STATUS");
        }

        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Hóa đơn không tồn tại", HttpStatus.NOT_FOUND, "INVOICE_NOT_FOUND"));

        invoice.setStatus(nextStatus);
        if (StringUtils.hasText(request.getPaymentGateway())) {
            invoice.setPaymentGateway(request.getPaymentGateway());
        }
        if (StringUtils.hasText(request.getTransactionId())) {
            invoice.setTransactionId(request.getTransactionId());
        }
        if (StringUtils.hasText(request.getNotes())) {
            invoice.setNotes(request.getNotes());
        }

        if ("PAID".equals(nextStatus)) {
            invoice.setPaidAt(request.getPaidAt() != null ? request.getPaidAt() : LocalDateTime.now());
            if (invoice.getSubscriptionId() != null) {
                subscriptionRepository.findById(invoice.getSubscriptionId()).ifPresent(sub -> {
                    sub.setStatus("ACTIVE");
                    subscriptionRepository.save(sub);
                });
            }
        }

        Invoice saved = invoiceRepository.save(invoice);
        log.info("Invoice #{} updated to status: {}", saved.getInvoiceNumber(), nextStatus);

        TenantInfo tenant = tenantRepository.findById(saved.getTenantId()).orElse(null);
        SubscriptionPlan plan = null;
        if (saved.getSubscriptionId() != null) {
            TenantSubscription sub = subscriptionRepository.findById(saved.getSubscriptionId()).orElse(null);
            if (sub != null) {
                plan = planRepository.findById(sub.getPlanId()).orElse(null);
            }
        }

        InvoiceResponse response = InvoiceResponse.from(saved, tenant, plan);
        List<InvoiceLineItem> items = invoiceLineItemRepository.findByInvoiceId(saved.getId());
        response.setLineItems(items.stream().map(InvoiceLineItemResponse::from).toList());
        return response;
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public CheckoutResponse checkout(CheckoutRequest request) {
        SubscriptionPlan plan = planRepository.findByCode(request.getPlanCode().toUpperCase())
                .orElseThrow(() -> new BusinessException("Gói cước không tồn tại: " + request.getPlanCode(), HttpStatus.NOT_FOUND, "PLAN_NOT_FOUND"));

        BigDecimal amountVnd = "YEARLY".equalsIgnoreCase(request.getBillingCycle()) 
                ? plan.getPriceYearlyVnd() 
                : plan.getPriceMonthlyVnd();

        if (amountVnd == null || amountVnd.compareTo(BigDecimal.ZERO) <= 0) {
            BigDecimal baseUsd = "YEARLY".equalsIgnoreCase(request.getBillingCycle()) ? plan.getPriceYearly() : plan.getPriceMonthly();
            amountVnd = baseUsd.multiply(BigDecimal.valueOf(25400));
        }

        // 1. Register pending tenant
        TenantInfo tenant = masterTenantService.registerPendingTenant(
                request.getSubdomain(),
                request.getWorkspaceName(),
                request.getSubdomain(),
                request.getAdminFullName(),
                request.getAdminEmail(),
                request.getAdminPhone(),
                request.getTaxCode(),
                request.getCompanyLegalName(),
                request.getBillingAddress()
        );

        // 2. Create pending tenant subscription
        LocalDateTime startsAt = LocalDateTime.now();
        LocalDateTime endsAt = "YEARLY".equalsIgnoreCase(request.getBillingCycle())
                ? startsAt.plusYears(1)
                : startsAt.plusMonths(1);

        TenantSubscription sub = TenantSubscription.builder()
                .tenantId(tenant.getId())
                .planId(plan.getId())
                .status("PENDING")
                .startsAt(startsAt)
                .endsAt(endsAt)
                .autoRenew(true)
                .build();
        sub = subscriptionRepository.save(sub);

        // 3. Create invoice
        String invoiceNumber = generateInvoiceNumber();
        Invoice invoice = Invoice.builder()
                .invoiceNumber(invoiceNumber)
                .tenantId(tenant.getId())
                .subscriptionId(sub.getId())
                .amount(amountVnd)
                .subtotal(amountVnd)
                .taxRate(BigDecimal.ZERO)
                .currency("VND")
                .status("PENDING")
                .dueDate(LocalDateTime.now().plusDays(7))
                .billingPeriodStart(startsAt)
                .billingPeriodEnd(endsAt)
                .paymentGateway("BANK_TRANSFER")
                .billingTaxCode(request.getTaxCode())
                .billingLegalName(request.getCompanyLegalName())
                .billingAddress(request.getBillingAddress())
                .notes("Self-Service Checkout - " + plan.getName() + " (" + request.getBillingCycle() + ")")
                .build();
        Invoice savedInvoice = invoiceRepository.save(invoice);

        // 4. Create line item
        InvoiceLineItem lineItem = InvoiceLineItem.builder()
                .invoiceId(savedInvoice.getId())
                .description("Thuê bao " + plan.getName() + " (" + ("YEARLY".equalsIgnoreCase(request.getBillingCycle()) ? "1 năm" : "1 tháng") + ")")
                .quantity(1)
                .unitPrice(amountVnd)
                .totalPrice(amountVnd)
                .itemType("SUBSCRIPTION")
                .build();
        invoiceLineItemRepository.save(lineItem);

        // 5. Bank Info and VietQR
        String bankName = "Techcombank (TCB)";
        String accountNumber = "190388889999";
        String accountName = "CONG TY CP CONG NGHE SMARTHIRE VIET NAM";
        String transferSyntax = "SH " + savedInvoice.getInvoiceNumber();
        String encodedSyntax = URLEncoder.encode(transferSyntax, StandardCharsets.UTF_8);
        String encodedAccount = URLEncoder.encode(accountName, StandardCharsets.UTF_8);
        String qrUrl = "https://img.vietqr.io/image/TCB-190388889999-compact2.png?amount=" 
                + amountVnd.toBigInteger() 
                + "&addInfo=" + encodedSyntax 
                + "&accountName=" + encodedAccount;

        return CheckoutResponse.builder()
                .invoiceId(savedInvoice.getId())
                .invoiceNumber(savedInvoice.getInvoiceNumber())
                .tenantId(tenant.getId())
                .tenantCode(tenant.getCode())
                .subdomain(tenant.getSubdomain())
                .planName(plan.getName())
                .planCode(plan.getCode())
                .billingCycle(request.getBillingCycle().toUpperCase())
                .amountVnd(amountVnd)
                .currency("VND")
                .status("PENDING")
                .bankName(bankName)
                .accountNumber(accountNumber)
                .accountName(accountName)
                .transferSyntax(transferSyntax)
                .qrUrl(qrUrl)
                .createdAt(savedInvoice.getCreatedAt())
                .build();
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public Invoice completePaidInvoice(Long invoiceId, String gateway, String transactionId, String notes) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new BusinessException("Hóa đơn không tồn tại: " + invoiceId, HttpStatus.NOT_FOUND, "INVOICE_NOT_FOUND"));

        if ("PAID".equalsIgnoreCase(invoice.getStatus())) {
            log.info("Invoice #{} is already marked as PAID.", invoice.getInvoiceNumber());
            return invoice;
        }

        invoice.setStatus("PAID");
        invoice.setPaidAt(LocalDateTime.now());
        if (StringUtils.hasText(gateway)) {
            invoice.setPaymentGateway(gateway);
        }
        if (StringUtils.hasText(transactionId)) {
            invoice.setTransactionId(transactionId);
        }
        if (StringUtils.hasText(notes)) {
            invoice.setNotes(invoice.getNotes() != null ? invoice.getNotes() + " | " + notes : notes);
        }
        Invoice saved = invoiceRepository.save(invoice);

        if (saved.getSubscriptionId() != null) {
            subscriptionRepository.findById(saved.getSubscriptionId()).ifPresent(sub -> {
                sub.setStatus("ACTIVE");
                subscriptionRepository.save(sub);
            });
        }

        TenantInfo tenant = tenantRepository.findById(saved.getTenantId()).orElse(null);
        if (tenant != null && ("PENDING_PAYMENT".equals(tenant.getStatus()) || "FAILED".equals(tenant.getStatus()))) {
            log.info("Auto-provisioning workspace for tenant: {}", tenant.getCode());
            String tempPassword = masterTenantService.provisionPendingTenant(tenant.getId());
            log.info(">>> THÔNG TIN ĐĂNG NHẬP (DÀNH CHO DEV/TEST) <<<");
            log.info(">>> Workspace: {} | Admin Email: {} | Password: {} <<<", tenant.getSubdomain(), tenant.getContactEmail(), tempPassword);
            tenant = tenantRepository.findById(tenant.getId()).orElse(tenant);

            String workspaceUrl = "https://" + tenant.getSubdomain() + "." + baseDomain;
            String emailBody = "Chào mừng bạn đến với SmartHire-AI!\n\n"
                    + "Không gian làm việc doanh nghiệp của bạn đã được kích hoạt thành công.\n"
                    + "Đường dẫn đăng nhập: " + workspaceUrl + "/internal/login\n"
                    + "Tài khoản quản trị: " + tenant.getContactEmail() + "\n"
                    + "Mật khẩu tạm thời: " + tempPassword + "\n\n"
                    + "Vui lòng đăng nhập và đổi mật khẩu trong mục Tài khoản để đảm bảo an toàn.\n"
                    + "Trân trọng,\nĐội ngũ SmartHire-AI";

            try {
                mailSender.send(tenant.getContactEmail(), "Kích hoạt không gian làm việc SmartHire-AI", emailBody);
            } catch (Exception ex) {
                log.warn("Could not deliver workspace activation email to: {}", tenant.getContactEmail());
            }
        }
        return saved;
    }

    @Transactional(transactionManager = "masterTransactionManager")
    public InvoiceResponse approveInvoice(Long id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Hóa đơn không tồn tại", HttpStatus.NOT_FOUND, "INVOICE_NOT_FOUND"));

        if (!"PENDING".equalsIgnoreCase(invoice.getStatus())) {
            throw new BusinessException("Chỉ có thể duyệt hóa đơn ở trạng thái PENDING", HttpStatus.BAD_REQUEST, "INVALID_INVOICE_STATE");
        }

        Invoice saved = completePaidInvoice(id, "BANK_TRANSFER", null, "Manual approval by admin");

        TenantInfo tenant = tenantRepository.findById(saved.getTenantId()).orElse(null);
        SubscriptionPlan plan = null;
        if (saved.getSubscriptionId() != null) {
            TenantSubscription sub = subscriptionRepository.findById(saved.getSubscriptionId()).orElse(null);
            if (sub != null) {
                plan = planRepository.findById(sub.getPlanId()).orElse(null);
            }
        }

        InvoiceResponse response = InvoiceResponse.from(saved, tenant, plan);
        List<InvoiceLineItem> items = invoiceLineItemRepository.findByInvoiceId(saved.getId());
        response.setLineItems(items.stream().map(InvoiceLineItemResponse::from).toList());
        return response;
    }

    private String generateInvoiceNumber() {
        String yearMonth = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        int rand = ThreadLocalRandom.current().nextInt(1000, 9999);
        return "INV-" + yearMonth + "-" + rand;
    }
}
