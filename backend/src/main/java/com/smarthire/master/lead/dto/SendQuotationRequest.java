package com.smarthire.master.lead.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SendQuotationRequest {

    Long consultationRequestId;

    @NotBlank(message = "Tên doanh nghiệp không được để trống")
    String companyName;

    @NotBlank(message = "Tên người nhận báo giá không được để trống")
    String contactName;

    @NotBlank(message = "Email nhận báo giá không được để trống")
    @Email(message = "Email không đúng định dạng")
    String recipientEmail;

    String phoneNumber;

    @NotNull(message = "Vui lòng chọn gói báo giá")
    Long planId;

    // 3 CPQ line items for transparent quotation
    BigDecimal platformFee;
    BigDecimal addonFee;
    BigDecimal discount;

    @NotNull(message = "Tổng giá trị báo giá không được để trống")
    BigDecimal totalQuote;

    String pricingMode; // "TEMPLATE_ADDON" | "FROM_SCRATCH"
    String notes;
}
