package com.smarthire.master.billing.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UpdateInvoiceStatusRequest {

    @NotBlank(message = "status is required")
    private String status;

    private String paymentGateway;
    private String transactionId;
    private LocalDateTime paidAt;
    private String notes;
}
