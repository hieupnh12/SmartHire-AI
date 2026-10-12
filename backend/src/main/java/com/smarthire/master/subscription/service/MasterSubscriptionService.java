package com.smarthire.master.subscription.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.entity.TenantSubscription;
import com.smarthire.domain.master.repository.SubscriptionPlanRepository;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.domain.master.repository.TenantSubscriptionRepository;
import com.smarthire.master.subscription.dto.*;
import com.smarthire.master.subscription.mapper.SubscriptionPlanMapper;
import com.smarthire.multitenancy.quota.TenantQuotaRedisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MasterSubscriptionService {

    public static final int DEFAULT_GRACE_PERIOD_DAYS = 5;
    private static final Set<String> ALLOWED_PLAN_STATUSES = Set.of("ACTIVE", "INACTIVE", "ARCHIVED");
    private static final Set<String> ALLOWED_SUBSCRIPTION_STATUSES = Set.of(
            "TRIAL", "PENDING", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELED", "EXPIRED"
    );

    private final SubscriptionPlanRepository planRepository;
    private final SubscriptionPlanMapper planMapper;

    @Autowired(required = false)
    private TenantSubscriptionRepository subscriptionRepository;

    @Autowired(required = false)
    private TenantInfoRepository tenantInfoRepository;

    @Autowired(required = false)
    private TenantQuotaRedisService quotaRedisService;

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public List<SubscriptionPlanResponse> getAllPlans() {
        return planRepository.findAll().stream()
                .map(this::enrichPlanResponse)
                .collect(Collectors.toList());
    }

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public SubscriptionPlanResponse getPlanById(Long id) {
        SubscriptionPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Subscription plan not found: " + id));
        return enrichPlanResponse(plan);
    }

    @Transactional("masterTransactionManager")
    public SubscriptionPlanResponse createPlan(CreateSubscriptionPlanRequest request) {
        String normalizedCode = request.getCode().trim().toUpperCase();
        if (planRepository.findByCode(normalizedCode).isPresent()) {
            throw new IllegalArgumentException("Plan code '" + normalizedCode + "' already exists.");
        }
        SubscriptionPlan plan = planMapper.toEntity(request);
        plan.setCode(normalizedCode);
        if (plan.getPriceYearly() == null) {
            plan.setPriceYearly(BigDecimal.ZERO);
        }
        if (plan.getVersion() == null || plan.getVersion() < 1) {
            plan.setVersion(1);
        }
        plan.setCustom(Boolean.TRUE.equals(request.getCustom()) || request.getTargetTenantId() != null);
        plan.setTargetTenantId(request.getTargetTenantId());
        plan.setArchived(false);
        plan.setStatus("ACTIVE");
        plan = planRepository.save(plan);
        return enrichPlanResponse(plan);
    }

    /**
     * Tier 1 Immutability & Versioning (Grandfathering):
     * - If the plan has active/historical tenant subscriptions, DO NOT overwrite in-place.
     *   Instead, archive the old version (Plan V1) so existing tenants keep their contracted pricing/quotas,
     *   and create a new version (Plan V2) with the canonical code for new sales.
     * - If no tenant has ever subscribed to this plan, update in-place.
     */
    @Transactional("masterTransactionManager")
    public SubscriptionPlanResponse updatePlan(Long id, UpdateSubscriptionPlanRequest request) {
        SubscriptionPlan existing = planRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Subscription plan not found: " + id));

        boolean hasSubscribers = subscriptionRepository != null && subscriptionRepository.existsByPlanId(id);

        if (hasSubscribers) {
            String canonicalCode = existing.getCode();
            int currentVersion = existing.getVersion() != null ? existing.getVersion() : 1;
            String archivedCode = canonicalCode + "_V" + currentVersion + "_" + existing.getId();

            existing.setCode(archivedCode);
            existing.setArchived(true);
            existing.setStatus("ARCHIVED");
            planRepository.saveAndFlush(existing);

            SubscriptionPlan nextVersion = SubscriptionPlan.builder()
                    .code(canonicalCode)
                    .name(request.getName())
                    .description(request.getDescription())
                    .priceYearly(request.getPriceYearly() != null ? request.getPriceYearly() : BigDecimal.ZERO)
                    .maxJobs(request.getMaxJobs())
                    .maxCvParses(request.getMaxCvParses())
                    .maxAiInterviewHours(request.getMaxAiInterviewHours())
                    .maxStorageGb(request.getMaxStorageGb())
                    .maxProctoringHours(request.getMaxProctoringHours())
                    .videoRetentionDays(request.getVideoRetentionDays())
                    .featuresJson(request.getFeaturesJson() != null ? request.getFeaturesJson() : existing.getFeaturesJson())
                    .version(currentVersion + 1)
                    .parentPlanId(existing.getId())
                    .custom(existing.isCustom())
                    .targetTenantId(existing.getTargetTenantId())
                    .archived(false)
                    .status("ACTIVE")
                    .build();

            nextVersion = planRepository.save(nextVersion);
            log.info("Archived plan {} (v{}) as {} and created new version v{} (id={}) to protect existing subscribers (Grandfathering)",
                    canonicalCode, currentVersion, archivedCode, nextVersion.getVersion(), nextVersion.getId());
            return enrichPlanResponse(nextVersion);
        }

        planMapper.updateEntity(request, existing);
        existing = planRepository.save(existing);
        if (quotaRedisService != null) {
            quotaRedisService.evictAllTenantPlanCaches();
        }
        return enrichPlanResponse(existing);
    }

    @Transactional("masterTransactionManager")
    public SubscriptionPlanResponse updatePlanStatus(Long id, String status) {
        SubscriptionPlan existing = planRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Subscription plan not found: " + id));

        String normalized = status != null ? status.trim().toUpperCase() : "ACTIVE";
        if (!ALLOWED_PLAN_STATUSES.contains(normalized)) {
            throw new BusinessException("Invalid plan status: " + status, HttpStatus.BAD_REQUEST, "INVALID_PLAN_STATUS");
        }

        existing.setStatus(normalized);
        existing.setArchived("ARCHIVED".equals(normalized));
        existing = planRepository.save(existing);
        return enrichPlanResponse(existing);
    }

    /**
     * Tier 1 Custom Enterprise Plan:
     * Clones a template plan and customizes quotas/pricing exclusively for a single Enterprise Tenant
     * without exposing it on the public pricing page.
     */
    @Transactional("masterTransactionManager")
    public SubscriptionPlanResponse cloneCustomPlanForTenant(Long templatePlanId, CloneCustomPlanRequest request) {
        SubscriptionPlan template = planRepository.findById(templatePlanId)
                .orElseThrow(() -> new BusinessException("Gói mẫu không tồn tại: " + templatePlanId, HttpStatus.NOT_FOUND, "PLAN_NOT_FOUND"));

        TenantInfo tenant = null;
        if (tenantInfoRepository != null) {
            tenant = tenantInfoRepository.findById(request.getTargetTenantId())
                    .orElseThrow(() -> new BusinessException("Doanh nghiệp không tồn tại: " + request.getTargetTenantId(), HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND"));
        }

        String tenantSuffix = tenant != null ? tenant.getCode().toUpperCase() : ("T" + request.getTargetTenantId());
        String customCode = StringUtils.hasText(request.getCustomCode())
                ? request.getCustomCode().trim().toUpperCase()
                : (template.getCode() + "_CUSTOM_" + tenantSuffix + "_" + (System.currentTimeMillis() % 10000));

        SubscriptionPlan customPlan = SubscriptionPlan.builder()
                .code(customCode)
                .name(StringUtils.hasText(request.getName())
                        ? request.getName().trim()
                        : (template.getName() + " (Custom - " + (tenant != null ? tenant.getName() : tenantSuffix) + ")"))
                .description(StringUtils.hasText(request.getDescription()) ? request.getDescription() : template.getDescription())
                .priceYearly(request.getPriceYearly() != null ? request.getPriceYearly() : template.getPriceYearly())
                .maxJobs(request.getMaxJobs() != null ? request.getMaxJobs() : template.getMaxJobs())
                .maxCvParses(request.getMaxCvParses() != null ? request.getMaxCvParses() : template.getMaxCvParses())
                .maxAiInterviewHours(request.getMaxAiInterviewHours() != null ? request.getMaxAiInterviewHours() : template.getMaxAiInterviewHours())
                .maxStorageGb(request.getMaxStorageGb() != null ? request.getMaxStorageGb() : template.getMaxStorageGb())
                .maxProctoringHours(request.getMaxProctoringHours() != null ? request.getMaxProctoringHours() : template.getMaxProctoringHours())
                .videoRetentionDays(request.getVideoRetentionDays() != null ? request.getVideoRetentionDays() : template.getVideoRetentionDays())
                .featuresJson(StringUtils.hasText(request.getFeaturesJson()) ? request.getFeaturesJson() : template.getFeaturesJson())
                .version(1)
                .parentPlanId(template.getId())
                .custom(true)
                .targetTenantId(request.getTargetTenantId())
                .archived(false)
                .status("ACTIVE")
                .build();

        customPlan = planRepository.save(customPlan);

        if (!Boolean.FALSE.equals(request.getActivateImmediately()) && subscriptionRepository != null) {
            AssignTenantSubscriptionRequest assignReq = AssignTenantSubscriptionRequest.builder()
                    .planId(customPlan.getId())
                    .status("ACTIVE")
                    .build();
            assignOrCustomizeTenantSubscription(request.getTargetTenantId(), assignReq);
        }

        return enrichPlanResponse(customPlan);
    }

    /**
     * Tier 2 Tenant Subscription Instance Management:
     * Retrieves the active or latest subscription instance with its immutable snapshot for a tenant.
     */
    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public TenantSubscriptionInstanceResponse getTenantSubscriptionInstance(Long tenantId) {
        if (subscriptionRepository == null) {
            return null;
        }
        TenantInfo tenant = tenantInfoRepository != null ? tenantInfoRepository.findById(tenantId).orElse(null) : null;
        TenantSubscription sub = subscriptionRepository
                .findFirstByTenantIdAndStatusInOrderByCreatedAtDesc(tenantId, TenantQuotaRedisService.OPERATIONAL_SUBSCRIPTION_STATUSES)
                .orElseGet(() -> subscriptionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream()
                        .findFirst()
                        .orElse(null));
        if (sub == null) {
            return null;
        }
        SubscriptionPlan nextPlan = sub.getNextPlanId() != null
                ? planRepository.findById(sub.getNextPlanId()).orElse(null)
                : null;
        return TenantSubscriptionInstanceResponse.from(
                sub,
                tenant != null ? tenant.getCode() : null,
                tenant != null ? tenant.getName() : null,
                nextPlan != null ? nextPlan.getCode() : null,
                nextPlan != null ? nextPlan.getName() : null
        );
    }

    /**
     * Tier 2 Tenant Subscription Instance Assignment / Customization:
     * Snapshots all resources from the selected plan (plus any tenant-specific custom overrides) onto tenant_subscriptions.
     */
    @Transactional("masterTransactionManager")
    public TenantSubscriptionInstanceResponse assignOrCustomizeTenantSubscription(
            Long tenantId,
            AssignTenantSubscriptionRequest request) {
        if (subscriptionRepository == null) {
            throw new IllegalStateException("TenantSubscriptionRepository is not available");
        }
        TenantInfo tenant = tenantInfoRepository != null
                ? tenantInfoRepository.findById(tenantId)
                        .orElseThrow(() -> new BusinessException("Doanh nghiệp không tồn tại: " + tenantId, HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND"))
                : null;

        TenantSubscription existingActive = subscriptionRepository
                .findFirstByTenantIdAndStatusInOrderByCreatedAtDesc(tenantId, TenantQuotaRedisService.OPERATIONAL_SUBSCRIPTION_STATUSES)
                .orElseGet(() -> subscriptionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream()
                        .findFirst()
                        .orElse(null));

        SubscriptionPlan plan = null;
        if (request.getPlanId() != null) {
            plan = planRepository.findById(request.getPlanId())
                    .orElseThrow(() -> new BusinessException("Gói dịch vụ không tồn tại: " + request.getPlanId(), HttpStatus.NOT_FOUND, "PLAN_NOT_FOUND"));
        } else if (StringUtils.hasText(request.getPlanCode())) {
            plan = planRepository.findByCode(request.getPlanCode().trim().toUpperCase())
                    .orElseThrow(() -> new BusinessException("Gói dịch vụ không tồn tại: " + request.getPlanCode(), HttpStatus.NOT_FOUND, "PLAN_NOT_FOUND"));
        } else if (existingActive != null && existingActive.getPlanId() != null) {
            plan = planRepository.findById(existingActive.getPlanId()).orElse(null);
        }

        LocalDateTime now = LocalDateTime.now();
        boolean isPlanSwitch = existingActive != null && plan != null && !plan.getId().equals(existingActive.getPlanId());

        TenantSubscription targetSub;
        if (existingActive == null || isPlanSwitch) {
            if (existingActive != null && isPlanSwitch) {
                existingActive.setStatus("CANCELED");
                existingActive.setCanceledAt(now);
                existingActive.setCancelReason("REPLACED_BY_ADMIN_ASSIGNMENT");
                subscriptionRepository.save(existingActive);
            }
            if (plan == null) {
                throw new BusinessException("Cần chọn gói dịch vụ khi khởi tạo thuê bao mới", HttpStatus.BAD_REQUEST, "PLAN_REQUIRED");
            }
            targetSub = TenantSubscription.builder()
                    .tenantId(tenantId)
                    .planId(plan.getId())
                    .status("ACTIVE")
                    .startsAt(request.getStartsAt() != null ? request.getStartsAt() : now)
                    .endsAt(request.getEndsAt() != null ? request.getEndsAt() : now.plusYears(1))
                    .autoRenew(request.getAutoRenew() != null ? request.getAutoRenew() : true)
                    .upgradedFromSubscriptionId(existingActive != null ? existingActive.getId() : null)
                    .build();
            targetSub.applyPlanSnapshot(plan);
        } else {
            targetSub = existingActive;
            if (plan != null && targetSub.getPlanCodeSnapshot() == null) {
                targetSub.applyPlanSnapshot(plan);
            }
            if (request.getStartsAt() != null) {
                targetSub.setStartsAt(request.getStartsAt());
            }
            if (request.getEndsAt() != null) {
                targetSub.setEndsAt(request.getEndsAt());
            }
            if (request.getAutoRenew() != null) {
                targetSub.setAutoRenew(request.getAutoRenew());
            }
        }

        // Apply custom B2B overrides to the tenant subscription snapshot if provided
        if (request.getCustomPriceYearly() != null) {
            targetSub.setContractedPriceYearly(request.getCustomPriceYearly());
        }
        if (request.getCustomMaxJobs() != null) {
            targetSub.setSnapshotMaxJobs(request.getCustomMaxJobs());
        }
        if (request.getCustomMaxCvParses() != null) {
            targetSub.setSnapshotMaxCvParses(request.getCustomMaxCvParses());
        }
        if (request.getCustomMaxAiInterviewHours() != null) {
            targetSub.setSnapshotMaxAiInterviewHours(request.getCustomMaxAiInterviewHours());
        }
        if (request.getCustomMaxStorageGb() != null) {
            targetSub.setSnapshotMaxStorageGb(request.getCustomMaxStorageGb());
        }
        if (request.getCustomMaxProctoringHours() != null) {
            targetSub.setSnapshotMaxProctoringHours(request.getCustomMaxProctoringHours());
        }
        if (request.getCustomVideoRetentionDays() != null) {
            targetSub.setSnapshotVideoRetentionDays(request.getCustomVideoRetentionDays());
        }
        if (StringUtils.hasText(request.getCustomFeaturesJson())) {
            targetSub.setSnapshotFeaturesJson(request.getCustomFeaturesJson());
        }

        if (StringUtils.hasText(request.getStatus())) {
            String nextStatus = request.getStatus().trim().toUpperCase();
            if (!ALLOWED_SUBSCRIPTION_STATUSES.contains(nextStatus)) {
                throw new BusinessException("Trạng thái thuê bao không hợp lệ: " + nextStatus, HttpStatus.BAD_REQUEST, "INVALID_SUBSCRIPTION_STATUS");
            }
            targetSub.setStatus(nextStatus);
            if ("PAST_DUE".equals(nextStatus)) {
                int graceDays = request.getGracePeriodDays() != null
                        ? Math.max(3, Math.min(7, request.getGracePeriodDays()))
                        : DEFAULT_GRACE_PERIOD_DAYS;
                targetSub.setGracePeriodEndsAt(now.plusDays(graceDays));
            } else if ("CANCELED".equals(nextStatus)) {
                targetSub.setCanceledAt(now);
            } else if ("ACTIVE".equals(nextStatus) || "TRIAL".equals(nextStatus)) {
                targetSub.setGracePeriodEndsAt(null);
            }
        }

        targetSub = subscriptionRepository.save(targetSub);

        if (tenant != null && quotaRedisService != null) {
            quotaRedisService.evictCache(tenant.getCode());
        }

        SubscriptionPlan nextPlan = targetSub.getNextPlanId() != null
                ? planRepository.findById(targetSub.getNextPlanId()).orElse(null)
                : null;
        return TenantSubscriptionInstanceResponse.from(
                targetSub,
                tenant != null ? tenant.getCode() : null,
                tenant != null ? tenant.getName() : null,
                nextPlan != null ? nextPlan.getCode() : null,
                nextPlan != null ? nextPlan.getName() : null
        );
    }

    /**
     * Tier 2 Lifecycle State Machine Scheduler:
     * 1. TRIAL / ACTIVE past ends_at ->
     *    - If next_plan_id is set (Scheduled Downgrade at end of cycle), transitions to the downgraded plan.
     *    - Otherwise transitions to PAST_DUE with a 5-day grace period (3-7 days standard).
     * 2. PAST_DUE past grace_period_ends_at -> SUSPENDED (locks resource creation).
     * 3. SUSPENDED for > 30 days -> CANCELED.
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional("masterTransactionManager")
    public int processSubscriptionLifecycleTransitions() {
        if (subscriptionRepository == null) {
            return 0;
        }
        LocalDateTime now = LocalDateTime.now();
        int transitionedCount = 0;

        // 1. TRIAL / ACTIVE subscriptions that reached ends_at
        List<TenantSubscription> dueSubs = subscriptionRepository.findByStatusInAndEndsAtBefore(
                List.of("TRIAL", "ACTIVE"), now);
        for (TenantSubscription sub : dueSubs) {
            if (sub.getNextPlanId() != null) {
                SubscriptionPlan downgradedPlan = planRepository.findById(sub.getNextPlanId()).orElse(null);
                if (downgradedPlan != null) {
                    sub.setStatus("EXPIRED");
                    sub.setCancelReason("DOWNGRADED_AT_CYCLE_END");
                    subscriptionRepository.save(sub);

                    TenantSubscription nextSub = TenantSubscription.builder()
                            .tenantId(sub.getTenantId())
                            .planId(downgradedPlan.getId())
                            .status(sub.isAutoRenew() ? "PAST_DUE" : "SUSPENDED")
                            .startsAt(now)
                            .endsAt(now.plusYears(1))
                            .autoRenew(sub.isAutoRenew())
                            .gracePeriodEndsAt(sub.isAutoRenew() ? now.plusDays(DEFAULT_GRACE_PERIOD_DAYS) : null)
                            .upgradedFromSubscriptionId(sub.getId())
                            .build();
                    nextSub.applyPlanSnapshot(downgradedPlan);
                    subscriptionRepository.save(nextSub);
                    evictTenantCacheById(sub.getTenantId());
                    transitionedCount++;
                    continue;
                }
            }

            sub.setStatus("PAST_DUE");
            sub.setGracePeriodEndsAt(now.plusDays(DEFAULT_GRACE_PERIOD_DAYS));
            subscriptionRepository.save(sub);
            evictTenantCacheById(sub.getTenantId());
            transitionedCount++;
        }

        // 2. PAST_DUE subscriptions whose grace period has expired -> SUSPENDED
        List<TenantSubscription> pastGraceSubs = subscriptionRepository.findByStatusAndGracePeriodEndsAtBefore("PAST_DUE", now);
        for (TenantSubscription sub : pastGraceSubs) {
            sub.setStatus("SUSPENDED");
            subscriptionRepository.save(sub);
            evictTenantCacheById(sub.getTenantId());
            transitionedCount++;
        }

        // 3. SUSPENDED subscriptions past 30 days after grace period -> CANCELED
        List<TenantSubscription> longSuspendedSubs = subscriptionRepository.findByStatusAndGracePeriodEndsAtBefore(
                "SUSPENDED", now.minusDays(30));
        for (TenantSubscription sub : longSuspendedSubs) {
            sub.setStatus("CANCELED");
            sub.setCanceledAt(now);
            sub.setCancelReason("NON_PAYMENT_TIMEOUT");
            subscriptionRepository.save(sub);
            evictTenantCacheById(sub.getTenantId());
            transitionedCount++;
        }

        return transitionedCount;
    }

    private void evictTenantCacheById(Long tenantId) {
        if (tenantInfoRepository == null || quotaRedisService == null || tenantId == null) {
            return;
        }
        tenantInfoRepository.findById(tenantId)
                .ifPresent(t -> quotaRedisService.evictCache(t.getCode()));
    }

    private SubscriptionPlanResponse enrichPlanResponse(SubscriptionPlan plan) {
        SubscriptionPlanResponse response = planMapper.toResponse(plan);
        if (subscriptionRepository != null && plan.getId() != null) {
            response.setSubscriberCount(subscriptionRepository.countByPlanId(plan.getId()));
        } else {
            response.setSubscriberCount(0L);
        }
        return response;
    }
}
