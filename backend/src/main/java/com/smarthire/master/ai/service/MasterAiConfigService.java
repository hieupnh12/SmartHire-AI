package com.smarthire.master.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.config.ai.DynamicAiConfigProvider;
import com.smarthire.domain.master.entity.AiModelConfig;
import com.smarthire.domain.master.entity.AiProviderKey;
import com.smarthire.domain.master.entity.PlatformAuditLog;
import com.smarthire.domain.master.repository.AiModelConfigRepository;
import com.smarthire.domain.master.repository.AiProviderKeyRepository;
import com.smarthire.domain.master.repository.PlatformAuditLogRepository;
import com.smarthire.master.ai.dto.AiModelConfigDto;
import com.smarthire.master.ai.dto.AiProviderKeyDto;
import com.smarthire.master.ai.dto.AiTestConnectionRequest;
import com.smarthire.master.ai.dto.AiTestConnectionResponse;
import com.smarthire.multitenancy.service.TenantCredentialService;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

@Service
public class MasterAiConfigService {

    private static final Logger log = LoggerFactory.getLogger(MasterAiConfigService.class);

    private final AiProviderKeyRepository providerKeyRepository;
    private final AiModelConfigRepository modelConfigRepository;
    private final PlatformAuditLogRepository auditLogRepository;
    private final TenantCredentialService credentialService;
    private final DynamicAiConfigProvider configProvider;
    private final ObjectMapper mapper;
    private final RestClient restClient;

    @Autowired
    public MasterAiConfigService(
            AiProviderKeyRepository providerKeyRepository,
            AiModelConfigRepository modelConfigRepository,
            PlatformAuditLogRepository auditLogRepository,
            TenantCredentialService credentialService,
            DynamicAiConfigProvider configProvider,
            ObjectMapper mapper) {
        this(providerKeyRepository, modelConfigRepository, auditLogRepository, credentialService, configProvider, mapper, createDefaultRestClient());
    }

    public MasterAiConfigService(
            AiProviderKeyRepository providerKeyRepository,
            AiModelConfigRepository modelConfigRepository,
            PlatformAuditLogRepository auditLogRepository,
            TenantCredentialService credentialService,
            DynamicAiConfigProvider configProvider,
            ObjectMapper mapper,
            RestClient restClient) {
        this.providerKeyRepository = providerKeyRepository;
        this.modelConfigRepository = modelConfigRepository;
        this.auditLogRepository = auditLogRepository;
        this.credentialService = credentialService;
        this.configProvider = configProvider;
        this.mapper = mapper;
        this.restClient = restClient;
    }

