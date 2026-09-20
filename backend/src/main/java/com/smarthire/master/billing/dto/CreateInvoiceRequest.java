package com.smarthire.master.billing.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateInvoiceRequest {

    @NotNull(message = "tenantId is required")
    private Long tenantId;

    private Long planId;

    @NotNull(message = "amount is required")
    @DecimalMin(value = "0.00", message = "amount must be non-negative")
    private BigDecimal amount;

    private BigDecimal subtotal;
    private BigDecimal taxRate;
    private String currency;
    private LocalDateTime dueDate;
    private LocalDateTime billingPeriodStart;
    private LocalDateTime billingPeriodEnd;
    private String paymentGateway;
    private String notes;
    
    private List<CreateInvoiceLineItemRequest> lineItems;
}
