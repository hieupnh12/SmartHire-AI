package com.smarthire.master.billing.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VnPayVerifyReturnResponse {

    private boolean success;
    private String responseCode;
    private String message;
    private String invoiceNumber;
    private Long tenantId;
    private String subdomain;
    private String workspaceName;
    private String contactEmail;
    private BigDecimal amountVnd;
    private String transactionNo;
    private String bankCode;
    private String payDate;
}
