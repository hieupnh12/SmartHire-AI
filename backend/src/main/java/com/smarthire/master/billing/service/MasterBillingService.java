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
import com.smarthire.master.billing.dto.CreateInvoiceRequest;
import com.smarthire.master.billing.dto.InvoiceLineItemResponse;
import com.smarthire.master.billing.dto.InvoiceResponse;
import com.smarthire.master.billing.dto.UpdateInvoiceStatusRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
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

    private String generateInvoiceNumber() {
        String yearMonth = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        int rand = ThreadLocalRandom.current().nextInt(1000, 9999);
        return "INV-" + yearMonth + "-" + rand;
    }
}
