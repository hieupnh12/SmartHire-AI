package com.smarthire.tenant.company.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaveCompanyEmailSettingRequest {

    @NotBlank(message = "Địa chỉ Gmail không được để trống")
    @Email(message = "Địa chỉ Gmail không hợp lệ")
    private String mailUsername;

    private String mailPassword;

    private String fromName;

    @Builder.Default
    private Boolean isActive = true;
}
