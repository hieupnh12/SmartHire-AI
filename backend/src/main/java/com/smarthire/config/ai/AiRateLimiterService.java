package com.smarthire.config.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.redis.RedisKeys;
import com.smarthire.master.ai.dto.AiRateLimitConfigDto;
import com.smarthire.master.ai.service.SystemSettingService;
import com.smarthire.multitenancy.context.TenantContext;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Short-term per-tenant AI Rate Limiter (RPM: Requests per Minute & TPM: Tokens per Minute)
 * backed by Redis fixed/sliding 1-minute windows to protect shared platform LLM API keys from noisy neighbors.
 */
@Service
@Slf4j
public class AiRateLimiterService {

    public static final String KEY_ENABLED = "ai.rate_limit.enabled";
    public static final String KEY_DEFAULT_RPM = "ai.rate_limit.default_rpm";
    public static final String KEY_DEFAULT_TPM = "ai.rate_limit.default_tpm";
    public static final String KEY_TENANT_OVERRIDES = "ai.rate_limit.tenant_overrides_json";
    public static final String CATEGORY_AI_RATE_LIMIT = "AI_RATE_LIMIT";

    public static final int DEFAULT_RPM_LIMIT = 30;
    public static final long DEFAULT_TPM_LIMIT = 100_000L;

    private static final DateTimeFormatter MINUTE_BUCKET_FMT = DateTimeFormatter.ofPattern("yyyyMMddHHmm");
    private static final long WINDOW_TTL_SECONDS = 70L;

    private final StringRedisTemplate redis;
    private final SystemSettingService systemSettingService;
    private final ObjectMapper objectMapper;

    @Autowired
    public AiRateLimiterService(
            @Autowired(required = false) StringRedisTemplate redis,
            @Autowired(required = false) SystemSettingService systemSettingService,
            ObjectMapper objectMapper) {
        this.redis = redis;
        this.systemSettingService = systemSettingService;
        this.objectMapper = objectMapper;
    }

    /**
     * Checks and acquires 1 AI request slot in the current 1-minute window for the active tenant in {@link TenantContext}.
     * Throws {@link BusinessException} with HTTP 429 (TOO_MANY_REQUESTS) if RPM or TPM is exceeded.
     */
    public void checkAndAcquire(String taskType) {
        checkAndAcquire(TenantContext.getCurrentTenant(), taskType);
    }

    public void checkAndAcquire(String tenantCode, String taskType) {
        if (tenantCode == null || tenantCode.isBlank() || "smarthire_master".equalsIgnoreCase(tenantCode)) {
            return;
        }
        String normTenant = tenantCode.trim().toLowerCase();
        AiRateLimitConfigDto config = getRateLimitConfig();
        if (Boolean.FALSE.equals(config.getEnabled())) {
            return;
        }

        int rpmLimit = resolveEffectiveRpmLimit(normTenant, config);
        if (rpmLimit == 0) {
            throw new BusinessException(
                    "Tần suất gọi AI của doanh nghiệp hiện đang bị giới hạn ở mức 0 yêu cầu/phút. Vui lòng liên hệ quản trị viên.",
                    HttpStatus.TOO_MANY_REQUESTS,
                    "AI_RPM_LIMIT_EXCEEDED"
            );
        }

        if (redis == null) {
            return;
        }

        String minuteBucket = currentMinuteBucket();
        long tpmLimit = config.getDefaultTpmPerTenant() != null ? config.getDefaultTpmPerTenant() : DEFAULT_TPM_LIMIT;

        // 1. Check current minute TPM (Tokens Per Minute)
        if (tpmLimit > 0L) {
            String tpmKey = RedisKeys.aiTenantTpmWindow(normTenant, minuteBucket);
            long currentTpm = readCounter(tpmKey);
            if (currentTpm >= tpmLimit) {
                log.warn("Tenant [{}] exceeded AI TPM rate limit on task [{}]. Current TPM: {}, Limit: {}",
                        normTenant, taskType, currentTpm, tpmLimit);
                throw new BusinessException(
                        String.format(
                                "Doanh nghiệp đã vượt giới hạn tốc độ xử lý Token AI trong phút (%d / %d tokens/phút). Vui lòng thử lại sau giây lát.",
                                currentTpm, tpmLimit),
                        HttpStatus.TOO_MANY_REQUESTS,
                        "AI_TPM_LIMIT_EXCEEDED"
                );
            }
        }

        // 2. Atomically increment and check current minute RPM (Requests Per Minute)
        if (rpmLimit > 0) {
            String rpmKey = RedisKeys.aiTenantRpmWindow(normTenant, minuteBucket);
            try {
                Long count = redis.opsForValue().increment(rpmKey);
                long currentRpm = count != null ? count : 1L;
                if (currentRpm == 1L) {
                    redis.expire(rpmKey, WINDOW_TTL_SECONDS, TimeUnit.SECONDS);
                }
                if (currentRpm > rpmLimit) {
                    redis.opsForValue().increment(rpmKey, -1L);
                    log.warn("Tenant [{}] exceeded AI RPM rate limit on task [{}]. Attempted: {}, Limit: {} req/min",
                            normTenant, taskType, currentRpm, rpmLimit);
                    throw new BusinessException(
                            String.format(
                                    "Doanh nghiệp đã vượt giới hạn tần suất gọi AI (%d yêu cầu/phút). Vui lòng thử lại sau giây lát.",
                                    rpmLimit),
                            HttpStatus.TOO_MANY_REQUESTS,
                            "AI_RPM_LIMIT_EXCEEDED"
                    );
                }
            } catch (BusinessException be) {
                throw be;
            } catch (Exception ex) {
                log.warn("Redis error during AI RPM check for tenant {}: {}", normTenant, ex.getMessage());
            }
        }
    }

