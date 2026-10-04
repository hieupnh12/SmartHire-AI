package com.smarthire.master.billing.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record InvoiceStatusResponse(
    Long invoiceId,
    String invoiceNumber,
    String status,
    BigDecimal amount,
    String paymentGateway,
    LocalDateTime paidAt,
    String subdomain,
    String tenantStatus
) {}
