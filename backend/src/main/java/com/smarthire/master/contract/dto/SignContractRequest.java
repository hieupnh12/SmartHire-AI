package com.smarthire.master.contract.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignContractRequest {

    @NotBlank(message = "Phương thức ký không được để trống")
    private String signMethod; // DIGITAL_TOKEN_CA, E_SIGN_ONLINE, UPLOAD_SIGNED_PDF, MANUAL

    private String signatureData; // Base64 signature / certificate info / token serial

    private String signedDocumentUrl; // Path to signed PDF if uploaded

    private String documentChecksum; // SHA-256 hash of signed file

    private String notes;

    @Builder.Default
    private boolean autoCreateInvoice = true; // Auto generate B2B Invoice when signed
   
}