    /**
     * Records consumed tokens into the current 1-minute TPM bucket in Redis.
     */
    public void recordTokensConsumed(String tenantCode, long totalTokens) {
        if (redis == null || tenantCode == null || tenantCode.isBlank()
                || "smarthire_master".equalsIgnoreCase(tenantCode) || totalTokens <= 0L) {
            return;
        }
        String normTenant = tenantCode.trim().toLowerCase();
        String minuteBucket = currentMinuteBucket();
        String tpmKey = RedisKeys.aiTenantTpmWindow(normTenant, minuteBucket);
        try {
            Long updated = redis.opsForValue().increment(tpmKey, totalTokens);
            if (updated != null && updated == totalTokens) {
                redis.expire(tpmKey, WINDOW_TTL_SECONDS, TimeUnit.SECONDS);
            }
        } catch (Exception ex) {
            log.debug("Failed to record AI TPM tokens in Redis for tenant {}: {}", normTenant, ex.getMessage());
        }
    }

    /**
     * Returns live [currentMinuteRpm, currentMinuteTpm] for a tenant in the active minute bucket.
     */
    public long[] getCurrentMinuteUsage(String tenantCode) {
        if (redis == null || tenantCode == null || tenantCode.isBlank()) {
            return new long[]{0L, 0L};
        }
        String normTenant = tenantCode.trim().toLowerCase();
        String minuteBucket = currentMinuteBucket();
        long rpm = readCounter(RedisKeys.aiTenantRpmWindow(normTenant, minuteBucket));
        long tpm = readCounter(RedisKeys.aiTenantTpmWindow(normTenant, minuteBucket));
        return new long[]{rpm, tpm};
    }

    public int resolveEffectiveRpmLimit(String tenantCode, AiRateLimitConfigDto config) {
        if (config == null) {
            return DEFAULT_RPM_LIMIT;
        }
        if (tenantCode != null && config.getTenantRpmOverrides() != null) {
            Integer override = config.getTenantRpmOverrides().get(tenantCode.trim().toLowerCase());
            if (override != null) {
                return override;
            }
        }
        return config.getDefaultRpmPerTenant() != null ? config.getDefaultRpmPerTenant() : DEFAULT_RPM_LIMIT;
    }

    public AiRateLimitConfigDto getRateLimitConfig() {
        String cacheKey = RedisKeys.aiRateLimitConfig();
        if (redis != null) {
            try {
                String cached = redis.opsForValue().get(cacheKey);
                if (cached != null && !cached.isBlank()) {
                    return objectMapper.readValue(cached, AiRateLimitConfigDto.class);
                }
            } catch (Exception ex) {
                log.debug("Could not read AI rate limit config from Redis cache: {}", ex.getMessage());
            }
        }

        AiRateLimitConfigDto loaded = loadFromMasterSettings();
        if (redis != null) {
            try {
                redis.opsForValue().set(cacheKey, objectMapper.writeValueAsString(loaded), Duration.ofHours(1));
            } catch (Exception ex) {
                log.debug("Could not cache AI rate limit config in Redis: {}", ex.getMessage());
            }
        }
        return loaded;
    }

