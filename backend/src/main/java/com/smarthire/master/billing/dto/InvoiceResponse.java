package com.smarthire.master.billing.dto;

import com.smarthire.domain.master.entity.Invoice;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantInfo;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class InvoiceResponse {
    private Long id;
    private String invoiceNumber;
    private Long tenantId;
    private String tenantName;
    private String tenantCode;
    private String tenantSubdomain;
    private Long subscriptionId;
    private String planName;
    private String planCode;
    private BigDecimal amount;
    private BigDecimal subtotal;
    private BigDecimal taxRate;
    private String currency;
    private String status;
    private LocalDateTime dueDate;
    private LocalDateTime billingPeriodStart;
    private LocalDateTime billingPeriodEnd;
    private String paymentGateway;
    private String paymentProofUrl;
    private String billingTaxCode;
    private String billingLegalName;
    private String billingAddress;
    private String transactionId;
    private LocalDateTime paidAt;
    private String notes;
    private LocalDateTime createdAt;
    private List<InvoiceLineItemResponse> lineItems;

    public static InvoiceResponse from(Invoice invoice, TenantInfo tenant, SubscriptionPlan plan) {
        return InvoiceResponse.builder()
                .id(invoice.getId())
                .invoiceNumber(invoice.getInvoiceNumber())
                .tenantId(invoice.getTenantId())
                .tenantName(tenant != null ? tenant.getName() : null)
                .tenantCode(tenant != null ? tenant.getCode() : null)
                .tenantSubdomain(tenant != null ? tenant.getSubdomain() : null)
                .subscriptionId(invoice.getSubscriptionId())
                .planName(plan != null ? plan.getName() : null)
                .planCode(plan != null ? plan.getCode() : null)
                .amount(invoice.getAmount())
                .subtotal(invoice.getSubtotal())
                .taxRate(invoice.getTaxRate())
                .currency(invoice.getCurrency())
                .status(invoice.getStatus())
                .dueDate(invoice.getDueDate())
                .billingPeriodStart(invoice.getBillingPeriodStart())
                .billingPeriodEnd(invoice.getBillingPeriodEnd())
                .paymentGateway(invoice.getPaymentGateway())
                .paymentProofUrl(invoice.getPaymentProofUrl())
                .billingTaxCode(invoice.getBillingTaxCode() != null ? invoice.getBillingTaxCode() : (tenant != null ? tenant.getTaxCode() : null))
                .billingLegalName(invoice.getBillingLegalName() != null ? invoice.getBillingLegalName() : (tenant != null ? tenant.getCompanyLegalName() : null))
                .billingAddress(invoice.getBillingAddress() != null ? invoice.getBillingAddress() : (tenant != null ? tenant.getBillingAddress() : null))
                .transactionId(invoice.getTransactionId())
                .paidAt(invoice.getPaidAt())
                .notes(invoice.getNotes())
                .createdAt(invoice.getCreatedAt())
                .lineItems(java.util.Collections.emptyList()) // Default empty, populated in service
                .build();
    }
}
