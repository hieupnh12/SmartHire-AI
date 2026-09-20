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
    public String getSignMethod() { return signMethod; }
    public void setSignMethod(String signMethod) { this.signMethod = signMethod; }
    public String getSignatureData() { return signatureData; }
    public void setSignatureData(String signatureData) { this.signatureData = signatureData; }
    public String getSignedDocumentUrl() { return signedDocumentUrl; }
    public void setSignedDocumentUrl(String signedDocumentUrl) { this.signedDocumentUrl = signedDocumentUrl; }
    public String getDocumentChecksum() { return documentChecksum; }
    public void setDocumentChecksum(String documentChecksum) { this.documentChecksum = documentChecksum; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public boolean isAutoCreateInvoice() { return autoCreateInvoice; }
    public void setAutoCreateInvoice(boolean autoCreateInvoice) { this.autoCreateInvoice = autoCreateInvoice; }
}
