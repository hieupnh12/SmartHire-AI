package com.smarthire.master.ai.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.config.ai.AiRateLimiterService;
import com.smarthire.domain.master.entity.SystemSetting;
import com.smarthire.master.ai.dto.AiModelConfigDto;
import com.smarthire.master.ai.dto.AiProviderKeyDto;
import com.smarthire.master.ai.dto.AiRateLimitConfigDto;
import com.smarthire.master.ai.dto.AiTestConnectionRequest;
import com.smarthire.master.ai.dto.AiTestConnectionResponse;
import com.smarthire.master.ai.dto.AiUsageReportDto;
import com.smarthire.master.ai.dto.TenantAiQuotaDto;
import com.smarthire.master.ai.dto.TenantAiQuotaUpdateRequest;
import com.smarthire.master.ai.service.MasterAiConfigService;
import com.smarthire.master.ai.service.MasterAiUsageAndQuotaService;
import com.smarthire.master.ai.service.SystemSettingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/master")
@Tag(name = "Master AI Engine & System Settings", description = "Platform Administration APIs for Dynamic AI Configuration and System Settings")
public class MasterAiConfigController {

    private final MasterAiConfigService aiConfigService;
    private final SystemSettingService systemSettingService;
    private MasterAiUsageAndQuotaService usageAndQuotaService;
    private AiRateLimiterService rateLimiterService;

    public MasterAiConfigController(
            MasterAiConfigService aiConfigService,
            SystemSettingService systemSettingService) {
        this.aiConfigService = aiConfigService;
        this.systemSettingService = systemSettingService;
    }

    @Autowired(required = false)
    public void setUsageAndQuotaService(MasterAiUsageAndQuotaService usageAndQuotaService) {
        this.usageAndQuotaService = usageAndQuotaService;
    }

    @Autowired(required = false)
    public void setRateLimiterService(AiRateLimiterService rateLimiterService) {
        this.rateLimiterService = rateLimiterService;
    }

    // --- AI USAGE METERING & TENANT QUOTAS ---

    @GetMapping("/ai/usage-report")
    @Operation(summary = "Get platform AI usage & cost report", description = "Returns aggregated AI requests, token consumption, estimated USD cost, monthly trend, and per-tenant breakdown.")
    public ResponseEntity<ApiResponse<AiUsageReportDto>> getAiUsageReport(
            @RequestParam(defaultValue = "6") int months) {
        AiUsageReportDto report = usageAndQuotaService.getUsageReport(months);
        return ResponseEntity.ok(ApiResponse.ok("AI usage report fetched successfully", report));
    }

    @GetMapping("/ai/quotas")
    @Operation(summary = "Get tenant AI quotas and current month consumption", description = "Returns all tenants with their effective AI CV parse and interview hour quotas, usage, and kill-switch status.")
    public ResponseEntity<ApiResponse<List<TenantAiQuotaDto>>> getTenantAiQuotas() {
        List<TenantAiQuotaDto> quotas = usageAndQuotaService.getTenantAiQuotas();
        return ResponseEntity.ok(ApiResponse.ok("Tenant AI quotas fetched successfully", quotas));
    }

    @PutMapping("/ai/quotas/{tenantId}")
    @Operation(summary = "Override tenant AI quota or toggle AI Kill Switch", description = "Updates snapshot AI quotas for a specific tenant and evicts Redis quota cache immediately.")
    public ResponseEntity<ApiResponse<TenantAiQuotaDto>> updateTenantAiQuota(
            @PathVariable Long tenantId,
            @RequestBody TenantAiQuotaUpdateRequest request,
            Principal principal) {
        String adminEmail = principal != null ? principal.getName() : "platform_admin";
        TenantAiQuotaDto updated = usageAndQuotaService.updateTenantAiQuota(tenantId, request, adminEmail);
        return ResponseEntity.ok(ApiResponse.ok("Tenant AI quota updated successfully", updated));
    }

