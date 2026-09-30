package com.smarthire.config.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.redis.RedisKeys;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.master.entity.AiModelConfig;
import com.smarthire.domain.master.entity.AiProviderKey;
import com.smarthire.domain.master.repository.AiModelConfigRepository;
import com.smarthire.domain.master.repository.AiProviderKeyRepository;
import com.smarthire.multitenancy.service.TenantCredentialService;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class DynamicAiConfigProvider {

    private static final Logger log = LoggerFactory.getLogger(DynamicAiConfigProvider.class);

    public record ResolvedAiConfig(
            String taskType,
            String provider,
            String modelName,
            String apiKey,
            String endpointUrl,
            BigDecimal temperature,
            Integer maxTokens,
            Integer timeoutSeconds,
            String failoverProvider,
            String failoverModel
    ) {}

    private final AiModelConfigRepository modelConfigRepository;
    private final AiProviderKeyRepository providerKeyRepository;
    private final TenantCredentialService credentialService;
    private final RedisService redisService;
    private final ObjectMapper mapper;

    // Fallback environment properties
    private final String fallbackGeminiKey;
    private final String fallbackCvModel;
    private final int fallbackTimeout;

    public DynamicAiConfigProvider(
            AiModelConfigRepository modelConfigRepository,
            AiProviderKeyRepository providerKeyRepository,
            TenantCredentialService credentialService,
            RedisService redisService,
            ObjectMapper mapper,
            @Value("${app.ai.gemini.api-key:}") String fallbackGeminiKey,
            @Value("${app.ai.models.cv-parsing:gemini-2.0-flash}") String fallbackCvModel,
            @Value("${app.ai.timeout-seconds:30}") int fallbackTimeout) {
        this.modelConfigRepository = modelConfigRepository;
        this.providerKeyRepository = providerKeyRepository;
        this.credentialService = credentialService;
        this.redisService = redisService;
        this.mapper = mapper;
        this.fallbackGeminiKey = fallbackGeminiKey == null ? "" : fallbackGeminiKey.trim();
        this.fallbackCvModel = fallbackCvModel;
        this.fallbackTimeout = fallbackTimeout;
    }

    public ResolvedAiConfig resolveConfig(String taskType) {
        String normalizedTask = taskType == null ? "CV_PARSING" : taskType.trim().toUpperCase();
        String cacheKey = RedisKeys.aiTaskConfig(normalizedTask);

        try {
            Optional<String> cachedJson = redisService.get(cacheKey);
            if (cachedJson.isPresent() && !cachedJson.get().isBlank()) {
                return mapper.readValue(cachedJson.get(), ResolvedAiConfig.class);
            }
        } catch (Exception ex) {
            log.warn("Failed to read AI config from Redis for task {}: {}", normalizedTask, ex.getMessage());
        }

        // Fetch from Master DB
        try {
            Optional<AiModelConfig> configOpt = modelConfigRepository.findByTaskType(normalizedTask);
            if (configOpt.isPresent()) {
                AiModelConfig config = configOpt.get();
                String provider = config.getProvider() != null ? config.getProvider() : "GEMINI";
                String apiKey = resolveApiKeyForProvider(provider);
                String endpointUrl = null;

                ResolvedAiConfig resolved = new ResolvedAiConfig(
                        normalizedTask,
                        provider,
                        config.getModelName(),
                        apiKey,
                        endpointUrl,
                        config.getTemperature() != null ? config.getTemperature() : new BigDecimal("0.20"),
                        config.getMaxTokens() != null ? config.getMaxTokens() : 2048,
                        config.getTimeoutSeconds() != null ? config.getTimeoutSeconds() : 30,
                        config.getFailoverProvider(),
                        config.getFailoverModel()
                );

                // Cache in Redis (TTL: 6 hours)
                try {
                    redisService.set(cacheKey, mapper.writeValueAsString(resolved), Duration.ofHours(6));
                } catch (Exception ex) {
                    log.warn("Failed to cache resolved AI config in Redis: {}", ex.getMessage());
                }

                return resolved;
            }
        } catch (Exception ex) {
            log.error("Failed to query AI config from Master DB for task {}: {}", normalizedTask, ex.getMessage());
        }

        // Fallback default
        return new ResolvedAiConfig(
                normalizedTask,
                "GEMINI",
                fallbackCvModel,
                fallbackGeminiKey,
                null,
                new BigDecimal("0.20"),
                2048,
                fallbackTimeout,
                "GEMINI",
                "gemini-1.5-flash"
        );
    }

    public String resolveApiKeyForProvider(String provider) {
        String normalizedProvider = provider == null ? "GEMINI" : provider.trim().toUpperCase();
        try {
            Optional<AiProviderKey> defaultKeyOpt = providerKeyRepository.findFirstByProviderAndIsDefaultTrue(normalizedProvider);
            if (defaultKeyOpt.isEmpty()) {
                defaultKeyOpt = providerKeyRepository.findFirstByProviderAndStatus(normalizedProvider, "ACTIVE");
            }
            if (defaultKeyOpt.isPresent()) {
                String encrypted = defaultKeyOpt.get().getApiKeyEncrypted();
                return credentialService.decrypt("MASTER_AI_KEY", encrypted);
            }
        } catch (Exception ex) {
            log.warn("Could not decrypt API key for provider {}: {}", normalizedProvider, ex.getMessage());
        }

        if ("GEMINI".equalsIgnoreCase(normalizedProvider)) {
            return fallbackGeminiKey;
        }
        return "";
    }

    public void evictCache(String taskType) {
        if (taskType != null) {
            redisService.delete(RedisKeys.aiTaskConfig(taskType));
        }
    }

    public void evictAll() {
        for (String task : new String[]{"CV_PARSING", "INTERVIEW_GEN", "INTERVIEW_NLP", "CODE_GRADING", "MATCHING"}) {
            redisService.delete(RedisKeys.aiTaskConfig(task));
        }
    }
}
