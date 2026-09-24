package com.smarthire.domain.master.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "invoices")
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "invoice_number", unique = true)
    String invoiceNumber;

    @Column(name = "tenant_id", nullable = false)
    Long tenantId;

    @Column(name = "subscription_id")
    Long subscriptionId;

    BigDecimal amount;

    BigDecimal subtotal;

    @Builder.Default
    @Column(name = "tax_rate")
    BigDecimal taxRate = BigDecimal.ZERO;

    @Builder.Default
    String currency = "USD";

    @Builder.Default
    String status = "PENDING";

    @Column(name = "due_date")
    LocalDateTime dueDate;

    @Column(name = "billing_period_start")
    LocalDateTime billingPeriodStart;

    @Column(name = "billing_period_end")
    LocalDateTime billingPeriodEnd;

    @Column(name = "payment_gateway")
    String paymentGateway;

    @Column(name = "payment_proof_url", length = 512)
    String paymentProofUrl;

    @Column(name = "billing_tax_code", length = 50)
    String billingTaxCode;

    @Column(name = "billing_legal_name", length = 255)
    String billingLegalName;

    @Column(name = "billing_address", length = 512)
    String billingAddress;

    @Column(name = "transaction_id")
    String transactionId;

    @Column(name = "paid_at")
    LocalDateTime paidAt;

    @Column(columnDefinition = "TEXT")
    String notes;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt = LocalDateTime.now();
}
