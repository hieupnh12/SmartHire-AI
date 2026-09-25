package com.smarthire.master.billing.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutRequest {

    @NotBlank(message = "Mã gói cước không được để trống")
    private String planCode;

    @NotBlank(message = "Chu kỳ thanh toán không được để trống")
    @Pattern(regexp = "MONTHLY|YEARLY", message = "Chu kỳ thanh toán phải là MONTHLY hoặc YEARLY")
    private String billingCycle;

    @NotBlank(message = "Tên không gian làm việc không được để trống")
    @Size(max = 255)
    private String workspaceName;

    @NotBlank(message = "Subdomain không được để trống")
    @Pattern(regexp = "[a-z][a-z0-9-]{1,61}[a-z0-9]", message = "Subdomain chỉ chứa chữ thường, số, dấu gạch ngang (3-63 ký tự)")
    private String subdomain;

    @NotBlank(message = "Họ tên người quản trị không được để trống")
    @Size(max = 255)
    private String adminFullName;

    @NotBlank(message = "Email người quản trị không được để trống")
    @Email(message = "Email không hợp lệ")
    @Size(max = 255)
    private String adminEmail;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Size(max = 32)
    private String adminPhone;

    @Size(max = 50)
    private String taxCode;

    @Size(max = 255)
    private String companyLegalName;

    @Size(max = 512)
    private String billingAddress;

    private String notes;
}
