package com.smarthire.domain.master.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_transactions")
@Builder
@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "invoice_id", nullable = false)
    Long invoiceId;

    @Column(name = "tenant_id")
    Long tenantId;

    @Column(name = "transaction_no")
    String transactionNo;

    @Column(name = "txn_ref", nullable = false)
    String txnRef;

    @Builder.Default
    @Column(name = "payment_gateway", nullable = false)
    String paymentGateway = "VNPAY";

    @Column(name = "bank_code")
    String bankCode;

    @Column(name = "bank_tran_no")
    String bankTranNo;

    @Column(name = "card_type")
    String cardType;

    @Column(nullable = false)
    BigDecimal amount;

    @Builder.Default
    @Column(nullable = false)
    String currency = "VND";

    @Column(name = "response_code")
    String responseCode;

    @Builder.Default
    @Column(name = "transaction_status", nullable = false)
    String transactionStatus = "PENDING";

    @Column(name = "order_info")
    String orderInfo;

    @Column(name = "pay_date")
    String payDate;

    @Column(name = "ip_address")
    String ipAddress;

    @Column(name = "raw_response", columnDefinition = "TEXT")
    String rawResponse;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt = LocalDateTime.now();
}
