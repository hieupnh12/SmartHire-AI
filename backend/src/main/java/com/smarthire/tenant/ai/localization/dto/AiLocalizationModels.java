package com.smarthire.tenant.ai.localization.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public final class AiLocalizationModels {
    private AiLocalizationModels() {}

    public record AiLocalizeRequest(
            @NotBlank String entityType,
            @NotNull Long entityId,
            @NotBlank String targetLocale,
            String sourceLocale,
            @NotNull JsonNode content) {}

    public record AiLocalizeResponse(
            String entityType,
            Long entityId,
            String locale,
            String sourceLocale,
            String contentHash,
            JsonNode localizedContent,
            boolean cached) {}

    public record AiLocalizationStatus(
            String entityType,
            Long entityId,
            String locale,
            String contentHash,
            boolean available,
            JsonNode localizedContent) {}
}

