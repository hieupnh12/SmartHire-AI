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
public class VnPayPaymentResponse {

    private String paymentUrl;
    private String invoiceNumber;
    private BigDecimal amountVnd;
}
