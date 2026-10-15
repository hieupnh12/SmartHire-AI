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
            String failoverModel,
            String fallbackChain
    ) {
        public ResolvedAiConfig(
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
        ) {
            this(taskType, provider, modelName, apiKey, endpointUrl, temperature, maxTokens, timeoutSeconds, failoverProvider, failoverModel, null);
        }

        public boolean hasFailover() {
            if (fallbackChain != null && !fallbackChain.isBlank() && !fallbackChain.trim().equals("[]")) {
                return true;
            }
            if (failoverModel == null || failoverModel.isBlank()) {
                return false;
            }
            String targetProvider = (failoverProvider == null || failoverProvider.isBlank()) ? provider : failoverProvider.trim();
            return !(targetProvider != null
                    && targetProvider.equalsIgnoreCase(provider)
                    && failoverModel.trim().equalsIgnoreCase(modelName));
        }

        public java.util.List<com.smarthire.master.ai.dto.AiFallbackStep> getFallbackSteps(ObjectMapper mapper) {
            if (fallbackChain != null && !fallbackChain.isBlank()) {
                try {
                    java.util.List<com.smarthire.master.ai.dto.AiFallbackStep> steps = mapper.readValue(
                            fallbackChain, new com.fasterxml.jackson.core.type.TypeReference<java.util.List<com.smarthire.master.ai.dto.AiFallbackStep>>() {});
                    if (steps != null && !steps.isEmpty()) {
                        return steps;
                    }
                } catch (Exception ex) {
                    log.warn("Failed to parse fallback_chain JSON: {}", ex.getMessage());
                }
            }
            if (failoverModel != null && !failoverModel.isBlank()) {
                return java.util.List.of(new com.smarthire.master.ai.dto.AiFallbackStep(failoverProvider, failoverModel, timeoutSeconds, temperature));
            }
            return java.util.List.of();
        }
    }

    private final AiModelConfigRepository modelConfigRepository;
    private final AiProviderKeyRepository providerKeyRepository;
    private final TenantCredentialService credentialService;
    private final RedisService redisService;
    private final ObjectMapper mapper;

    // Fallback environment properties
    private final String fallbackGeminiKey;
    private final String fallbackCvModel;
    private final int fallbackTimeout;
    private final String interviewKey;
    private final String interviewModel;
    private final int interviewTimeout;

    public DynamicAiConfigProvider(
            AiModelConfigRepository modelConfigRepository,
            AiProviderKeyRepository providerKeyRepository,
            TenantCredentialService credentialService,
            RedisService redisService,
            ObjectMapper mapper,
            @Value("${app.ai.gemini.api-key:}") String fallbackGeminiKey,
            @Value("${app.ai.models.cv-parsing:gemini-3.5-flash-lite}") String fallbackCvModel,
            @Value("${app.ai.timeout-seconds:30}") int fallbackTimeout,
            @Value("${app.ai.interview.api-key:}") String interviewKey,
            @Value("${app.ai.interview.model:gemini-2.5-flash}") String interviewModel,
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
        ResolvedAiConfig base = getOrResolveBaseConfig(normalizedTask);

        // Check if primary model is currently in 429 rate-limited cooldown in Redis
        if (base.hasFailover() && isModelInCooldown(base.provider(), base.modelName())) {
            Optional<ResolvedAiConfig> failoverOpt = resolveFailoverConfig(base);
            if (failoverOpt.isPresent()) {
                log.info("Primary AI model {}:{} for task {} is currently in 429 cooldown, proactively routing to failover {}:{}",
                        base.provider(), base.modelName(), normalizedTask, failoverOpt.get().provider(), failoverOpt.get().modelName());
                return failoverOpt.get();
            }
        }
        return base;
    }

    private ResolvedAiConfig getOrResolveBaseConfig(String normalizedTask) {
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
                        config.getFailoverModel(),
                        config.getFallbackChain()
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
                "GEMINI",
                interview ? interviewModel : fallbackCvModel,
                interview ? interviewKey : fallbackGeminiKey,
                null,
                new BigDecimal("0.20"),
                interview ? 8192 : 2048,
                interview ? interviewTimeout : fallbackTimeout,
                "GEMINI",
                "gemini-3.1-flash-lite",
                null
        );
    }

    public void markModelCooldown(String provider, String modelName, Duration duration) {
        if (provider == null || modelName == null || redisService == null) return;
        String key = RedisKeys.aiModelCooldown(provider, modelName);
        Duration ttl = duration != null ? duration : Duration.ofSeconds(60);
        try {
            redisService.set(key, "RATE_LIMITED_429", ttl);
            log.warn("Marked AI model {}:{} in Redis cooldown for {}s due to 429 rate limit",
                    provider, modelName, ttl.getSeconds());
        } catch (Exception ex) {
            log.warn("Failed to set model cooldown in Redis for {}:{}: {}", provider, modelName, ex.getMessage());
        }
    }

    public boolean isModelInCooldown(String provider, String modelName) {
        if (provider == null || modelName == null || redisService == null) return false;
        String key = RedisKeys.aiModelCooldown(provider, modelName);
        try {
            return redisService.exists(key);
        } catch (Exception ex) {
            log.warn("Failed to check model cooldown in Redis for {}:{}: {}", provider, modelName, ex.getMessage());
            return false;
        }
    }

    public Optional<ResolvedAiConfig> resolveFailoverConfig(ResolvedAiConfig primary) {
        if (primary == null || !primary.hasFailover()) {
            return Optional.empty();
        }

        // 1. Try to find first active fallback step from fallbackChain
        java.util.List<com.smarthire.master.ai.dto.AiFallbackStep> steps = primary.getFallbackSteps(mapper);
        for (com.smarthire.master.ai.dto.AiFallbackStep step : steps) {
            if (step.getModel() == null || step.getModel().isBlank()) continue;
            String targetProvider = (step.getProvider() == null || step.getProvider().isBlank())
                    ? primary.provider()
                    : step.getProvider().trim().toUpperCase();
            String targetModel = step.getModel().trim();

            if (targetProvider.equalsIgnoreCase(primary.provider()) && targetModel.equalsIgnoreCase(primary.modelName())) {
                continue;
            }
            if (isModelInCooldown(targetProvider, targetModel)) {
                log.info("Fallback candidate {}:{} is in Redis cooldown, trying next", targetProvider, targetModel);
                continue;
            }

            String apiKey;
            String endpointUrl;
            if (targetProvider.equalsIgnoreCase(primary.provider())
                    && primary.apiKey() != null
                    && !primary.apiKey().isBlank()) {
                apiKey = primary.apiKey();
                endpointUrl = primary.endpointUrl();
            } else {
                Optional<AiProviderKey> activeKeyOpt = findActiveProviderKey(targetProvider);
                apiKey = decryptOrFallbackKey(activeKeyOpt, targetProvider, primary.taskType());
                endpointUrl = activeKeyOpt.map(AiProviderKey::getEndpointUrl)
                        .filter(u -> !u.isBlank())
                        .orElse(null);
            }

            if (apiKey != null && !apiKey.isBlank()) {
                return Optional.of(new ResolvedAiConfig(
                        primary.taskType(),
                        targetProvider,
                        targetModel,
                        apiKey,
                        endpointUrl,
                        step.getTemperature() != null ? step.getTemperature() : primary.temperature(),
                        primary.maxTokens(),
                        step.getTimeoutSeconds() != null ? step.getTimeoutSeconds() : primary.timeoutSeconds(),
                        null,
                        null,
                        null
                ));
            }
        }

        // 2. Fallback to failoverProvider / failoverModel if not matched from chain
        String primaryProvider = primary.provider() == null || primary.provider().isBlank()
                ? "GEMINI"
                : primary.provider().trim().toUpperCase();
        String targetProvider = primary.failoverProvider() == null || primary.failoverProvider().isBlank()
                ? primaryProvider
                : primary.failoverProvider().trim().toUpperCase();
        String targetModel = primary.failoverModel() != null ? primary.failoverModel().trim() : null;

        if (targetModel == null || targetModel.isBlank()) {
            return Optional.empty();
        }

        String apiKey;
        String endpointUrl;
        if (targetProvider.equalsIgnoreCase(primaryProvider)
                && primary.apiKey() != null
                && !primary.apiKey().isBlank()) {
            apiKey = primary.apiKey();
            endpointUrl = primary.endpointUrl();
        } else {
            Optional<AiProviderKey> activeKeyOpt = findActiveProviderKey(targetProvider);
            apiKey = decryptOrFallbackKey(activeKeyOpt, targetProvider, primary.taskType());
            endpointUrl = activeKeyOpt.map(AiProviderKey::getEndpointUrl)
                    .filter(u -> !u.isBlank())
                    .orElse(null);
        }

        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Failover model {}:{} is configured for task {}, but no active API key was found for provider {}",
                    targetProvider, targetModel, primary.taskType(), targetProvider);
            return Optional.empty();
        }

        return Optional.of(new ResolvedAiConfig(
                primary.taskType(),
                targetProvider,
                targetModel,
                apiKey,
                endpointUrl,
                primary.temperature(),
                primary.maxTokens(),
                primary.timeoutSeconds(),
                null,
                null,
                null
        ));
    }

    public java.util.List<ResolvedAiConfig> resolveExecutionChain(String taskType) {
        String normalizedTask = taskType == null ? "CV_PARSING" : taskType.trim().toUpperCase();
        ResolvedAiConfig base = getOrResolveBaseConfig(normalizedTask);

        java.util.List<ResolvedAiConfig> chain = new java.util.ArrayList<>();

        // 1. Primary model (add if not currently in Redis 429 cooldown)
        if (!isModelInCooldown(base.provider(), base.modelName())) {
            chain.add(base);
        } else {
            log.info("Primary AI model {}:{} for task {} is currently in 429 cooldown, skipping in execution chain",
                    base.provider(), base.modelName(), normalizedTask);
        }

        // 2. Fallback steps
        java.util.List<com.smarthire.master.ai.dto.AiFallbackStep> steps = base.getFallbackSteps(mapper);
        for (com.smarthire.master.ai.dto.AiFallbackStep step : steps) {
            if (step.getModel() == null || step.getModel().isBlank()) continue;
            String stepProvider = (step.getProvider() == null || step.getProvider().isBlank()) ? base.provider() : step.getProvider().trim().toUpperCase();
            String stepModel = step.getModel().trim();

            if (stepProvider.equalsIgnoreCase(base.provider()) && stepModel.equalsIgnoreCase(base.modelName())) {
                continue;
            }
            if (isModelInCooldown(stepProvider, stepModel)) {
                log.info("Fallback model {}:{} for task {} is in 429 cooldown, skipping in execution chain",
                        stepProvider, stepModel, normalizedTask);
                continue;
            }

            String stepKey;
            String stepEndpoint;
            if (stepProvider.equalsIgnoreCase(base.provider()) && base.apiKey() != null && !base.apiKey().isBlank()) {
                stepKey = base.apiKey();
                stepEndpoint = base.endpointUrl();
            } else {
                Optional<AiProviderKey> activeKeyOpt = findActiveProviderKey(stepProvider);
                stepKey = decryptOrFallbackKey(activeKeyOpt, stepProvider, normalizedTask);
                stepEndpoint = activeKeyOpt.map(AiProviderKey::getEndpointUrl).filter(u -> !u.isBlank()).orElse(null);
            }

            if (stepKey != null && !stepKey.isBlank()) {
                chain.add(new ResolvedAiConfig(
                        normalizedTask,
                        stepProvider,
                        stepModel,
                        stepKey,
                        stepEndpoint,
                        step.getTemperature() != null ? step.getTemperature() : base.temperature(),
                        base.maxTokens(),
                        step.getTimeoutSeconds() != null ? step.getTimeoutSeconds() : base.timeoutSeconds(),
                        null,
                        null,
                        null
                ));
            }
        }

        if (chain.isEmpty()) {
            chain.add(base);
        }

        return chain;
    }

    public String resolveApiKeyForProvider(String provider) {
        return resolveApiKeyForProvider(provider, null);
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
            return isInterview(task) ? interviewKey : fallbackGeminiKey;
        }
        return "";
    }

    private String resolveApiKeyForProvider(String provider, String task) {
        return decryptOrFallbackKey(findActiveProviderKey(provider), provider, task);
    }

    public void evictCache(String taskType) {
        if (taskType != null) {
            try {
                redisService.delete(taskCacheKey(taskType.trim().toUpperCase()));
            } catch (Exception ex) {
                log.warn("Failed to evict Redis cache for task {}: {}", taskType, ex.getMessage());
            }
        }
    }

    public void evictAll() {
        try {
            for (String task : new String[]{"CV_PARSING", "INTERVIEW_GEN", "INTERVIEW_NLP", "CODE_GRADING", "MATCHING"}) {
                redisService.delete(taskCacheKey(task));
            }
        } catch (Exception ex) {
            log.warn("Failed to evict all Redis task caches: {}", ex.getMessage());
        }
    }
}