    // --- AI SHORT-TERM RATE LIMITING (RPM / TPM) ---

    @GetMapping("/ai/rate-limit")
    @Operation(summary = "Get platform AI short-term rate limiting config (RPM/TPM)", description = "Returns default per-tenant RPM and TPM thresholds and per-tenant custom overrides.")
    public ResponseEntity<ApiResponse<AiRateLimitConfigDto>> getAiRateLimitConfig() {
        AiRateLimitConfigDto config = rateLimiterService != null
                ? rateLimiterService.getRateLimitConfig()
                : new AiRateLimitConfigDto();
        return ResponseEntity.ok(ApiResponse.ok("AI rate limit configuration fetched successfully", config));
    }

    @PutMapping("/ai/rate-limit")
    @Operation(summary = "Update platform AI short-term rate limiting config (RPM/TPM)", description = "Updates default per-tenant RPM/TPM thresholds in Master DB and evicts Redis cache immediately.")
    public ResponseEntity<ApiResponse<AiRateLimitConfigDto>> updateAiRateLimitConfig(
            @RequestBody AiRateLimitConfigDto request,
            Principal principal) {
        String adminEmail = principal != null ? principal.getName() : "platform_admin";
        AiRateLimitConfigDto updated = rateLimiterService.updateRateLimitConfig(request, adminEmail);
        return ResponseEntity.ok(ApiResponse.ok("AI rate limit configuration updated successfully", updated));
    }

    // --- AI PROVIDER KEYS ---

    @GetMapping("/ai/keys")
    @Operation(summary = "Get all configured AI provider keys", description = "Returns all AI keys with masked API keys.")
    public ResponseEntity<ApiResponse<List<AiProviderKeyDto>>> getProviderKeys() {
        List<AiProviderKeyDto> keys = aiConfigService.getAllProviderKeys();
        return ResponseEntity.ok(ApiResponse.ok("AI provider keys fetched successfully", keys));
    }

    @PostMapping("/ai/keys")
    @Operation(summary = "Save or update AI provider key", description = "Encrypts API key with AES-256 and syncs Redis cache.")
    public ResponseEntity<ApiResponse<AiProviderKeyDto>> saveProviderKey(
            @RequestBody AiProviderKeyDto request,
            Principal principal) {
        String adminEmail = principal != null ? principal.getName() : "platform_admin";
        AiProviderKeyDto saved = aiConfigService.saveProviderKey(request, adminEmail);
        return ResponseEntity.ok(ApiResponse.ok("AI provider key saved successfully", saved));
    }

    @DeleteMapping("/ai/keys/{id}")
    @Operation(summary = "Delete an AI provider key", description = "Deletes provider key and evicts cache.")
    public ResponseEntity<ApiResponse<Void>> deleteProviderKey(
            @PathVariable Long id,
            Principal principal) {
        String adminEmail = principal != null ? principal.getName() : "platform_admin";
        aiConfigService.deleteProviderKey(id, adminEmail);
        return ResponseEntity.ok(ApiResponse.ok("AI provider key deleted successfully", null));
    }

    // --- AI TASK MODEL CONFIGURATIONS ---

    @GetMapping("/ai/tasks")
    @Operation(summary = "Get all task model configurations", description = "Returns dynamic model assignments for CV, Interview, Assessment, Matching.")
    public ResponseEntity<ApiResponse<List<AiModelConfigDto>>> getTaskConfigs() {
        List<AiModelConfigDto> configs = aiConfigService.getAllTaskConfigs();
        return ResponseEntity.ok(ApiResponse.ok("AI task configs fetched successfully", configs));
    }

    @PutMapping("/ai/tasks/{taskType}")
    @Operation(summary = "Update AI task model routing", description = "Updates model, temperature, timeout for a task type with zero downtime.")
    public ResponseEntity<ApiResponse<AiModelConfigDto>> updateTaskConfig(
            @PathVariable String taskType,
            @RequestBody AiModelConfigDto request,
            Principal principal) {
        String adminEmail = principal != null ? principal.getName() : "platform_admin";
        AiModelConfigDto updated = aiConfigService.updateTaskConfig(taskType, request, adminEmail);
        return ResponseEntity.ok(ApiResponse.ok("AI task config updated successfully", updated));
    }

