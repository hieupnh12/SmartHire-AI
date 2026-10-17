package com.smarthire.master.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.config.ai.DynamicAiConfigProvider;
import com.smarthire.domain.master.entity.AiModelConfig;
import com.smarthire.domain.master.entity.AiModelPricing;
import com.smarthire.domain.master.entity.AiProviderKey;
import com.smarthire.domain.master.entity.PlatformAuditLog;
import com.smarthire.domain.master.repository.AiModelConfigRepository;
import com.smarthire.domain.master.repository.AiModelPricingRepository;
import com.smarthire.domain.master.repository.AiProviderKeyRepository;
import com.smarthire.domain.master.repository.PlatformAuditLogRepository;
import com.smarthire.master.ai.dto.AiFallbackStep;
import com.smarthire.master.ai.dto.AiModelConfigDto;
import com.smarthire.master.ai.dto.AiModelPricingDto;
import com.smarthire.master.ai.dto.AiProviderKeyDto;
import com.smarthire.master.ai.dto.AiTestConnectionRequest;
import com.smarthire.master.ai.dto.AiTestConnectionResponse;
import com.smarthire.multitenancy.service.TenantCredentialService;
import java.math.BigDecimal;
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
    private AiModelPricingRepository modelPricingRepository;

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

    @Autowired(required = false)
    public void setModelPricingRepository(AiModelPricingRepository modelPricingRepository) {
        this.modelPricingRepository = modelPricingRepository;
    }

    private static RestClient createDefaultRestClient() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(6));
        factory.setReadTimeout(Duration.ofSeconds(12));
        return RestClient.builder().requestFactory(factory).build();
    }

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
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
            if (dto.getKeyAlias() != null && !dto.getKeyAlias().isBlank()) {
                entity.setKeyAlias(dto.getKeyAlias().trim());
            }
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
                    .keyAlias(dto.getKeyAlias() != null && !dto.getKeyAlias().isBlank() ? dto.getKeyAlias().trim() : provider + " Key")
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
        try {
            auditLogRepository.save(PlatformAuditLog.builder()
                    .action("AI_KEY_SAVED")
                    .description("Saved AI key for provider " + provider + " (alias: " + saved.getKeyAlias() + ") by " + adminEmail)
                    .build());
        } catch (Exception ex) {
            log.warn("Failed to write audit log for saveProviderKey: {}", ex.getMessage());
        }

        return toProviderKeyDto(saved);
    }

    @Transactional("masterTransactionManager")
    public void deleteProviderKey(Long id, String adminEmail) {
        AiProviderKey key = providerKeyRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Key not found with id: " + id));
        providerKeyRepository.delete(key);
        configProvider.evictAll();

        try {
            auditLogRepository.save(PlatformAuditLog.builder()
                    .action("AI_KEY_DELETED")
                    .description("Deleted AI key id: " + id + " (" + key.getKeyAlias() + ") by " + adminEmail)
                    .build());
        } catch (Exception ex) {
            log.warn("Failed to write audit log for deleteProviderKey: {}", ex.getMessage());
        }
    }

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
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
        if (dto.getFallbackChain() != null) {
            entity.setFallbackChain(dto.getFallbackChain());
        } else if (dto.getFallbackSteps() != null) {
            try {
                entity.setFallbackChain(mapper.writeValueAsString(dto.getFallbackSteps()));
            } catch (Exception ignored) {}
        }
        if (dto.getIsActive() != null) entity.setIsActive(dto.getIsActive());

        AiModelConfig saved = modelConfigRepository.save(entity);
        configProvider.evictCache(normalizedTask);

        try {
            auditLogRepository.save(PlatformAuditLog.builder()
                    .action("AI_MODEL_ROUTING_UPDATED")
                    .description("Updated AI task config for " + normalizedTask + " to model " + saved.getModelName() + " by " + adminEmail)
                    .build());
        } catch (Exception ex) {
            log.warn("Failed to write audit log for updateTaskConfig: {}", ex.getMessage());
        }

        return toModelConfigDto(saved);
    }

    @Transactional("masterTransactionManager")
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
            case "OPENAI" -> "gpt-4o-mini";
            case "DEEPSEEK" -> "deepseek-chat";
            case "ANTHROPIC" -> "claude-3-5-haiku-20241022";
            case "CURSOR", "CUSTOM" -> "default";
            case "OPENROUTER" -> "meta-llama/llama-3.3-70b-instruct";
            case "GROQ" -> "qwen/qwen3.8-27b";
            case "MISTRAL" -> "mistral-small-latest";
            case "XAI" -> "grok-2-latest";
            case "PERPLEXITY" -> "sonar";
            case "OLLAMA" -> "llama3.2";
            case "HUGGINGFACE" -> "Qwen/Qwen2.5-7B-Instruct";
            default -> "gemini-3.5-flash-lite";
        };

        String model = request.getModelName() != null && !request.getModelName().isBlank()
                ? request.getModelName().trim()
                : defaultModel;

        if ("GROQ".equalsIgnoreCase(provider) && ("llama-3.3-70b-versatile".equalsIgnoreCase(model) || "llama-3.1-8b-instant".equalsIgnoreCase(model))) {
            model = "qwen/qwen3.8-27b";
        }

        if (!"GROQ".equalsIgnoreCase(provider) && apiKey.trim().startsWith("gsk_")) {
            return AiTestConnectionResponse.builder()
                    .success(false)
                    .message("Kết nối thất bại: Key bắt đầu bằng 'gsk_' là API Key của GroqCloud. Vui lòng chọn Nhà cung cấp là 'GroqCloud'.")
                    .latencyMs(0L)
                    .build();
        }

        if ("ANTHROPIC".equalsIgnoreCase(provider) && apiKey.trim().startsWith("crsr_")) {
            return AiTestConnectionResponse.builder()
                    .success(false)
                    .message("Kết nối thất bại: Key bắt đầu bằng 'crsr_' là API Key của Cursor, không phải của Anthropic Claude. Vui lòng chọn Nhà cung cấp là 'Cursor / AI' để dùng key này, hoặc dùng key bắt đầu bằng 'sk-ant-' từ console.anthropic.com cho Anthropic Claude.")
                    .latencyMs(0L)
                    .build();
        }

        if ("OPENAI".equalsIgnoreCase(provider) && apiKey.trim().startsWith("crsr_")) {
            return AiTestConnectionResponse.builder()
                    .success(false)
                    .message("Kết nối thất bại: Key bắt đầu bằng 'crsr_' là API Key của Cursor, không phải của OpenAI. Vui lòng chọn Nhà cung cấp là 'Cursor / AI'.")
                    .latencyMs(0L)
                    .build();
        }

        if ("CURSOR".equalsIgnoreCase(provider) && apiKey.trim().startsWith("sk-ant-")) {
            return AiTestConnectionResponse.builder()
                    .success(false)
                    .message("Kết nối thất bại: Key bắt đầu bằng 'sk-ant-' là của Anthropic Claude, không phải của Cursor. Vui lòng chọn Nhà cung cấp là 'Anthropic Claude'.")
                    .latencyMs(0L)
                    .build();
        }

        long start = System.currentTimeMillis();

        try {
            if ("CURSOR".equalsIgnoreCase(provider) && (endpointUrl == null || endpointUrl.isBlank() || endpointUrl.contains("api.cursor.com"))) {
                String targetUrl = "https://api.cursor.com/v1/me";
                String resBody = restClient.get()
                        .uri(targetUrl)
                        .header("Authorization", "Bearer " + apiKey.trim())
                        .retrieve()
                        .body(String.class);

                String keyInfo = "";
                try {
                    var jsonNode = mapper.readTree(resBody);
                    String keyName = jsonNode.has("apiKeyName") ? jsonNode.get("apiKeyName").asText() : "";
                    String email = jsonNode.has("userEmail") ? jsonNode.get("userEmail").asText() : "";
                    if (!keyName.isBlank() || !email.isBlank()) {
                        keyInfo = " (" + (!keyName.isBlank() ? "Tên key: " + keyName : "") + (!email.isBlank() ? ", User: " + email : "") + ")";
                    }
                } catch (Exception ignored) {}

                long latency = System.currentTimeMillis() - start;
                updateKeyLastTested(request.getKeyId(), true, 200, "CURSOR", "cloud-agent-v1");
                return AiTestConnectionResponse.builder()
                        .success(true)
                        .message("Kết nối thành công đến Cursor Cloud API!" + keyInfo)
                        .latencyMs(latency)
                        .modelVersion("cursor:cloud-agent-v1")
                        .build();
            }

            boolean isOpenAiCompatible = !"ANTHROPIC".equalsIgnoreCase(provider) && !"GEMINI".equalsIgnoreCase(provider);

            if (isOpenAiCompatible) {
                String defaultEndpoint = switch (provider) {
                    case "OPENAI" -> "https://api.openai.com/v1/chat/completions";
                    case "DEEPSEEK" -> "https://api.deepseek.com/chat/completions";
                    case "CURSOR" -> (endpointUrl != null && !endpointUrl.isBlank()) ? endpointUrl.trim() : "https://api.cursor.com/v1/agents";
                    case "OPENROUTER" -> "https://openrouter.ai/api/v1/chat/completions";
                    case "GROQ" -> "https://api.groq.com/openai/v1/chat/completions";
                    case "MISTRAL" -> "https://api.mistral.ai/v1/chat/completions";
                    case "XAI" -> "https://api.x.ai/v1/chat/completions";
                    case "PERPLEXITY" -> "https://api.perplexity.ai/chat/completions";
                    case "OLLAMA" -> "http://localhost:11434/v1/chat/completions";
                    case "HUGGINGFACE" -> "https://router.huggingface.co/hf-inference/models/" + model + "/v1/chat/completions";
                    default -> (endpointUrl != null && !endpointUrl.isBlank()) ? endpointUrl.trim() : "https://api.openai.com/v1/chat/completions";
                };

                String targetUrl = (endpointUrl != null && !endpointUrl.isBlank())
                        ? endpointUrl.trim()
                        : defaultEndpoint;

                String body = """
                        {"model":"%s","messages":[{"role":"user","content":"ping"}],"max_tokens":5}
                        """.formatted(model);

                var requestSpec = restClient.post()
                        .uri(targetUrl)
                        .contentType(MediaType.APPLICATION_JSON);

                if (apiKey != null && !apiKey.isBlank()) {
                    requestSpec.header("Authorization", "Bearer " + apiKey.trim());
                }
                if ("OPENROUTER".equalsIgnoreCase(provider)) {
                    requestSpec.header("HTTP-Referer", "https://smarthire.ai");
                    requestSpec.header("X-Title", "SmartHire-AI");
                }

                requestSpec.body(body)
                        .retrieve()
                        .body(String.class);

                long latency = System.currentTimeMillis() - start;
                updateKeyLastTested(request.getKeyId(), true, 200, provider, model);
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
                updateKeyLastTested(request.getKeyId(), true, 200, provider, model);
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

                String effectiveModel = model;
                if ("gemini-2.0-flash".equalsIgnoreCase(effectiveModel) || "gemini-1.5-flash".equalsIgnoreCase(effectiveModel)) {
                    effectiveModel = "gemini-3.5-flash-lite";
                }

                String defaultUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + effectiveModel + ":generateContent?key=" + apiKey.trim();
                String targetUrl;
                if (endpointUrl != null && !endpointUrl.isBlank()) {
                    String base = endpointUrl.trim();
                    if (!base.contains(":generateContent") && !base.contains("/v1beta/models/")) {
                        base = base.replaceAll("/+$", "") + "/v1beta/models/" + effectiveModel + ":generateContent";
                    }
                    targetUrl = base.contains("?") ? base + "&key=" + apiKey.trim() : base + "?key=" + apiKey.trim();
                } else {
                    targetUrl = defaultUrl;
                }

                restClient.post()
                        .uri(targetUrl)
                        .header("x-goog-api-key", apiKey.trim())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(String.class);

                long latency = System.currentTimeMillis() - start;
                updateKeyLastTested(request.getKeyId(), true, 200, provider, effectiveModel);
                return AiTestConnectionResponse.builder()
                        .success(true)
                        .message("Kết nối thành công đến Google Gemini! (Model: " + effectiveModel + ")")
                        .latencyMs(latency)
                        .modelVersion("gemini:" + effectiveModel)
                        .build();
            }
        } catch (Exception ex) {
            long latency = System.currentTimeMillis() - start;
            log.error("AI test connection failed for provider {}: {}", provider, ex.getMessage());

            Integer statusCode = null;
            String errorMsg = ex.getMessage();
            if (ex instanceof org.springframework.web.client.RestClientResponseException rre) {
                statusCode = rre.getStatusCode().value();
                String responseBody = rre.getResponseBodyAsString();
                if (statusCode == 401) {
                    errorMsg = "401 Unauthorized: API Key không chính xác, đã hết hạn hoặc không có quyền truy cập";
                    if ("ANTHROPIC".equalsIgnoreCase(provider) && apiKey.trim().startsWith("crsr_")) {
                        errorMsg += " (Lưu ý: Bạn đang dùng API Key của Cursor 'crsr_...'. Vui lòng chọn Nhà cung cấp là 'Cursor / AI' thay vì 'Anthropic Claude').";
                    } else if (responseBody != null && !responseBody.isBlank()) {
                        errorMsg += " (" + responseBody + ")";
                    }
                } else if (statusCode == 404) {
                    errorMsg = "404 Not Found: Đường dẫn endpoint hoặc model không tồn tại" + (responseBody != null && !responseBody.isBlank() ? " (" + responseBody + ")" : ".");
                } else if (statusCode == 429) {
                    errorMsg = "429 Too Many Requests: Model đang bị giới hạn tần suất (đã đưa vào Redis cooldown 60s)" + (responseBody != null && !responseBody.isBlank() ? " (" + responseBody + ")" : ".");
                } else if (responseBody != null && !responseBody.isBlank()) {
                    errorMsg = statusCode + " " + rre.getStatusText() + ": " + responseBody;
                }
            }
            updateKeyLastTested(request.getKeyId(), false, statusCode, provider, model);

            return AiTestConnectionResponse.builder()
                    .success(false)
                    .message("Kết nối thất bại: " + errorMsg)
                    .latencyMs(latency)
                    .build();
        }
    }

    private void updateKeyLastTested(Long keyId, boolean success, Integer statusCode, String provider, String model) {
        if (keyId != null) {
            providerKeyRepository.findById(keyId).ifPresent(key -> {
                key.setLastTestedAt(LocalDateTime.now());
                if (!success) {
                    if (statusCode != null && (statusCode == 401 || statusCode == 403)) {
                        key.setStatus("INVALID_OR_REVOKED");
                    } else if (statusCode != null && statusCode == 429) {
                        // Rate limit is transient per (provider, model), do NOT mark whole key invalid in DB!
                        configProvider.markModelCooldown(provider, model, Duration.ofSeconds(60));
                        if ("RATE_LIMITED_OR_INVALID".equals(key.getStatus())) {
                            key.setStatus("ACTIVE");
                        }
                    }
                } else if ("RATE_LIMITED_OR_INVALID".equals(key.getStatus()) || "INVALID_OR_REVOKED".equals(key.getStatus())) {
                    key.setStatus("ACTIVE");
                }
                providerKeyRepository.save(key);
            });
        } else if (!success && statusCode != null && statusCode == 429) {
            configProvider.markModelCooldown(provider, model, Duration.ofSeconds(60));
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
        java.util.List<AiFallbackStep> steps = null;
        if (entity.getFallbackChain() != null && !entity.getFallbackChain().isBlank()) {
            try {
                steps = mapper.readValue(entity.getFallbackChain(), new com.fasterxml.jackson.core.type.TypeReference<java.util.List<AiFallbackStep>>() {});
            } catch (Exception ignored) {}
        }

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
                .fallbackChain(entity.getFallbackChain())
                .fallbackSteps(steps)
                .isActive(entity.getIsActive())
                .build();
    }

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public List<AiModelPricingDto> getAllModelPricings() {
        if (modelPricingRepository == null) {
            return List.of();
        }
        return modelPricingRepository.findAllByOrderByProviderAscModelNameAsc().stream()
                .map(this::toModelPricingDto)
                .collect(Collectors.toList());
    }

    @Transactional("masterTransactionManager")
    public AiModelPricingDto saveModelPricing(AiModelPricingDto dto, String adminEmail) {
        if (modelPricingRepository == null) {
            throw new IllegalStateException("Model pricing repository is not available");
        }
        String provider = dto.getProvider() != null && !dto.getProvider().isBlank()
                ? dto.getProvider().trim().toUpperCase()
                : "GEMINI";
        String modelName = dto.getModelName() != null ? dto.getModelName().trim() : "";
        if (modelName.isEmpty()) {
            throw new IllegalArgumentException("Model name is required");
        }

        AiModelPricing entity = null;
        if (dto.getId() != null) {
            entity = modelPricingRepository.findById(dto.getId()).orElse(null);
        }
        if (entity == null) {
            entity = modelPricingRepository
                    .findByProviderIgnoreCaseAndModelNameIgnoreCase(provider, modelName)
                    .orElseGet(() -> AiModelPricing.builder()
                            .provider(provider)
                            .modelName(modelName)
                            .build());
        }

        entity.setProvider(provider);
        entity.setModelName(modelName);
        if (dto.getDisplayName() != null) {
            entity.setDisplayName(dto.getDisplayName().trim());
        }
        if (dto.getContextWindow() != null && dto.getContextWindow() > 0) {
            entity.setContextWindow(dto.getContextWindow());
        }
        if (dto.getSupportsJson() != null) {
            entity.setSupportsJson(dto.getSupportsJson());
        }
        if (dto.getInputPricePer1mTokens() != null) {
            entity.setInputPricePer1mTokens(dto.getInputPricePer1mTokens().max(BigDecimal.ZERO));
        }
        if (dto.getOutputPricePer1mTokens() != null) {
            entity.setOutputPricePer1mTokens(dto.getOutputPricePer1mTokens().max(BigDecimal.ZERO));
        }
        if (dto.getIsActive() != null) {
            entity.setIsActive(dto.getIsActive());
        }

        AiModelPricing saved = modelPricingRepository.save(entity);

        try {
            auditLogRepository.save(PlatformAuditLog.builder()
                    .action("AI_MODEL_PRICING_UPDATED")
                    .description(String.format("Updated AI model pricing for %s:%s (in=$%s/1M, out=$%s/1M) by %s",
                            provider, modelName, saved.getInputPricePer1mTokens(), saved.getOutputPricePer1mTokens(), adminEmail))
                    .build());
        } catch (Exception ex) {
            log.warn("Failed to write audit log for saveModelPricing: {}", ex.getMessage());
        }

        return toModelPricingDto(saved);
    }

    @Transactional("masterTransactionManager")
    public void deleteModelPricing(Long id, String adminEmail) {
        if (modelPricingRepository == null) {
            return;
        }
        AiModelPricing entity = modelPricingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Model pricing not found with id: " + id));
        modelPricingRepository.delete(entity);

        try {
            auditLogRepository.save(PlatformAuditLog.builder()
                    .action("AI_MODEL_PRICING_DELETED")
                    .description(String.format("Deleted AI model pricing %s:%s (id=%d) by %s",
                            entity.getProvider(), entity.getModelName(), id, adminEmail))
                    .build());
        } catch (Exception ex) {
            log.warn("Failed to write audit log for deleteModelPricing: {}", ex.getMessage());
        }
    }

    private AiModelPricingDto toModelPricingDto(AiModelPricing entity) {
        return AiModelPricingDto.builder()
                .id(entity.getId())
                .provider(entity.getProvider())
                .modelName(entity.getModelName())
                .displayName(entity.getDisplayName())
                .inputPricePer1mTokens(entity.getInputPricePer1mTokens())
                .outputPricePer1mTokens(entity.getOutputPricePer1mTokens())
                .contextWindow(entity.getContextWindow())
                .supportsJson(entity.getSupportsJson())
                .isActive(entity.getIsActive())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private String maskKey(String raw) {
        if (raw == null || raw.length() < 8) return "••••••••";
        if (raw.length() <= 12) return raw.substring(0, 3) + "••••" + raw.substring(raw.length() - 2);
        return raw.substring(0, 6) + "••••••••" + raw.substring(raw.length() - 4);
    }
}
