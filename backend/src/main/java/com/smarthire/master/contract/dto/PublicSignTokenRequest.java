package com.smarthire.master.contract.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicSignTokenRequest {

    @NotBlank(message = "Thông tin chứng thư số CA (Serial / Token ID) không được để trống")
    private String tokenSerial;

    private String caProvider; // VNPT-CA, Viettel-CA, FPT-CA, MISA eSign, etc.
    private String signerName;
    private String signerTitle;
    private String notes;
}
