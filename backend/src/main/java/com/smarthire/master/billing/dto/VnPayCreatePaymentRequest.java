package com.smarthire.master.billing.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VnPayCreatePaymentRequest {

    @NotNull(message = "ID hóa đơn không được để trống")
    private Long invoiceId;

    /**
     * Optional bank code.
     * "VNBANK" for domestic ATM cards, "NCB", "VIETCOMBANK", etc.
     * If null/blank, VNPay gateway will let the customer pick.
     */
    private String bankCode;

    /**
     * Optional custom return URL. Defaults to application configuration if not specified.
     */
    private String returnUrl;
}
