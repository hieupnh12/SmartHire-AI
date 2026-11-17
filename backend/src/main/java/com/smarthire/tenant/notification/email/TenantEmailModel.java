package com.smarthire.tenant.notification.email;

import java.util.List;
import lombok.Builder;

@Builder
public record TenantEmailModel(
        String brand,
        String logoUrl,
        String title,
        String badgeText,
        String badgeColor, // e.g., "blue", "green", "amber", "red", "purple"
        String recipientName,
        String headline,
        List<String> paragraphs,
        List<DetailRow> details,
        String highlightBoxTitle,
        String highlightBoxValue,
        String highlightBoxNote,
        String ctaLabel,
        String ctaUrl,
        String securityNote,
        String rawLinkPrompt,
        String supportEmail,
        String supportHotline
) {
    public record DetailRow(String label, String value) {}
}

