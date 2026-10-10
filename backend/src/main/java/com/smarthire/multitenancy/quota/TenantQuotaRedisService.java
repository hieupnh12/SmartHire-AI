package com.smarthire.multitenancy.quota;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.entity.TenantSubscription;
import com.smarthire.domain.master.entity.TenantUsageDaily;
import com.smarthire.domain.master.repository.SubscriptionPlanRepository;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.domain.master.repository.TenantSubscriptionRepository;
import com.smarthire.domain.master.repository.TenantUsageDailyRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class TenantQuotaRedisService {

    public static final long BYTES_PER_GB = 1024L * 1024L * 1024L;
    public static final long SECONDS_PER_HOUR = 3600L;

    private static final String CACHE_KEY_FEATURES = "sub:tenant:%s:features";
    private static final String CACHE_KEY_LIMITS = "sub:tenant:%s:limits";
    private static final String CACHE_KEY_USAGE = "sub:tenant:%s:usage:%s"; // %s = YYYYMM

    private final StringRedisTemplate redis;
    private final TenantInfoRepository tenantInfoRepository;
    private final TenantSubscriptionRepository subscriptionRepository;
    private final SubscriptionPlanRepository planRepository;
    private final TenantUsageDailyRepository usageDailyRepository;
    private final ObjectMapper objectMapper;

    public record ResolvedSubscription(TenantInfo tenant, TenantSubscription subscription, SubscriptionPlan plan) {}

    @Autowired
    public TenantQuotaRedisService(
            StringRedisTemplate redis,
            TenantInfoRepository tenantInfoRepository,
            TenantSubscriptionRepository subscriptionRepository,
            SubscriptionPlanRepository planRepository,
            TenantUsageDailyRepository usageDailyRepository,
            ObjectMapper objectMapper) {
        this.redis = redis;
        this.tenantInfoRepository = tenantInfoRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.planRepository = planRepository;
        this.usageDailyRepository = usageDailyRepository;
        this.objectMapper = objectMapper;
    }

    public TenantQuotaRedisService(
            StringRedisTemplate redis,
            TenantSubscriptionRepository subscriptionRepository,
            SubscriptionPlanRepository planRepository,
            ObjectMapper objectMapper) {
        this(redis, null, subscriptionRepository, planRepository, null, objectMapper);
    }

    public static final List<String> OPERATIONAL_SUBSCRIPTION_STATUSES = List.of("ACTIVE", "TRIAL", "PAST_DUE");
    private static final String CACHE_KEY_STATUS = "sub:tenant:%s:status";

    public boolean hasFeature(String tenantCode, String feature) {
        if (tenantCode == null || tenantCode.isBlank()) {
            return true;
        }
        String key = String.format(CACHE_KEY_FEATURES, tenantCode);
        try {
            if (Boolean.FALSE.equals(redis.hasKey(key))) {
                loadTenantSubscriptionIntoCache(tenantCode);
            }
            return Boolean.TRUE.equals(redis.opsForSet().isMember(key, feature));
        } catch (Exception ex) {
            log.warn("Redis unavailable when checking feature {} for tenant {}", feature, tenantCode, ex);
            return true;
        }
    }

    /**
     * Verifies that the tenant's subscription is in an operational lifecycle state (TRIAL, ACTIVE, or PAST_DUE within grace period).
     * Throws HTTP 402 if the subscription is SUSPENDED, CANCELED, or EXPIRED.
     */
    public void ensureSubscriptionOperational(String tenantCode) {
        if (tenantCode == null || tenantCode.isBlank() || "smarthire_master".equals(tenantCode)) {
            return;
        }
        String status = getSubscriptionLifecycleStatus(tenantCode);
        if ("SUSPENDED".equalsIgnoreCase(status)) {
            throw new BusinessException(
                    "Thuê bao của doanh nghiệp đang tạm khóa (SUSPENDED) do quá hạn thanh toán sau thời gian ân hạn. Vui lòng thanh toán hóa đơn gia hạn để mở khóa.",
                    HttpStatus.PAYMENT_REQUIRED,
                    "SUBSCRIPTION_SUSPENDED"
            );
        }
        if ("CANCELED".equalsIgnoreCase(status) || "CANCELLED".equalsIgnoreCase(status) || "EXPIRED".equalsIgnoreCase(status)) {
            throw new BusinessException(
                    "Thuê bao của doanh nghiệp đã bị hủy hoặc hết hiệu lực (" + status + "). Vui lòng đăng ký hoặc gia hạn gói dịch vụ để tiếp tục thao tác.",
                    HttpStatus.PAYMENT_REQUIRED,
                    "SUBSCRIPTION_CANCELED"
            );
        }
    }

    public String getSubscriptionLifecycleStatus(String tenantCode) {
        if (tenantCode == null || tenantCode.isBlank()) {
            return "ACTIVE";
        }
        String statusKey = String.format(CACHE_KEY_STATUS, tenantCode);
        try {
            if (Boolean.FALSE.equals(redis.hasKey(statusKey))) {
                loadTenantSubscriptionIntoCache(tenantCode);
            }
            String cachedStatus = redis.opsForValue().get(statusKey);
            if (cachedStatus != null && !cachedStatus.isBlank()) {
                return cachedStatus;
            }
        } catch (Exception ex) {
            log.warn("Failed to read subscription lifecycle status from Redis for tenant {}", tenantCode, ex);
        }
        TenantSubscription sub = resolveSubscriptionAndPlan(tenantCode).subscription();
        return sub != null && sub.getStatus() != null ? sub.getStatus() : "ACTIVE";
    }

    /**
     * Atomically checks the plan limit for the given metered quota and reserves {@code count} units.
     * Throws {@link BusinessException} (HTTP 402) if the feature is disabled (limit == 0) or quota is reached.
     */
    public long checkAndReserveQuota(String tenantCode, QuotaType type, int count) {
        if (tenantCode == null || tenantCode.isBlank() || "smarthire_master".equals(tenantCode)) {
            return 0L;
        }
        ensureSubscriptionOperational(tenantCode);
        long limit = getRawLimit(tenantCode, type);
        if (limit == 0L) {
            throw new BusinessException(disabledMessage(type), HttpStatus.PAYMENT_REQUIRED, "QUOTA_FEATURE_DISABLED");
        }

        String monthStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        String key = String.format(CACHE_KEY_USAGE, tenantCode, monthStr);

        ensureUsageLoaded(tenantCode, monthStr);

        Long currentUsage = redis.opsForHash().increment(key, type.name(), count);
        redis.expire(key, 60, TimeUnit.DAYS);
        long usageVal = currentUsage != null ? currentUsage : count;

        if (limit > 0L && usageVal > limit) {
            redis.opsForHash().increment(key, type.name(), -count);
            log.warn("Tenant [{}] blocked on {} quota. Limit: {}, Attempted Usage: {}", tenantCode, type, limit, usageVal);
            throw new BusinessException(exceededMessage(type, limit), HttpStatus.PAYMENT_REQUIRED, "QUOTA_EXCEEDED");
        }

        recordDailyUsage(tenantCode, type, count);
        log.info("Reserved {} {} for tenant {}. Usage: {}/{}", count, type, tenantCode, usageVal, limit < 0 ? "UNLIMITED" : limit);
        return usageVal;
    }

    /**
     * Legacy method retained for compatibility; delegates to {@link #checkAndReserveQuota}.
     */
    public long reserveQuota(String tenantCode, QuotaType type, int count) {
        return checkAndReserveQuota(tenantCode, type, count);
    }

    public void rollbackQuota(String tenantCode, QuotaType type, int count) {
        if (tenantCode == null || tenantCode.isBlank() || count <= 0) {
            return;
        }
        String monthStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        String key = String.format(CACHE_KEY_USAGE, tenantCode, monthStr);
        try {
            Long currentUsage = redis.opsForHash().increment(key, type.name(), -count);
            if (currentUsage != null && currentUsage < 0) {
                redis.opsForHash().put(key, type.name(), "0");
            }
            log.info("Rollbacked {} {} for tenant {}. Current usage: {}", count, type, tenantCode, currentUsage);
        } catch (Exception ex) {
            log.warn("Failed to rollback Redis quota {} for tenant {}", type, tenantCode, ex);
        }
        recordDailyUsage(tenantCode, type, -count);
    }

    /**
     * Checks that a metered quota (such as AI_VOICE_SECONDS or PROCTORING_SECONDS) is enabled and has remaining balance
     * before starting/continuing a session.
     */
    public void requireQuotaAvailable(String tenantCode, QuotaType type) {
        if (tenantCode == null || tenantCode.isBlank() || "smarthire_master".equals(tenantCode)) {
            return;
        }
        ensureSubscriptionOperational(tenantCode);
        long limit = getRawLimit(tenantCode, type);
        if (limit == 0L) {
            throw new BusinessException(disabledMessage(type), HttpStatus.PAYMENT_REQUIRED, "QUOTA_FEATURE_DISABLED");
        }
        if (limit > 0L) {
            long used = getCurrentUsage(tenantCode, type);
            if (used >= limit) {
                throw new BusinessException(exceededMessage(type, limit), HttpStatus.PAYMENT_REQUIRED, "QUOTA_EXCEEDED");
            }
        }
    }

    /**
     * Records consumed metered usage (e.g., elapsed AI interview voice seconds or proctoring heartbeat seconds).
     */
    public void recordConsumedQuota(String tenantCode, QuotaType type, long amount) {
        if (tenantCode == null || tenantCode.isBlank() || "smarthire_master".equals(tenantCode) || amount <= 0) {
            return;
        }
        String monthStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        String key = String.format(CACHE_KEY_USAGE, tenantCode, monthStr);
        try {
            ensureUsageLoaded(tenantCode, monthStr);
            redis.opsForHash().increment(key, type.name(), amount);
            redis.expire(key, 60, TimeUnit.DAYS);
        } catch (Exception ex) {
            log.warn("Failed to increment Redis usage {} for tenant {}", type, tenantCode, ex);
        }
        recordDailyUsage(tenantCode, type, amount);
    }

    /**
     * Enforces a capacity quota (such as ACTIVE_JOBS) given the current count of active records in the tenant DB.
     */
    public void checkCapacity(String tenantCode, QuotaType type, long currentActiveCount, long addingCount) {
        if (tenantCode == null || tenantCode.isBlank() || "smarthire_master".equals(tenantCode)) {
            return;
        }
        ensureSubscriptionOperational(tenantCode);
        long limit = getRawLimit(tenantCode, type);
        if (limit == 0L) {
            throw new BusinessException(disabledMessage(type), HttpStatus.PAYMENT_REQUIRED, "QUOTA_FEATURE_DISABLED");
        }
        if (limit > 0L && (currentActiveCount + addingCount) > limit) {
            log.warn("Tenant [{}] reached capacity for {}. Limit: {}, Current: {}", tenantCode, type, limit, currentActiveCount);
            throw new BusinessException(exceededMessage(type, limit), HttpStatus.PAYMENT_REQUIRED, "CAPACITY_LIMIT_REACHED");
        }
    }

    /**
     * Enforces storage quota (max_storage_gb) before storing a new file and records the new total storage bytes.
     */
    public void requireAndRecordStorage(String tenantCode, long currentStorageBytes, long newFileBytes) {
        if (tenantCode == null || tenantCode.isBlank() || "smarthire_master".equals(tenantCode) || newFileBytes <= 0) {
            return;
        }
        ensureSubscriptionOperational(tenantCode);
        long limit = getRawLimit(tenantCode, QuotaType.STORAGE_BYTES);
        if (limit == 0L) {
            throw new BusinessException(disabledMessage(QuotaType.STORAGE_BYTES), HttpStatus.PAYMENT_REQUIRED, "QUOTA_FEATURE_DISABLED");
        }
        long baseBytes = Math.max(currentStorageBytes, getCurrentUsage(tenantCode, QuotaType.STORAGE_BYTES));
        if (limit > 0L && (baseBytes + newFileBytes) > limit) {
            log.warn("Tenant [{}] exceeded storage quota. Limit: {} bytes, Current: {}, Uploading: {}",
                    tenantCode, limit, baseBytes, newFileBytes);
            throw new BusinessException(exceededMessage(QuotaType.STORAGE_BYTES, limit), HttpStatus.PAYMENT_REQUIRED, "QUOTA_EXCEEDED");
        }
        long updatedTotal = baseBytes + newFileBytes;
        String monthStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        String key = String.format(CACHE_KEY_USAGE, tenantCode, monthStr);
        try {
            redis.opsForHash().put(key, QuotaType.STORAGE_BYTES.name(), String.valueOf(updatedTotal));
            redis.expire(key, 60, TimeUnit.DAYS);
        } catch (Exception ex) {
            log.warn("Failed to update storage usage in Redis for tenant {}", tenantCode, ex);
        }
        updateAbsoluteDailyMetric(tenantCode, QuotaType.STORAGE_BYTES, updatedTotal);
    }

    public int getVideoRetentionDays(String tenantCode) {
        if (tenantCode == null || tenantCode.isBlank() || "smarthire_master".equals(tenantCode)) {
            return -1;
        }
        long limit = getRawLimit(tenantCode, QuotaType.VIDEO_RETENTION_DAYS);
        return (int) limit;
    }

    public void requireVideoRetentionEnabled(String tenantCode) {
        ensureSubscriptionOperational(tenantCode);
        int days = getVideoRetentionDays(tenantCode);
        if (days == 0) {
            throw new BusinessException(
                    disabledMessage(QuotaType.VIDEO_RETENTION_DAYS),
                    HttpStatus.PAYMENT_REQUIRED,
                    "VIDEO_RETENTION_DISABLED"
            );
        }
    }

    public boolean isRecordingExpired(String tenantCode, Instant createdAt) {
        if (createdAt == null) {
            return false;
        }
        int days = getVideoRetentionDays(tenantCode);
        if (days <= 0) {
            return false;
        }
        return Instant.now().isAfter(createdAt.plus(days, ChronoUnit.DAYS));
    }

    /**
     * Returns the raw limit for a quota type:
     * -1 = Unlimited, 0 = Disabled, > 0 = Specific numeric cap in base units.
     */
    public long getRawLimit(String tenantCode, QuotaType type) {
        if (tenantCode == null || tenantCode.isBlank()) {
            return -1L;
        }
        String key = String.format(CACHE_KEY_LIMITS, tenantCode);
        try {
            if (Boolean.FALSE.equals(redis.hasKey(key))) {
                loadTenantSubscriptionIntoCache(tenantCode);
            }
            Object limitObj = redis.opsForHash().get(key, type.name());
            if (limitObj != null) {
                return Long.parseLong(limitObj.toString());
            }
        } catch (Exception ex) {
            log.warn("Failed to read limit {} from Redis for tenant {}, falling back to DB", type, tenantCode, ex);
        }
        ResolvedSubscription resolved = resolveSubscriptionAndPlan(tenantCode);
        return extractRawLimit(resolved.subscription(), resolved.plan(), type);
    }

    public long getCapacityLimit(String tenantCode, QuotaType type, int defaultMax) {
        long raw = getRawLimit(tenantCode, type);
        if (raw < 0) {
            return Long.MAX_VALUE;
        }
        return raw;
    }

    public long getCurrentUsage(String tenantCode, QuotaType type) {
        if (tenantCode == null || tenantCode.isBlank()) {
            return 0L;
        }
        String monthStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        String key = String.format(CACHE_KEY_USAGE, tenantCode, monthStr);
        try {
            ensureUsageLoaded(tenantCode, monthStr);
            Object val = redis.opsForHash().get(key, type.name());
            if (val != null) {
                return Math.max(0L, Long.parseLong(val.toString()));
            }
        } catch (Exception ex) {
            log.warn("Failed to read usage {} from Redis for tenant {}", type, tenantCode, ex);
        }
        return queryDbUsageForCurrentMonth(tenantCode, type);
    }

    public void syncActiveJobsCount(String tenantCode, long activeJobsCount) {
        if (tenantCode == null || tenantCode.isBlank() || "smarthire_master".equals(tenantCode)) {
            return;
        }
        updateAbsoluteDailyMetric(tenantCode, QuotaType.ACTIVE_JOBS, activeJobsCount);
    }

    public void evictCache(String tenantCode) {
        if (tenantCode == null || tenantCode.isBlank()) {
            return;
        }
        try {
            redis.delete(String.format(CACHE_KEY_FEATURES, tenantCode));
            redis.delete(String.format(CACHE_KEY_LIMITS, tenantCode));
            redis.delete(String.format(CACHE_KEY_STATUS, tenantCode));
            log.info("Evicted subscription quota cache for tenant: {}", tenantCode);
        } catch (Exception ex) {
            log.warn("Failed to evict quota cache for tenant {}", tenantCode, ex);
        }
    }

    public void evictAllTenantPlanCaches() {
        try {
            Set<String> limitKeys = redis.keys("sub:tenant:*:limits");
            if (limitKeys != null && !limitKeys.isEmpty()) {
                redis.delete(limitKeys);
            }
            Set<String> featureKeys = redis.keys("sub:tenant:*:features");
            if (featureKeys != null && !featureKeys.isEmpty()) {
                redis.delete(featureKeys);
            }
            Set<String> statusKeys = redis.keys("sub:tenant:*:status");
            if (statusKeys != null && !statusKeys.isEmpty()) {
                redis.delete(statusKeys);
            }
        } catch (Exception ex) {
            log.warn("Failed to evict all tenant plan caches", ex);
        }
    }

    public ResolvedSubscription resolveSubscriptionAndPlan(String tenantCode) {
        TenantInfo tenant = null;
        if (tenantInfoRepository != null && tenantCode != null && !tenantCode.isBlank()) {
            tenant = tenantInfoRepository.findByCode(tenantCode).orElse(null);
            if (tenant == null) {
                tenant = tenantInfoRepository.findBySubdomain(tenantCode).orElse(null);
            }
        }

        TenantSubscription targetSub = null;
        SubscriptionPlan plan = null;

        if (tenant != null && subscriptionRepository != null) {
            final Long tenantId = tenant.getId();
            targetSub = subscriptionRepository
                    .findFirstByTenantIdAndStatusInOrderByCreatedAtDesc(tenantId, OPERATIONAL_SUBSCRIPTION_STATUSES)
                    .orElseGet(() -> subscriptionRepository
                            .findFirstByTenantIdAndStatusOrderByCreatedAtDesc(tenantId, "ACTIVE")
                            .orElseGet(() -> {
                                List<TenantSubscription> allSubs = subscriptionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
                                if (allSubs == null || allSubs.isEmpty()) {
                                    return null;
                                }
                                return allSubs.stream()
                                        .filter(s -> s.getStatus() != null && OPERATIONAL_SUBSCRIPTION_STATUSES.contains(s.getStatus().toUpperCase()))
                                        .findFirst()
                                        .orElseGet(() -> allSubs.stream()
                                                .filter(s -> s.getStatus() != null && Set.of("SUSPENDED", "CANCELED", "CANCELLED", "EXPIRED").contains(s.getStatus().toUpperCase()))
                                                .findFirst()
                                                .orElse(null));
                            }));

            // Check if a PAST_DUE subscription has exceeded its grace period
            if (targetSub != null && "PAST_DUE".equalsIgnoreCase(targetSub.getStatus())
                    && targetSub.getGracePeriodEndsAt() != null
                    && java.time.LocalDateTime.now().isAfter(targetSub.getGracePeriodEndsAt())) {
                targetSub.setStatus("SUSPENDED");
            }

            if (targetSub != null && planRepository != null && targetSub.getPlanId() != null) {
                plan = planRepository.findById(targetSub.getPlanId()).orElse(null);
            }
        }

        // Fallback to STARTER plan if tenant does not have a subscription record yet
        if (plan == null && planRepository != null) {
            plan = planRepository.findByCode("STARTER").orElse(null);
        }

        if (plan == null) {
            plan = defaultStarterPlan();
        }

        return new ResolvedSubscription(tenant, targetSub, plan);
    }

    private void loadTenantSubscriptionIntoCache(String tenantCode) {
        log.info("Loading subscription plan into Redis cache for tenant: {}", tenantCode);
        ResolvedSubscription resolved = resolveSubscriptionAndPlan(tenantCode);
        TenantSubscription sub = resolved.subscription();
        SubscriptionPlan plan = resolved.plan();

        String featureKey = String.format(CACHE_KEY_FEATURES, tenantCode);
        String limitKey = String.format(CACHE_KEY_LIMITS, tenantCode);
        String statusKey = String.format(CACHE_KEY_STATUS, tenantCode);

        redis.delete(featureKey);
        redis.delete(limitKey);
        redis.delete(statusKey);

        String effectiveStatus = sub != null && sub.getStatus() != null ? sub.getStatus().toUpperCase() : "ACTIVE";
        if ( redis.opsForValue() != null) {
            redis.opsForValue().set(statusKey, effectiveStatus, 24, TimeUnit.HOURS);
        }

        String featuresSource = (sub != null && sub.getSnapshotFeaturesJson() != null && !sub.getSnapshotFeaturesJson().isBlank())
                ? sub.getSnapshotFeaturesJson()
                : (plan != null ? plan.getFeaturesJson() : null);

        List<String> features = parseFeatures(featuresSource);
        if (!features.isEmpty()) {
            redis.opsForSet().add(featureKey, features.toArray(new String[0]));
            redis.expire(featureKey, 24, TimeUnit.HOURS);
        }

        for (QuotaType quotaType : List.of(
                QuotaType.ACTIVE_JOBS,
                QuotaType.CV_PARSE,
                QuotaType.AI_VOICE_SECONDS,
                QuotaType.PROCTORING_SECONDS,
                QuotaType.STORAGE_BYTES,
                QuotaType.VIDEO_RETENTION_DAYS)) {
            long rawLimit = extractRawLimit(sub, plan, quotaType);
            redis.opsForHash().put(limitKey, quotaType.name(), String.valueOf(rawLimit));
        }

        redis.expire(limitKey, 24, TimeUnit.HOURS);
    }

    private void ensureUsageLoaded(String tenantCode, String monthStr) {
        String key = String.format(CACHE_KEY_USAGE, tenantCode, monthStr);
        if (Boolean.TRUE.equals(redis.hasKey(key))) {
            return;
        }
        long cvUsed = queryDbUsageForCurrentMonth(tenantCode, QuotaType.CV_PARSE);
        long aiVoiceUsed = queryDbUsageForCurrentMonth(tenantCode, QuotaType.AI_VOICE_SECONDS);
        long proctoringUsed = queryDbUsageForCurrentMonth(tenantCode, QuotaType.PROCTORING_SECONDS);
        long storageUsed = queryDbUsageForCurrentMonth(tenantCode, QuotaType.STORAGE_BYTES);

        redis.opsForHash().put(key, QuotaType.CV_PARSE.name(), String.valueOf(cvUsed));
        redis.opsForHash().put(key, QuotaType.AI_VOICE_SECONDS.name(), String.valueOf(aiVoiceUsed));
        redis.opsForHash().put(key, QuotaType.PROCTORING_SECONDS.name(), String.valueOf(proctoringUsed));
        redis.opsForHash().put(key, QuotaType.STORAGE_BYTES.name(), String.valueOf(storageUsed));
        redis.expire(key, 60, TimeUnit.DAYS);
    }

    private long queryDbUsageForCurrentMonth(String tenantCode, QuotaType type) {
        if (tenantInfoRepository == null || usageDailyRepository == null) {
            return 0L;
        }
        try {
            Optional<TenantInfo> tenantOpt = tenantInfoRepository.findByCode(tenantCode);
            if (tenantOpt.isEmpty()) {
                return 0L;
            }
            Long tenantId = tenantOpt.get().getId();
            LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
            LocalDate today = LocalDate.now();
            return switch (type) {
                case CV_PARSE -> usageDailyRepository.sumCvParsesForPeriod(tenantId, startOfMonth, today);
                case AI_VOICE_SECONDS -> usageDailyRepository.sumAiVoiceSecondsForPeriod(tenantId, startOfMonth, today);
                case PROCTORING_SECONDS -> usageDailyRepository.sumProctoringSecondsForPeriod(tenantId, startOfMonth, today);
                case STORAGE_BYTES -> usageDailyRepository.findByTenantIdAndUsageDateBetweenOrderByUsageDateAsc(tenantId, startOfMonth, today)
                        .stream()
                        .mapToLong(u -> u.getStorageBytes() != null ? u.getStorageBytes() : 0L)
                        .max()
                        .orElse(0L);
                default -> 0L;
            };
        } catch (Exception ex) {
            log.warn("Failed to query DB usage for tenant {} type {}", tenantCode, type, ex);
            return 0L;
        }
    }

    private void recordDailyUsage(String tenantCode, QuotaType type, long delta) {
        if (tenantInfoRepository == null || usageDailyRepository == null || delta == 0) {
            return;
        }
        try {
            Optional<TenantInfo> tenantOpt = tenantInfoRepository.findByCode(tenantCode);
            if (tenantOpt.isEmpty()) {
                return;
            }
            Long tenantId = tenantOpt.get().getId();
            LocalDate today = LocalDate.now();
            TenantUsageDaily daily = usageDailyRepository.findByTenantIdAndUsageDate(tenantId, today)
                    .orElseGet(() -> TenantUsageDaily.builder()
                            .tenantId(tenantId)
                            .usageDate(today)
                            .build());

            switch (type) {
                case CV_PARSE -> daily.setCvParsesCount((int) Math.max(0L, (daily.getCvParsesCount() != null ? daily.getCvParsesCount() : 0) + delta));
                case AI_VOICE_SECONDS -> daily.setAiVoiceSeconds((int) Math.max(0L, (daily.getAiVoiceSeconds() != null ? daily.getAiVoiceSeconds() : 0) + delta));
                case PROCTORING_SECONDS -> daily.setProctoringSeconds((int) Math.max(0L, (daily.getProctoringSeconds() != null ? daily.getProctoringSeconds() : 0) + delta));
                case STORAGE_BYTES -> daily.setStorageBytes(Math.max(0L, (daily.getStorageBytes() != null ? daily.getStorageBytes() : 0L) + delta));
                case AI_TOKENS -> daily.setAiTokensConsumed(Math.max(0L, (daily.getAiTokensConsumed() != null ? daily.getAiTokensConsumed() : 0L) + delta));
                default -> {}
            }
            usageDailyRepository.save(daily);
        } catch (Exception ex) {
            log.warn("Failed to record daily usage in Master DB for tenant {} type {}", tenantCode, type, ex);
        }
    }

    private void updateAbsoluteDailyMetric(String tenantCode, QuotaType type, long absoluteValue) {
        if (tenantInfoRepository == null || usageDailyRepository == null) {
            return;
        }
        try {
            Optional<TenantInfo> tenantOpt = tenantInfoRepository.findByCode(tenantCode);
            if (tenantOpt.isEmpty()) {
                return;
            }
            Long tenantId = tenantOpt.get().getId();
            LocalDate today = LocalDate.now();
            TenantUsageDaily daily = usageDailyRepository.findByTenantIdAndUsageDate(tenantId, today)
                    .orElseGet(() -> TenantUsageDaily.builder()
                            .tenantId(tenantId)
                            .usageDate(today)
                            .build());

            if (type == QuotaType.STORAGE_BYTES) {
                daily.setStorageBytes(Math.max(0L, absoluteValue));
            } else if (type == QuotaType.ACTIVE_JOBS) {
                daily.setActiveJobsCount((int) Math.max(0L, absoluteValue));
            }
            usageDailyRepository.save(daily);
        } catch (Exception ex) {
            log.warn("Failed to update daily metric {} in Master DB for tenant {}", type, tenantCode, ex);
        }
    }

    /**
     * Resolves raw limit from the Tier 2 TenantSubscription snapshot if present; otherwise falls back to Tier 1 SubscriptionPlan.
     */
    public static long extractRawLimit(TenantSubscription sub, SubscriptionPlan plan, QuotaType type) {
        boolean hasSnapshot = sub != null && (sub.getPlanCodeSnapshot() != null
                || sub.getSnapshotMaxJobs() != null
                || sub.getSnapshotMaxCvParses() != null);
        if (hasSnapshot) {
            return switch (type) {
                case ACTIVE_JOBS -> normalizeLimit(sub.getSnapshotMaxJobs(), 1L);
                case CV_PARSE -> normalizeLimit(sub.getSnapshotMaxCvParses(), 1L);
                case AI_VOICE_SECONDS -> normalizeLimit(sub.getSnapshotMaxAiInterviewHours(), SECONDS_PER_HOUR);
                case PROCTORING_SECONDS -> normalizeLimit(sub.getSnapshotMaxProctoringHours(), SECONDS_PER_HOUR);
                case STORAGE_BYTES -> normalizeLimit(sub.getSnapshotMaxStorageGb(), BYTES_PER_GB);
                case VIDEO_RETENTION_DAYS -> normalizeLimit(sub.getSnapshotVideoRetentionDays(), 1L);
                default -> -1L;
            };
        }
        return extractRawLimitFromPlan(plan, type);
    }

    public static long extractRawLimitFromPlan(SubscriptionPlan plan, QuotaType type) {
        if (plan == null) {
            return -1L;
        }
        return switch (type) {
            case ACTIVE_JOBS -> normalizeLimit(plan.getMaxJobs(), 1L);
            case CV_PARSE -> normalizeLimit(plan.getMaxCvParses(), 1L);
            case AI_VOICE_SECONDS -> normalizeLimit(plan.getMaxAiInterviewHours(), SECONDS_PER_HOUR);
            case PROCTORING_SECONDS -> normalizeLimit(plan.getMaxProctoringHours(), SECONDS_PER_HOUR);
            case STORAGE_BYTES -> normalizeLimit(plan.getMaxStorageGb(), BYTES_PER_GB);
            case VIDEO_RETENTION_DAYS -> normalizeLimit(plan.getVideoRetentionDays(), 1L);
            default -> -1L;
        };
    }

    private static long normalizeLimit(Integer value, long multiplier) {
        if (value == null || value < 0) {
            return -1L; // Unlimited
        }
        if (value == 0) {
            return 0L; // Feature disabled
        }
        return value.longValue() * multiplier;
    }

    public List<String> parseFeatures(String featuresJson) {
        List<String> result = new ArrayList<>();
        if (featuresJson == null || featuresJson.isBlank() || objectMapper == null) {
            return result;
        }
        try {
            JsonNode root = objectMapper.readTree(featuresJson);
            JsonNode arrayNode = root.isArray() ? root : root.get("features");
            if (arrayNode != null && arrayNode.isArray()) {
                for (JsonNode item : arrayNode) {
                    if (item.isTextual() && !item.asText().isBlank()) {
                        result.add(item.asText().trim());
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse featuresJson: {}", featuresJson, e);
        }
        return result;
    }

    private static SubscriptionPlan defaultStarterPlan() {
        return SubscriptionPlan.builder()
                .code("STARTER")
                .name("Gói Khởi Đầu (Starter)")
                .description("Dành cho doanh nghiệp nhỏ và công ty khởi nghiệp có nhu cầu tự động hóa bước đầu.")
                .priceYearly(BigDecimal.valueOf(12_000_000))
                .maxJobs(5)
                .maxCvParses(200)
                .maxAiInterviewHours(5)
                .maxStorageGb(5)
                .maxProctoringHours(2)
                .videoRetentionDays(30)
                .status("ACTIVE")
                .build();
    }

    private static String disabledMessage(QuotaType type) {
        return switch (type) {
            case ACTIVE_JOBS -> "Gói dịch vụ hiện tại không cho phép tạo vị trí tuyển dụng. Vui lòng nâng cấp gói cước.";
            case CV_PARSE -> "Gói dịch vụ hiện tại không hỗ trợ sàng lọc CV bằng AI. Vui lòng nâng cấp gói cước.";
            case AI_VOICE_SECONDS -> "Gói dịch vụ hiện tại không hỗ trợ Phỏng vấn AI (0 giờ). Vui lòng nâng cấp gói cước để sử dụng.";
            case PROCTORING_SECONDS -> "Gói dịch vụ hiện tại không hỗ trợ Giám sát thi Proctoring (0 giờ). Vui lòng nâng cấp gói cước.";
            case STORAGE_BYTES -> "Gói dịch vụ hiện tại không cấp phát dung lượng lưu trữ (0 GB). Vui lòng nâng cấp gói cước.";
            case VIDEO_RETENTION_DAYS -> "Gói dịch vụ hiện tại không hỗ trợ lưu trữ bản ghi âm/video phỏng vấn. Vui lòng nâng cấp gói cước.";
            default -> "Tính năng này không nằm trong gói dịch vụ hiện tại. Vui lòng nâng cấp gói cước.";
        };
    }

    private static String exceededMessage(QuotaType type, long limit) {
        return switch (type) {
            case ACTIVE_JOBS -> "Đã đạt giới hạn tối đa " + limit + " vị trí tuyển dụng đang mở của gói dịch vụ hiện tại. Vui lòng đóng bớt vị trí cũ hoặc nâng cấp gói cước.";
            case CV_PARSE -> "Đã sử dụng hết hạn mức " + limit + " lượt sàng lọc CV bằng AI của gói dịch vụ hiện tại. Vui lòng nâng cấp gói cước để tiếp tục.";
            case AI_VOICE_SECONDS -> "Đã sử dụng hết hạn mức " + Math.max(1L, limit / SECONDS_PER_HOUR) + " giờ Phỏng vấn AI của gói dịch vụ hiện tại. Vui lòng nâng cấp gói cước.";
            case PROCTORING_SECONDS -> "Đã sử dụng hết hạn mức " + Math.max(1L, limit / SECONDS_PER_HOUR) + " giờ Giám sát thi (Proctoring) của gói dịch vụ hiện tại. Vui lòng nâng cấp gói cước.";
            case STORAGE_BYTES -> "Dung lượng lưu trữ của doanh nghiệp đã đạt giới hạn " + Math.max(1L, limit / BYTES_PER_GB) + " GB của gói dịch vụ hiện tại. Vui lòng nâng cấp gói cước.";
            default -> "Đã đạt giới hạn sử dụng của gói dịch vụ hiện tại. Vui lòng nâng cấp gói cước.";
        };
    }
}