    private static RestClient createDefaultRestClient() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(6));
        factory.setReadTimeout(Duration.ofSeconds(12));
        return RestClient.builder().requestFactory(factory).build();
    }

    public List<AiProviderKeyDto> getAllProviderKeys() {
        return providerKeyRepository.findAll().stream()
                .map(this::toProviderKeyDto)
                .collect(Collectors.toList());
    }

    @Transactional("masterTransactionManager")
    public AiProviderKeyDto saveProviderKey(AiProviderKeyDto dto, String adminEmail) {
        AiProviderKey entity;
        String provider = dto.getProvider() != null ? dto.getProvider().toUpperCase() : "GEMINI";

        if (dto.getId() != null) {
            entity = providerKeyRepository.findById(dto.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Key not found with id: " + dto.getId()));
            entity.setKeyAlias(dto.getKeyAlias());
            entity.setProvider(provider);
            entity.setEndpointUrl(dto.getEndpointUrl());
            if (dto.getStatus() != null) entity.setStatus(dto.getStatus());
            if (dto.getIsDefault() != null) entity.setIsDefault(dto.getIsDefault());

            if (dto.getApiKey() != null && !dto.getApiKey().isBlank()) {
                entity.setApiKeyEncrypted(credentialService.encrypt("MASTER_AI_KEY", dto.getApiKey().trim()));
            }
        } else {
            if (dto.getApiKey() == null || dto.getApiKey().isBlank()) {
                throw new IllegalArgumentException("API Key is required for new provider key");
            }
            entity = AiProviderKey.builder()
                    .provider(provider)
                    .keyAlias(dto.getKeyAlias() != null ? dto.getKeyAlias() : provider + " Key")
                    .apiKeyEncrypted(credentialService.encrypt("MASTER_AI_KEY", dto.getApiKey().trim()))
                    .endpointUrl(dto.getEndpointUrl())
                    .status(dto.getStatus() != null ? dto.getStatus() : "ACTIVE")
                    .isDefault(Boolean.TRUE.equals(dto.getIsDefault()))
                    .build();
        }

        if (Boolean.TRUE.equals(entity.getIsDefault())) {
            // Unset default on other keys of same provider
            List<AiProviderKey> existing = providerKeyRepository.findByProvider(provider);
            for (AiProviderKey key : existing) {
                if (entity.getId() == null || !key.getId().equals(entity.getId())) {
                    key.setIsDefault(false);
                    providerKeyRepository.save(key);
                }
            }
        }

        AiProviderKey saved = providerKeyRepository.save(entity);
        configProvider.evictAll();

        // Audit Log
        auditLogRepository.save(PlatformAuditLog.builder()
                .action("AI_KEY_SAVED")
                .description("Saved AI key for provider " + provider + " (alias: " + saved.getKeyAlias() + ") by " + adminEmail)
                .build());

        return toProviderKeyDto(saved);
    }

    @Transactional("masterTransactionManager")
    public void deleteProviderKey(Long id, String adminEmail) {
        AiProviderKey key = providerKeyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Key not found with id: " + id));
        providerKeyRepository.delete(key);
        configProvider.evictAll();

        auditLogRepository.save(PlatformAuditLog.builder()
                .action("AI_KEY_DELETED")
                .description("Deleted AI key id: " + id + " (" + key.getKeyAlias() + ") by " + adminEmail)
                .build());
    }

    public List<AiModelConfigDto> getAllTaskConfigs() {
        return modelConfigRepository.findAll().stream()
                .map(this::toModelConfigDto)
                .collect(Collectors.toList());
    }

    @Transactional("masterTransactionManager")
    public AiModelConfigDto updateTaskConfig(String taskType, AiModelConfigDto dto, String adminEmail) {
        String normalizedTask = taskType.toUpperCase();
        AiModelConfig entity = modelConfigRepository.findByTaskType(normalizedTask)
                .orElseGet(() -> AiModelConfig.builder()
                        .taskType(normalizedTask)
                        .taskName(dto.getTaskName() != null ? dto.getTaskName() : normalizedTask)
                        .build());

        if (dto.getTaskName() != null) entity.setTaskName(dto.getTaskName());
        if (dto.getProvider() != null) entity.setProvider(dto.getProvider().toUpperCase());
        if (dto.getModelName() != null) entity.setModelName(dto.getModelName());
        if (dto.getTemperature() != null) entity.setTemperature(dto.getTemperature());
        if (dto.getMaxTokens() != null) entity.setMaxTokens(dto.getMaxTokens());
        if (dto.getTimeoutSeconds() != null) entity.setTimeoutSeconds(dto.getTimeoutSeconds());
        if (dto.getFailoverProvider() != null) entity.setFailoverProvider(dto.getFailoverProvider().toUpperCase());
        if (dto.getFailoverModel() != null) entity.setFailoverModel(dto.getFailoverModel());
        if (dto.getIsActive() != null) entity.setIsActive(dto.getIsActive());

        AiModelConfig saved = modelConfigRepository.save(entity);
        configProvider.evictCache(normalizedTask);

        auditLogRepository.save(PlatformAuditLog.builder()
                .action("AI_MODEL_ROUTING_UPDATED")
                .description("Updated AI task config for " + normalizedTask + " to model " + saved.getModelName() + " by " + adminEmail)
                .build());

        return toModelConfigDto(saved);
    }

    public AiTestConnectionResponse testConnection(AiTestConnectionRequest request) {
        String provider = request.getProvider() != null && !request.getProvider().isBlank()
                ? request.getProvider().trim().toUpperCase()
                : null;
        String apiKey = request.getApiKey();
        String endpointUrl = request.getEndpointUrl();

        if (request.getKeyId() != null) {
            Optional<AiProviderKey> keyOpt = providerKeyRepository.findById(request.getKeyId());
            if (keyOpt.isPresent()) {
                AiProviderKey k = keyOpt.get();
                if (apiKey == null || apiKey.isBlank()) {
                    apiKey = credentialService.decrypt("MASTER_AI_KEY", k.getApiKeyEncrypted());
                }
                if (provider == null) {
                    provider = k.getProvider() != null ? k.getProvider().trim().toUpperCase() : null;
                }
                if (endpointUrl == null || endpointUrl.isBlank()) {
                    endpointUrl = k.getEndpointUrl();
                }
            }
        }

        if (provider == null || provider.isBlank()) {
            provider = "GEMINI";
        }

        if (apiKey == null || apiKey.isBlank()) {
            apiKey = configProvider.resolveApiKeyForProvider(provider);
        }

        if (apiKey == null || apiKey.isBlank()) {
            return AiTestConnectionResponse.builder()
                    .success(false)
                    .message("Không tìm thấy API Key để kiểm tra kết nối.")
                    .build();
        }

        String defaultModel = switch (provider) {
            case "OPENAI" -> "o3-mini";
            case "DEEPSEEK" -> "deepseek-chat";
            case "ANTHROPIC" -> "claude-3-5-haiku-20241022";
            case "HUGGINGFACE" -> "Qwen/Qwen2.5-7B-Instruct";
            default -> "gemini-3.6-flash";
        };

        String model = request.getModelName() != null && !request.getModelName().isBlank()
                ? request.getModelName().trim()
                : defaultModel;

        long start = System.currentTimeMillis();

        try {
            if ("OPENAI".equalsIgnoreCase(provider) || "DEEPSEEK".equalsIgnoreCase(provider) || "HUGGINGFACE".equalsIgnoreCase(provider)) {
                String defaultEndpoint = switch (provider) {
                    case "OPENAI" -> "https://api.openai.com/v1/chat/completions";
                    case "DEEPSEEK" -> "https://api.deepseek.com/chat/completions";
                    default -> "https://router.huggingface.co/hf-inference/models/" + model + "/v1/chat/completions";
                };

                String targetUrl = (endpointUrl != null && !endpointUrl.isBlank())
                        ? endpointUrl.trim()
                        : defaultEndpoint;

                String body = """
                        {"model":"%s","messages":[{"role":"user","content":"ping"}],"max_tokens":5}
                        """.formatted(model);

                restClient.post()
                        .uri(targetUrl)
                        .header("Authorization", "Bearer " + apiKey.trim())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(String.class);

                long latency = System.currentTimeMillis() - start;
                updateKeyLastTested(request.getKeyId(), true);
                return AiTestConnectionResponse.builder()
                        .success(true)
                        .message("Kết nối thành công đến " + provider + "!")
                        .latencyMs(latency)
                        .modelVersion(provider.toLowerCase() + ":" + model)
                        .build();

            } else if ("ANTHROPIC".equalsIgnoreCase(provider)) {
                String defaultEndpoint = "https://api.anthropic.com/v1/messages";
                String targetUrl = (endpointUrl != null && !endpointUrl.isBlank())
                        ? endpointUrl.trim()
                        : defaultEndpoint;

                String body = """
                        {"model":"%s","max_tokens":10,"messages":[{"role":"user","content":"ping"}]}
                        """.formatted(model);

                restClient.post()
                        .uri(targetUrl)
                        .header("x-api-key", apiKey.trim())
                        .header("anthropic-version", "2023-06-01")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(String.class);

                long latency = System.currentTimeMillis() - start;
                updateKeyLastTested(request.getKeyId(), true);
                return AiTestConnectionResponse.builder()
                        .success(true)
                        .message("Kết nối thành công đến Anthropic Claude!")
                        .latencyMs(latency)
                        .modelVersion("anthropic:" + model)
                        .build();

            } else {
                // Default: Google Gemini
                String body = """
                        {"contents":[{"parts":[{"text":"ping"}]}]}
                        """;

                String defaultUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey.trim();
                String targetUrl;
                if (endpointUrl != null && !endpointUrl.isBlank()) {
                    String base = endpointUrl.trim();
                    if (!base.contains(":generateContent") && !base.contains("/v1beta/models/")) {
                        base = base.replaceAll("/+$", "") + "/v1beta/models/" + model + ":generateContent";
                    }
                    targetUrl = base.contains("?") ? base + "&key=" + apiKey.trim() : base + "?key=" + apiKey.trim();
                } else {
                    targetUrl = defaultUrl;
                }

                restClient.post()
                        .uri(targetUrl)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(String.class);

                long latency = System.currentTimeMillis() - start;
                updateKeyLastTested(request.getKeyId(), true);
                return AiTestConnectionResponse.builder()
                        .success(true)
                        .message("Kết nối thành công đến Google Gemini!")
                        .latencyMs(latency)
                        .modelVersion("gemini:" + model)
                        .build();
            }
        } catch (Exception ex) {
            long latency = System.currentTimeMillis() - start;
            log.error("AI test connection failed for provider {}: {}", provider, ex.getMessage());
            updateKeyLastTested(request.getKeyId(), false);
            return AiTestConnectionResponse.builder()
                    .success(false)
                    .message("Kết nối thất bại: " + ex.getMessage())
                    .latencyMs(latency)
                    .build();
        }
    }

    private void updateKeyLastTested(Long keyId, boolean success) {
        if (keyId != null) {
            providerKeyRepository.findById(keyId).ifPresent(key -> {
                key.setLastTestedAt(LocalDateTime.now());
                if (!success) {
                    key.setStatus("RATE_LIMITED_OR_INVALID");
                } else if ("RATE_LIMITED_OR_INVALID".equals(key.getStatus())) {
                    key.setStatus("ACTIVE");
                }
                providerKeyRepository.save(key);
            });
        }
    }

    private AiProviderKeyDto toProviderKeyDto(AiProviderKey entity) {
        String masked = maskKey(entity.getApiKeyEncrypted() != null ? "CONFIGURED" : "");
        try {
            String decrypted = credentialService.decrypt("MASTER_AI_KEY", entity.getApiKeyEncrypted());
            masked = maskKey(decrypted);
        } catch (Exception ignored) {}

        return AiProviderKeyDto.builder()
                .id(entity.getId())
                .provider(entity.getProvider())
                .keyAlias(entity.getKeyAlias())
                .maskedKey(masked)
                .endpointUrl(entity.getEndpointUrl())
                .status(entity.getStatus())
                .isDefault(entity.getIsDefault())
                .lastTestedAt(entity.getLastTestedAt())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    private AiModelConfigDto toModelConfigDto(AiModelConfig entity) {
        return AiModelConfigDto.builder()
                .id(entity.getId())
                .taskType(entity.getTaskType())
                .taskName(entity.getTaskName())
                .provider(entity.getProvider())
                .modelName(entity.getModelName())
                .temperature(entity.getTemperature())
                .maxTokens(entity.getMaxTokens())
                .timeoutSeconds(entity.getTimeoutSeconds())
                .failoverProvider(entity.getFailoverProvider())
                .failoverModel(entity.getFailoverModel())
                .isActive(entity.getIsActive())
                .build();
    }

    private String maskKey(String raw) {
        if (raw == null || raw.length() < 8) return "••••••••";
        if (raw.length() <= 12) return raw.substring(0, 3) + "••••" + raw.substring(raw.length() - 2);
        return raw.substring(0, 6) + "••••••••" + raw.substring(raw.length() - 4);
    }
}
