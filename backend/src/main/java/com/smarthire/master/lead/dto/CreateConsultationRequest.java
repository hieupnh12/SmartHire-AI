package com.smarthire.master.lead.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateConsultationRequest {

    @NotBlank(message = "Tên doanh nghiệp không được để trống")
    @Size(max = 255, message = "Tên doanh nghiệp tối đa 255 ký tự")
    private String companyName;

    @NotBlank(message = "Họ tên người liên hệ không được để trống")
    @Size(max = 255, message = "Họ tên người liên hệ tối đa 255 ký tự")
    private String contactName;

    @Size(max = 255, message = "Chức vụ tối đa 255 ký tự")
    private String jobTitle;

    @NotBlank(message = "Email công vụ không được để trống")
    @Email(message = "Email không đúng định dạng")
    @Size(max = 255, message = "Email tối đa 255 ký tự")
    private String workEmail;

    @Size(max = 64, message = "Số điện thoại tối đa 64 ký tự")
    private String phoneNumber;

    private String companySize;

    @Builder.Default
    private String requestType = "DEMO"; // "DEMO" or "CONTRACT_QUOTE"

    private String planTier;

    private String primaryNeed;

    private String notes;
}