    public AiRateLimitConfigDto updateRateLimitConfig(AiRateLimitConfigDto dto, String adminEmail) {
        AiRateLimitConfigDto current = loadFromMasterSettings();
        boolean enabled = dto.getEnabled() != null ? dto.getEnabled() : Boolean.TRUE.equals(current.getEnabled());
        int defaultRpm = dto.getDefaultRpmPerTenant() != null
                ? Math.max(1, dto.getDefaultRpmPerTenant())
                : current.getDefaultRpmPerTenant();
        long defaultTpm = dto.getDefaultTpmPerTenant() != null
                ? Math.max(1000L, dto.getDefaultTpmPerTenant())
                : current.getDefaultTpmPerTenant();
        Map<String, Integer> overrides = dto.getTenantRpmOverrides() != null
                ? normalizeOverrides(dto.getTenantRpmOverrides())
                : current.getTenantRpmOverrides();

        if (systemSettingService != null) {
            try {
                systemSettingService.saveSetting(
                        KEY_ENABLED, String.valueOf(enabled), CATEGORY_AI_RATE_LIMIT,
                        "Enable/Disable per-tenant short-term AI rate limiting (RPM/TPM)", false, adminEmail);
                systemSettingService.saveSetting(
                        KEY_DEFAULT_RPM, String.valueOf(defaultRpm), CATEGORY_AI_RATE_LIMIT,
                        "Default maximum AI requests per minute (RPM) per tenant", false, adminEmail);
                systemSettingService.saveSetting(
                        KEY_DEFAULT_TPM, String.valueOf(defaultTpm), CATEGORY_AI_RATE_LIMIT,
                        "Default maximum AI tokens per minute (TPM) per tenant", false, adminEmail);
                String overridesJson = objectMapper.writeValueAsString(overrides);
                systemSettingService.saveSetting(
                        KEY_TENANT_OVERRIDES, overridesJson, CATEGORY_AI_RATE_LIMIT,
                        "Per-tenant custom RPM overrides JSON map", false, adminEmail);
            } catch (Exception ex) {
                log.warn("Failed to persist AI rate limit settings to Master DB: {}", ex.getMessage());
            }
        }

        evictConfigCache();
        return AiRateLimitConfigDto.builder()
                .enabled(enabled)
                .defaultRpmPerTenant(defaultRpm)
                .defaultTpmPerTenant(defaultTpm)
                .tenantRpmOverrides(overrides)
                .build();
    }

    public void setTenantRpmOverride(String tenantCode, Integer customRpm, String adminEmail) {
        if (tenantCode == null || tenantCode.isBlank()) {
            return;
        }
        String normTenant = tenantCode.trim().toLowerCase();
        AiRateLimitConfigDto current = loadFromMasterSettings();
        Map<String, Integer> overrides = new HashMap<>(
                current.getTenantRpmOverrides() != null ? current.getTenantRpmOverrides() : Map.of());
        if (customRpm == null) {
            overrides.remove(normTenant);
        } else {
            overrides.put(normTenant, Math.max(-1, customRpm));
        }
        current.setTenantRpmOverrides(overrides);
        updateRateLimitConfig(current, adminEmail);
    }

    public void evictConfigCache() {
        if (redis != null) {
            try {
                redis.delete(RedisKeys.aiRateLimitConfig());
            } catch (Exception ex) {
                log.debug("Failed to evict AI rate limit config cache: {}", ex.getMessage());
            }
        }
    }

    private AiRateLimitConfigDto loadFromMasterSettings() {
        boolean enabled = true;
        int defaultRpm = DEFAULT_RPM_LIMIT;
        long defaultTpm = DEFAULT_TPM_LIMIT;
        Map<String, Integer> overrides = new HashMap<>();

        if (systemSettingService != null) {
            try {
                Optional<String> enabledOpt = systemSettingService.getSettingValue(KEY_ENABLED);
                if (enabledOpt.isPresent()) {
                    enabled = Boolean.parseBoolean(enabledOpt.get().trim());
                }
                Optional<String> rpmOpt = systemSettingService.getSettingValue(KEY_DEFAULT_RPM);
                if (rpmOpt.isPresent()) {
                    defaultRpm = Integer.parseInt(rpmOpt.get().trim());
                }
                Optional<String> tpmOpt = systemSettingService.getSettingValue(KEY_DEFAULT_TPM);
                if (tpmOpt.isPresent()) {
                    defaultTpm = Long.parseLong(tpmOpt.get().trim());
                }
                Optional<String> overridesOpt = systemSettingService.getSettingValue(KEY_TENANT_OVERRIDES);
                if (overridesOpt.isPresent() && !overridesOpt.get().isBlank()) {
                    Map<String, Integer> parsed = objectMapper.readValue(
                            overridesOpt.get(), new TypeReference<Map<String, Integer>>() {});
                    if (parsed != null) {
                        overrides.putAll(normalizeOverrides(parsed));
                    }
                }
            } catch (Exception ex) {
                log.debug("Using default AI rate limit settings ({})", ex.getMessage());
            }
        }

        return AiRateLimitConfigDto.builder()
                .enabled(enabled)
                .defaultRpmPerTenant(defaultRpm)
                .defaultTpmPerTenant(defaultTpm)
                .tenantRpmOverrides(overrides)
                .build();
    }

    private static Map<String, Integer> normalizeOverrides(Map<String, Integer> raw) {
        Map<String, Integer> res = new HashMap<>();
        if (raw != null) {
            raw.forEach((k, v) -> {
                if (k != null && !k.isBlank() && v != null) {
                    res.put(k.trim().toLowerCase(), v);
                }
            });
        }
        return res;
    }

    private long readCounter(String key) {
        if (redis == null) {
            return 0L;
        }
        try {
            String val = redis.opsForValue().get(key);
            return val != null ? Long.parseLong(val.trim()) : 0L;
        } catch (Exception ex) {
            return 0L;
        }
    }

    private static String currentMinuteBucket() {
        return LocalDateTime.now(ZoneOffset.UTC).format(MINUTE_BUCKET_FMT);
    }
}
