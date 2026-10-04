package com.smarthire.master.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MasterEmailPayload {
    private String tenantCode;
    private String toEmail;
    private String subject;
    private String templateName; // Thymeleaf template name e.g., "invoice-created"
    private Map<String, Object> templateVariables; // Variables for Thymeleaf context
    private String notificationType; // INVOICE_CREATED, QUOTA_WARNING, SUBSCRIPTION_EXPIRY
    private byte[] attachmentData; // Optional PDF file bytes
    private String attachmentFilename; // Optional filename e.g. "Thong tin don hang INV-202610-1234.pdf"
}
