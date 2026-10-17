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
    @Value("${app.ai.interview.provider:OPENAI}")
    private String interviewProvider = "OPENAI";
    @Value("${app.ai.interview.base-url:}")
    private String interviewEndpoint;
    @Value("${AI_INTERVIEW_GEMINI_API_KEY:}")
    private String interviewSpeechKey = "";
    @Value("${AI_INTERVIEW_GEMINI_MODEL:gemini-3.1-flash-lite}")
    private String interviewSpeechModel = "gemini-3.1-flash-lite";
    private final String interviewKey;
    private final String interviewModel;
    private final int interviewTimeout;
    @Value("${AI_ASSESSMENT_MODEL:vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M}")
    private String assessmentModel = "vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M";
    @Value("${AI_ASSESSMENT_BASE_URL:}")
    private String assessmentEndpoint = "";
    @Value("${AI_ASSESSMENT_API_KEY:}")
    private String assessmentKey = "";
    @Value("${AI_ASSESSMENT_TIMEOUT_SECONDS:120}")
    private int assessmentTimeout = 120;

    public DynamicAiConfigProvider(
            AiModelConfigRepository modelConfigRepository,
            AiProviderKeyRepository providerKeyRepository,
            TenantCredentialService credentialService,
            RedisService redisService,
            ObjectMapper mapper,
            @Value("${app.ai.gemini.api-key:}") String fallbackGeminiKey,
            @Value("${app.ai.models.cv-parsing:gemini-2.0-flash}") String fallbackCvModel,
            @Value("${app.ai.timeout-seconds:30}") int fallbackTimeout,
            @Value("${app.ai.interview.api-key:}") String interviewKey,
            @Value("${app.ai.interview.model:vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M}") String interviewModel,
            @Value("${app.ai.interview.timeout-seconds:60}") int interviewTimeout) {
        this.modelConfigRepository = modelConfigRepository;
        this.providerKeyRepository = providerKeyRepository;
        this.credentialService = credentialService;
        this.redisService = redisService;
        this.mapper = mapper;
        this.fallbackGeminiKey = fallbackGeminiKey == null ? "" : fallbackGeminiKey.trim();
        this.fallbackCvModel = fallbackCvModel;
        this.fallbackTimeout = fallbackTimeout;
        this.interviewKey = interviewKey == null ? "" : interviewKey.trim();
        this.interviewModel = interviewModel;
        this.interviewTimeout = interviewTimeout;
    }

    public ResolvedAiConfig resolveConfig(String taskType) {
        String normalizedTask = taskType == null ? "CV_PARSING" : taskType.trim().toUpperCase();
        if ("ASSESSMENT_GEN".equals(normalizedTask) || "ASSESSMENT_GRADING".equals(normalizedTask)) {
            var interview = resolveConfig("INTERVIEW_GEN");
            boolean openAi = "OPENAI".equalsIgnoreCase(interview.provider());
            return new ResolvedAiConfig(normalizedTask, "OPENAI", assessmentModel,
                    !assessmentKey.isBlank() ? assessmentKey : openAi ? interview.apiKey() : interviewKey,
                    !assessmentEndpoint.isBlank() ? assessmentEndpoint : openAi && interview.endpointUrl() != null
                            ? interview.endpointUrl() : interviewEndpoint,
                    new BigDecimal("ASSESSMENT_GRADING".equals(normalizedTask) ? "0.10" : "0.30"), 8192, assessmentTimeout, null, null);
        }
        String cacheKey = taskCacheKey(normalizedTask);

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
            if (configOpt.isPresent() && !Boolean.FALSE.equals(configOpt.get().getIsActive())) {
                AiModelConfig config = configOpt.get();
                String provider = config.getProvider() != null ? config.getProvider() : "GEMINI";
                Optional<AiProviderKey> activeKeyOpt = findActiveProviderKey(provider);
                String apiKey = decryptOrFallbackKey(activeKeyOpt, provider, normalizedTask);
                String endpointUrl = activeKeyOpt.map(AiProviderKey::getEndpointUrl)
                        .filter(u -> !u.isBlank())
                        .orElse(null);

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
        boolean interview = isInterview(normalizedTask);
        return new ResolvedAiConfig(
                normalizedTask,
                interview ? interviewProvider : "GEMINI",
                interview ? interviewModel : fallbackCvModel,
                interview ? interviewKey : fallbackGeminiKey,
                interview ? interviewEndpoint : null,
                new BigDecimal("0.20"),
                interview ? 8192 : 2048,
                interview ? interviewTimeout : fallbackTimeout,
                "GEMINI",
                "gemini-1.5-flash"
        );
    }

    public String resolveApiKeyForProvider(String provider) {
        return resolveApiKeyForProvider(provider, null);
    }

    /** Native audio requires Gemini credentials even when interview text uses another provider. */
    public ResolvedAiConfig resolveInterviewSpeechConfig() {
        return new ResolvedAiConfig("INTERVIEW_GEN", "GEMINI", interviewSpeechModel,
                decryptOrFallbackKey(findActiveProviderKey("GEMINI"), "GEMINI", "INTERVIEW_GEN"),
                null, BigDecimal.ZERO, 4096, interviewTimeout, null, null);
    }

    private static boolean isInterview(String task) {
        return "INTERVIEW_GEN".equals(task) || "INTERVIEW_NLP".equals(task);
    }

    private static String taskCacheKey(String task) {
        return RedisKeys.aiTaskConfig(task) + (isInterview(task) ? ":spring-ai-v1" : "");
    }

    private Optional<AiProviderKey> findActiveProviderKey(String provider) {
        String normalizedProvider = provider == null ? "GEMINI" : provider.trim().toUpperCase();
        try {
            Optional<AiProviderKey> defaultKeyOpt = providerKeyRepository
                    .findFirstByProviderAndIsDefaultTrueAndStatus(normalizedProvider, "ACTIVE");
            if (defaultKeyOpt.isEmpty()) {
                defaultKeyOpt = providerKeyRepository.findFirstByProviderAndIsDefaultTrue(normalizedProvider)
                        .filter(k -> k.getStatus() == null || "ACTIVE".equalsIgnoreCase(k.getStatus()));
            }
            if (defaultKeyOpt.isEmpty()) {
                defaultKeyOpt = providerKeyRepository.findFirstByProviderAndStatus(normalizedProvider, "ACTIVE");
            }
            return defaultKeyOpt;
        } catch (Exception ex) {
            log.warn("Could not query API key for provider {}: {}", normalizedProvider, ex.getMessage());
            return Optional.empty();
        }
    }

    private String decryptOrFallbackKey(Optional<AiProviderKey> keyOpt, String provider, String task) {
        String normalizedProvider = provider == null ? "GEMINI" : provider.trim().toUpperCase();
        if (keyOpt.isPresent()) {
            try {
                String encrypted = keyOpt.get().getApiKeyEncrypted();
                return credentialService.decrypt("MASTER_AI_KEY", encrypted);
            } catch (Exception ex) {
                log.warn("Could not decrypt API key for provider {}: {}", normalizedProvider, ex.getMessage());
            }
        }
        if ("GEMINI".equalsIgnoreCase(normalizedProvider)) {
            return isInterview(task) ? ("GEMINI".equalsIgnoreCase(interviewProvider) ? interviewKey : interviewSpeechKey) : fallbackGeminiKey;
        }
        return isInterview(task) && normalizedProvider.equalsIgnoreCase(interviewProvider) ? interviewKey : "";
    }

    private String resolveApiKeyForProvider(String provider, String task) {
        return decryptOrFallbackKey(findActiveProviderKey(provider), provider, task);
    }

    public void evictCache(String taskType) {
        if (taskType != null) {
            redisService.delete(taskCacheKey(taskType.trim().toUpperCase()));
        }
    }

    public void evictAll() {
        for (String task : new String[]{"CV_PARSING", "INTERVIEW_GEN", "INTERVIEW_NLP", "CODE_GRADING", "MATCHING"}) {
            redisService.delete(taskCacheKey(task));
        }
    }
}
