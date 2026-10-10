package com.smarthire.multitenancy.quota;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.entity.TenantSubscription;
import com.smarthire.domain.master.repository.SubscriptionPlanRepository;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.domain.master.repository.TenantSubscriptionRepository;
import com.smarthire.domain.master.repository.TenantUsageDailyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TenantQuotaEnforcementTest {

    @Mock
    private StringRedisTemplate redis;
    @Mock
    private HashOperations<String, Object, Object> hashOps;
    @Mock
    private SetOperations<String, String> setOps;
    @Mock
    private TenantInfoRepository tenantInfoRepository;
    @Mock
    private TenantSubscriptionRepository subscriptionRepository;
    @Mock
    private SubscriptionPlanRepository planRepository;
    @Mock
    private TenantUsageDailyRepository usageDailyRepository;

    private TenantQuotaRedisService quotaService;
    private final Map<String, Map<String, String>> redisHashes = new HashMap<>();

    @BeforeEach
    void setUp() {
        redisHashes.clear();
        lenient().when(redis.opsForHash()).thenReturn(hashOps);
        lenient().when(redis.opsForSet()).thenReturn(setOps);
        lenient().when(redis.hasKey(anyString())).thenAnswer(inv -> redisHashes.containsKey(inv.getArgument(0)));

        lenient().doAnswer(inv -> {
            String key = inv.getArgument(0);
            String field = inv.getArgument(1).toString();
            String val = inv.getArgument(2).toString();
            redisHashes.computeIfAbsent(key, k -> new HashMap<>()).put(field, val);
            return null;
        }).when(hashOps).put(anyString(), any(), any());

        lenient().when(hashOps.get(anyString(), any())).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            String field = inv.getArgument(1).toString();
            Map<String, String> map = redisHashes.get(key);
            return map != null ? map.get(field) : null;
        });

        lenient().when(hashOps.increment(anyString(), any(), anyLong())).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            String field = inv.getArgument(1).toString();
            long delta = inv.getArgument(2);
            Map<String, String> map = redisHashes.computeIfAbsent(key, k -> new HashMap<>());
            long next = Long.parseLong(map.getOrDefault(field, "0")) + delta;
            map.put(field, String.valueOf(next));
            return next;
        });

        quotaService = new TenantQuotaRedisService(
                redis,
                tenantInfoRepository,
                subscriptionRepository,
                planRepository,
                usageDailyRepository,
                new ObjectMapper()
        );
    }

    private SubscriptionPlan starterPlan() {
        return SubscriptionPlan.builder()
                .id(1L)
                .code("STARTER")
                .name("Starter")
                .priceYearly(BigDecimal.valueOf(24_000_000L))
                .maxJobs(3)
                .maxCvParses(100)
                .maxAiInterviewHours(0)
                .maxStorageGb(2)
                .maxProctoringHours(0)
                .videoRetentionDays(0)
                .featuresJson("{\"features\":[\"Quản lý tin tuyển dụng\"]}")
                .status("ACTIVE")
                .build();
    }

    private SubscriptionPlan enterprisePlan() {
        return SubscriptionPlan.builder()
                .id(3L)
                .code("ENTERPRISE")
                .name("Enterprise")
                .priceYearly(BigDecimal.valueOf(120_000_000L))
                .maxJobs(-1)
                .maxCvParses(-1)
                .maxAiInterviewHours(-1)
                .maxStorageGb(-1)
                .maxProctoringHours(-1)
                .videoRetentionDays(-1)
                .featuresJson("{\"features\":[\"Unlimited Enterprise\"]}")
                .status("ACTIVE")
                .build();
    }

    @Test
    void starterPlan_BlocksDisabledFeaturesWith402PaymentRequired() {
        TenantInfo tenant = new TenantInfo();
        tenant.setId(10L);
        tenant.setCode("acme");

        TenantSubscription sub = TenantSubscription.builder()
                .id(100L)
                .tenantId(10L)
                .planId(1L)
                .status("ACTIVE")
                .build();

        when(tenantInfoRepository.findByCode("acme")).thenReturn(Optional.of(tenant));
        when(subscriptionRepository.findFirstByTenantIdAndStatusOrderByCreatedAtDesc(10L, "ACTIVE"))
                .thenReturn(Optional.of(sub));
        when(planRepository.findById(1L)).thenReturn(Optional.of(starterPlan()));

        // AI Voice Interview is 0h in Starter -> Hard Block HTTP 402
        assertThatThrownBy(() -> quotaService.requireQuotaAvailable("acme", QuotaType.AI_VOICE_SECONDS))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getStatus()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
                    assertThat(be.getCode()).isEqualTo("QUOTA_FEATURE_DISABLED");
                });

        // Proctoring is 0h in Starter -> Hard Block HTTP 402
        assertThatThrownBy(() -> quotaService.requireQuotaAvailable("acme", QuotaType.PROCTORING_SECONDS))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getStatus()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
                    assertThat(be.getCode()).isEqualTo("QUOTA_FEATURE_DISABLED");
                });

        // Video Retention is 0 days in Starter -> Hard Block HTTP 402
        assertThatThrownBy(() -> quotaService.requireVideoRetentionEnabled("acme"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getStatus()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
                    assertThat(be.getCode()).isEqualTo("VIDEO_RETENTION_DISABLED");
                });
    }

    @Test
    void starterPlan_EnforcesActiveJobsAndCvParseLimitsAt100Percent() {
        when(tenantInfoRepository.findByCode("startup")).thenReturn(Optional.empty());
        when(tenantInfoRepository.findBySubdomain("startup")).thenReturn(Optional.empty());
        when(planRepository.findByCode("STARTER")).thenReturn(Optional.of(starterPlan()));

        // Active jobs < 3 -> allowed
        quotaService.checkCapacity("startup", QuotaType.ACTIVE_JOBS, 2L, 1L);

        // Active jobs == 3 -> 4th job blocked with HTTP 402 CAPACITY_LIMIT_REACHED
        assertThatThrownBy(() -> quotaService.checkCapacity("startup", QuotaType.ACTIVE_JOBS, 3L, 1L))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getStatus()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
                    assertThat(be.getCode()).isEqualTo("CAPACITY_LIMIT_REACHED");
                });

        // CV parse: reserve 100 succeeds, 101st fails with HTTP 402 QUOTA_EXCEEDED
        quotaService.checkAndReserveQuota("startup", QuotaType.CV_PARSE, 100);
        assertThatThrownBy(() -> quotaService.checkAndReserveQuota("startup", QuotaType.CV_PARSE, 1))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getStatus()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
                    assertThat(be.getCode()).isEqualTo("QUOTA_EXCEEDED");
                });
    }

    @Test
    void enterprisePlan_AllowsUnlimitedQuotas() {
        TenantInfo tenant = new TenantInfo();
        tenant.setId(20L);
        tenant.setCode("corp");

        TenantSubscription sub = TenantSubscription.builder()
                .id(200L)
                .tenantId(20L)
                .planId(3L)
                .status("ACTIVE")
                .build();

        when(tenantInfoRepository.findByCode("corp")).thenReturn(Optional.of(tenant));
        when(subscriptionRepository.findFirstByTenantIdAndStatusOrderByCreatedAtDesc(20L, "ACTIVE"))
                .thenReturn(Optional.of(sub));
        when(planRepository.findById(3L)).thenReturn(Optional.of(enterprisePlan()));

        quotaService.checkCapacity("corp", QuotaType.ACTIVE_JOBS, 999L, 1L);
        quotaService.checkAndReserveQuota("corp", QuotaType.CV_PARSE, 50_000);
        quotaService.requireQuotaAvailable("corp", QuotaType.AI_VOICE_SECONDS);
        quotaService.requireQuotaAvailable("corp", QuotaType.PROCTORING_SECONDS);
        quotaService.requireVideoRetentionEnabled("corp");
        assertThat(quotaService.isRecordingExpired("corp", Instant.now().minus(365, ChronoUnit.DAYS))).isFalse();
    }

    @Test
    void tier2SnapshotImmutability_PreservesContractedQuotasEvenWhenCatalogPlanChanges() {
        TenantInfo tenant = new TenantInfo();
        tenant.setId(30L);
        tenant.setCode("grandfathered-co");

        // Customer bought PRO V1 when maxJobs was 15 and maxCvParses was 1000
        SubscriptionPlan originalProPlan = SubscriptionPlan.builder()
                .id(2L)
                .code("PRO")
                .name("Professional")
                .version(1)
                .priceYearly(BigDecimal.valueOf(30_000_000L))
                .maxJobs(15)
                .maxCvParses(1000)
                .maxAiInterviewHours(20)
                .maxStorageGb(25)
                .maxProctoringHours(50)
                .videoRetentionDays(60)
                .featuresJson("{\"features\":[\"AI Voice Interview\",\"Coding Sandbox\"]}")
                .status("ACTIVE")
                .build();

        TenantSubscription sub = TenantSubscription.builder()
                .id(300L)
                .tenantId(30L)
                .planId(2L)
                .status("ACTIVE")
                .build();
        sub.applyPlanSnapshot(originalProPlan);

        // Even if someone mutated the catalog plan row to only 3 maxJobs and 50 CV parses:
        SubscriptionPlan mutatedCatalogPlan = SubscriptionPlan.builder()
                .id(2L)
                .code("PRO")
                .name("Professional")
                .version(2)
                .priceYearly(BigDecimal.valueOf(50_000_000L))
                .maxJobs(3)
                .maxCvParses(50)
                .maxAiInterviewHours(0)
                .maxStorageGb(2)
                .maxProctoringHours(0)
                .videoRetentionDays(0)
                .status("ACTIVE")
                .build();

        when(tenantInfoRepository.findByCode("grandfathered-co")).thenReturn(Optional.of(tenant));
        when(subscriptionRepository.findFirstByTenantIdAndStatusInOrderByCreatedAtDesc(anyLong(), any()))
                .thenReturn(Optional.of(sub));
        when(planRepository.findById(2L)).thenReturn(Optional.of(mutatedCatalogPlan));

        // Tenant still gets their contracted snapshot limits (15 jobs, 1000 CV parses, 20h AI interview)
        quotaService.checkCapacity("grandfathered-co", QuotaType.ACTIVE_JOBS, 10L, 1L);
        quotaService.checkAndReserveQuota("grandfathered-co", QuotaType.CV_PARSE, 500);
        quotaService.requireQuotaAvailable("grandfathered-co", QuotaType.AI_VOICE_SECONDS);
    }

    @Test
    void lifecycleStateMachine_AllowsPastDueDuringGracePeriodAndBlocksSuspendedOrCanceled() {
        TenantInfo tenant = new TenantInfo();
        tenant.setId(40L);
        tenant.setCode("pastdue-co");

        TenantSubscription pastDueWithinGrace = TenantSubscription.builder()
                .id(400L)
                .tenantId(40L)
                .planId(1L)
                .status("PAST_DUE")
                .gracePeriodEndsAt(java.time.LocalDateTime.now().plusDays(3))
                .build();
        pastDueWithinGrace.applyPlanSnapshot(starterPlan());

        when(tenantInfoRepository.findByCode("pastdue-co")).thenReturn(Optional.of(tenant));
        when(subscriptionRepository.findFirstByTenantIdAndStatusInOrderByCreatedAtDesc(anyLong(), any()))
                .thenReturn(Optional.of(pastDueWithinGrace));

        // Within grace period -> operational!
        quotaService.checkCapacity("pastdue-co", QuotaType.ACTIVE_JOBS, 1L, 1L);

        // Now transition to SUSPENDED -> blocked with HTTP 402 SUBSCRIPTION_SUSPENDED
        TenantSubscription suspendedSub = TenantSubscription.builder()
                .id(400L)
                .tenantId(40L)
                .planId(1L)
                .status("SUSPENDED")
                .build();
        when(subscriptionRepository.findFirstByTenantIdAndStatusInOrderByCreatedAtDesc(anyLong(), any()))
                .thenReturn(Optional.empty());
        when(subscriptionRepository.findFirstByTenantIdAndStatusOrderByCreatedAtDesc(40L, "ACTIVE"))
                .thenReturn(Optional.empty());
        when(subscriptionRepository.findByTenantIdOrderByCreatedAtDesc(40L))
                .thenReturn(java.util.List.of(suspendedSub));

        assertThatThrownBy(() -> quotaService.checkCapacity("pastdue-co", QuotaType.ACTIVE_JOBS, 1L, 1L))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getStatus()).isEqualTo(HttpStatus.PAYMENT_REQUIRED);
                    assertThat(be.getCode()).isEqualTo("SUBSCRIPTION_SUSPENDED");
                });
    }
}