    // --- TEST CONNECTION ---

    @PostMapping("/ai/test-connection")
    @Operation(summary = "Live test AI connection", description = "Pings provider (Gemini/OpenAI) to verify key & model latency.")
    public ResponseEntity<ApiResponse<AiTestConnectionResponse>> testConnection(
            @RequestBody AiTestConnectionRequest request) {
        AiTestConnectionResponse response = aiConfigService.testConnection(request);
        return ResponseEntity.ok(ApiResponse.ok(
                response.getSuccess() ? "Test connection successful" : "Test connection failed",
                response));
    }

    // --- AI MODEL PRICING TABLE ---

    @GetMapping("/ai/pricings")
    @Operation(summary = "Get all AI model pricing entries", description = "Returns input/output USD prices per 1M tokens for all configured AI models.")
    public ResponseEntity<ApiResponse<List<com.smarthire.master.ai.dto.AiModelPricingDto>>> getModelPricings() {
        List<com.smarthire.master.ai.dto.AiModelPricingDto> pricings = aiConfigService.getAllModelPricings();
        return ResponseEntity.ok(ApiResponse.ok("AI model pricings fetched successfully", pricings));
    }

    @PostMapping("/ai/pricings")
    @Operation(summary = "Create or update an AI model pricing entry", description = "Saves input and output USD price per 1M tokens for a provider and model.")
    public ResponseEntity<ApiResponse<com.smarthire.master.ai.dto.AiModelPricingDto>> saveModelPricing(
            @RequestBody com.smarthire.master.ai.dto.AiModelPricingDto request,
            Principal principal) {
        String adminEmail = principal != null ? principal.getName() : "platform_admin";
        com.smarthire.master.ai.dto.AiModelPricingDto saved = aiConfigService.saveModelPricing(request, adminEmail);
        return ResponseEntity.ok(ApiResponse.ok("AI model pricing saved successfully", saved));
    }

    @DeleteMapping("/ai/pricings/{id}")
    @Operation(summary = "Delete an AI model pricing entry")
    public ResponseEntity<ApiResponse<Void>> deleteModelPricing(
            @PathVariable Long id,
            Principal principal) {
        String adminEmail = principal != null ? principal.getName() : "platform_admin";
        aiConfigService.deleteModelPricing(id, adminEmail);
        return ResponseEntity.ok(ApiResponse.ok("AI model pricing deleted successfully", null));
    }

    // --- GENERAL SYSTEM SETTINGS ---

    @GetMapping("/system/settings")
    @Operation(summary = "Get system settings", description = "Returns platform system settings by category.")
    public ResponseEntity<ApiResponse<List<SystemSetting>>> getSystemSettings(
            @RequestParam(required = false) String category) {
        List<SystemSetting> settings = systemSettingService.getAllSettings(category);
        return ResponseEntity.ok(ApiResponse.ok("System settings fetched successfully", settings));
    }

    @PostMapping("/system/settings")
    @Operation(summary = "Save or update system setting")
    public ResponseEntity<ApiResponse<SystemSetting>> saveSystemSetting(
            @RequestBody Map<String, Object> body,
            Principal principal) {
        String adminEmail = principal != null ? principal.getName() : "platform_admin";
        String key = (String) body.get("key");
        String value = (String) body.get("value");
        String category = (String) body.get("category");
        String description = (String) body.get("description");
        boolean encrypt = Boolean.TRUE.equals(body.get("isEncrypted"));

        SystemSetting saved = systemSettingService.saveSetting(key, value, category, description, encrypt, adminEmail);
        return ResponseEntity.ok(ApiResponse.ok("System setting saved successfully", saved));
    }
}
