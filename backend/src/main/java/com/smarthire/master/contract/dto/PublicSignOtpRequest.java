package com.smarthire.master.contract.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicSignOtpRequest {

    @NotBlank(message = "Mã OTP xác thực không được để trống")
    private String otpCode;

    private String signerName;
    private String signerTitle;
    private String signatureData;
    private String notes;
}
