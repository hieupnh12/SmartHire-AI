package com.smarthire.tenant.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ResetPasswordRequest {

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    @Schema(description = "User account email", example = "candidate@example.com")
    private String email;

    @NotBlank(message = "Mã xác thực OTP không được để trống")
    @Size(min = 6, max = 6, message = "Mã OTP phải có 6 chữ số")
    @Schema(description = "6-digit OTP code received via email", example = "123456")
    private String otp;

    @NotBlank(message = "Mật khẩu mới không được để trống")
    @Size(min = 6, message = "Mật khẩu mới tối thiểu 6 ký tự")
    @Schema(description = "New password", example = "NewSecretPassword123")
    private String newPassword;
}
