package com.smarthire.master.ai.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.domain.master.entity.SystemSetting;
import com.smarthire.master.ai.dto.AiModelConfigDto;
import com.smarthire.master.ai.dto.AiProviderKeyDto;
import com.smarthire.master.ai.dto.AiTestConnectionRequest;
import com.smarthire.master.ai.dto.AiTestConnectionResponse;
import com.smarthire.master.ai.service.MasterAiConfigService;
import com.smarthire.master.ai.service.SystemSettingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/master")
@Tag(name = "Master AI Engine & System Settings", description = "Platform Administration APIs for Dynamic AI Configuration and System Settings")
public class MasterAiConfigController {

    private final MasterAiConfigService aiConfigService;
    private final SystemSettingService systemSettingService;

    public MasterAiConfigController(
            MasterAiConfigService aiConfigService,
            SystemSettingService systemSettingService) {
        this.aiConfigService = aiConfigService;
        this.systemSettingService = systemSettingService;
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
