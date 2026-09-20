package com.smarthire.master.contract.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateContractRequest {

    @NotNull(message = "Doanh nghiệp (Tenant) không được để trống")
    private Long tenantId;

    private Long planId;

    private Long consultationRequestId;

    @NotBlank(message = "Tiêu đề hợp đồng không được để trống")
    private String title;

    @NotNull(message = "Giá trị hợp đồng không được để trống")
    @DecimalMin(value = "0.0", message = "Giá trị hợp đồng phải lớn hơn hoặc bằng 0")
    private BigDecimal contractValue;

    @Builder.Default
    private String currency = "USD";

    @NotNull(message = "Ngày bắt đầu hiệu lực không được để trống")
    private LocalDate startDate;

    @NotNull(message = "Ngày kết thúc hiệu lực không được để trống")
    private LocalDate endDate;

    // --- BÊN A (Tùy chọn ghi đè nếu cần) ---
    private String partyAName;
    private String partyATaxCode;
    private String partyAAddress;
    private String partyARepresentative;
    private String partyAPosition;
    private String partyAPhone;
    private String partyAEmail;
    private String partyABankName;
    private String partyABankAccount;
    private String partyABankBranch;

    // --- BÊN B (DOANH NGHIỆP KHÁCH HÀNG) ---
    private String partyBName;
    private String partyBTaxCode;
    private String partyBAddress;
    private String partyBRepresentative;
    private String partyBPosition;
    private String partyBPhone;
    private String partyBEmail;
    private String partyBBankAccount;

    // --- THUẾ & GIÁ TRỊ THANH TOÁN ---
    @Builder.Default
    private BigDecimal taxRate = BigDecimal.valueOf(10.00);

    private String termsAndConditions;

    private String notes;
}
