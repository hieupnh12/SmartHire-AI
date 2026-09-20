package com.smarthire.domain.master.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "invoices")
public class Invoice {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @Column(name = "tenant_id", nullable = false) Long tenantId;
    @Column(name = "subscription_id") Long subscriptionId;

    BigDecimal amount;

    @Builder.Default String currency = "USD";
    @Builder.Default String status = "PENDING";

    @Column(name = "payment_gateway") String paymentGateway;
    @Column(name = "transaction_id") String transactionId;
    @Column(name = "paid_at") LocalDateTime paidAt;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt = LocalDateTime.now();
}
