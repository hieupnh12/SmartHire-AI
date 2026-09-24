package com.smarthire.master.billing.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutResponse {

    private Long invoiceId;
    private String invoiceNumber;
    private Long tenantId;
    private String tenantCode;
    private String subdomain;
    private String planName;
    private String planCode;
    private String billingCycle;
    private BigDecimal amountVnd;
    private String currency;
    private String status;
    private String bankName;
    private String accountNumber;
    private String accountName;
    private String transferSyntax;
    private String qrUrl;
    private LocalDateTime createdAt;
}
