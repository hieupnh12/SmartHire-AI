package com.smarthire.master.billing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PayPalVerifyReturnRequest {
    @NotNull(message = "Invoice ID is required")
    private Long invoiceId;
    
    @NotBlank(message = "PayPal Order ID is required")
    private String orderId;
}
