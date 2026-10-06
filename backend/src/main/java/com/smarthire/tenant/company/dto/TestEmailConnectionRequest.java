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
public class TestEmailConnectionRequest {

    @NotBlank(message = "Địa chỉ Gmail gửi không được để trống")
    @Email(message = "Địa chỉ Gmail gửi không hợp lệ")
    private String mailUsername;

    private String mailPassword;

    private String fromName;

    @NotBlank(message = "Email người nhận thử nghiệm không được để trống")
    @Email(message = "Email người nhận thử nghiệm không hợp lệ")
    private String testRecipientEmail;
}
