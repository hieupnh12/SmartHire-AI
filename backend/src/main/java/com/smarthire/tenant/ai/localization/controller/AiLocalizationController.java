package com.smarthire.tenant.ai.localization.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.ai.localization.dto.AiLocalizationModels.AiLocalizeRequest;
import com.smarthire.tenant.ai.localization.dto.AiLocalizationModels.AiLocalizeResponse;
import com.smarthire.tenant.ai.localization.dto.AiLocalizationModels.AiLocalizationStatus;
import com.smarthire.tenant.ai.localization.service.AiLocalizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.Optional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai")
@Tag(name = "AI Localization", description = "Multi-language progressive localization for AI generated evaluation content")
public class AiLocalizationController {

    private final AiLocalizationService localizationService;

    public AiLocalizationController(AiLocalizationService localizationService) {
        this.localizationService = localizationService;
    }

    @PostMapping("/localize")
    @Operation(summary = "Translate or retrieve cached translation for AI generated content (CV screening, Interview, Assessment)")
    public ApiResponse<AiLocalizeResponse> localize(@Valid @RequestBody AiLocalizeRequest request) {
        AiLocalizeResponse response = localizationService.localize(
                request.entityType(),
                request.entityId(),
                request.targetLocale(),
                request.sourceLocale(),
                request.content());
        return ApiResponse.ok(response);
    }

    @GetMapping("/localize/status")
    @Operation(summary = "Check if localized content exists in cache without triggering AI completion")
    public ApiResponse<AiLocalizationStatus> checkStatus(
            @RequestParam String entityType,
            @RequestParam Long entityId,
            @RequestParam String contentHash,
            @RequestParam String targetLocale) {
        Optional<JsonNode> cached = localizationService.getCached(entityType, entityId, contentHash, targetLocale);
        return ApiResponse.ok(new AiLocalizationStatus(
                entityType,
                entityId,
                targetLocale,
                contentHash,
                cached.isPresent(),
                cached.orElse(null)));
    }
}
