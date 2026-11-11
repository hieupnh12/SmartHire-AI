package com.smarthire.multitenancy.quota;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.entity.TenantSubscription;
import com.smarthire.domain.master.repository.SubscriptionPlanRepository;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.domain.master.repository.TenantSubscriptionRepository;
import com.smarthire.domain.master.repository.TenantUsageDailyRepository;
import com.smarthire.master.notification.service.MasterNotificationService;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.notification.service.TenantAdminNotificationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TenantQuotaAlertNotificationTest {

    @Mock
    private StringRedisTemplate redis;
    @Mock
    private HashOperations<String, Object, Object> hashOps;
    @Mock
    private ValueOperations<String, String> valueOps;
    @Mock
    private TenantInfoRepository tenantInfoRepository;
    @Mock
    private TenantSubscriptionRepository subscriptionRepository;
    @Mock
    private SubscriptionPlanRepository planRepository;
    @Mock
    private TenantUsageDailyRepository usageDailyRepository;
    @Mock
    private MasterNotificationService masterNotificationService;
    @Mock
    private TenantAdminNotificationService tenantAdminNotificationService;

    private TenantQuotaRedisService quotaService;
    private final Map<String, Map<String, String>> redisHashes = new HashMap<>();

    @BeforeEach
    void setUp() {
        redisHashes.clear();
        lenient().when(redis.opsForHash()).thenReturn(hashOps);
        lenient().when(redis.opsForValue()).thenReturn(valueOps);
        lenient().when(redis.hasKey(anyString())).thenAnswer(inv -> redisHashes.containsKey(inv.getArgument(0)));
        lenient().when(hashOps.get(anyString(), any())).thenAnswer(inv -> {
            Map<String, String> map = redisHashes.get(inv.<String>getArgument(0));
            return map != null ? map.get(inv.getArgument(1).toString()) : null;
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
        lenient().when(valueOps.setIfAbsent(anyString(), anyString(), anyLong(), any(TimeUnit.class))).thenReturn(true);

        quotaService = new TenantQuotaRedisService(
                redis,
                tenantInfoRepository,
                subscriptionRepository,
                planRepository,
                usageDailyRepository,
                new ObjectMapper()
        );
        ReflectionTestUtils.setField(quotaService, "masterNotificationService", masterNotificationService);
        ReflectionTestUtils.setField(quotaService, "tenantAdminNotificationService", tenantAdminNotificationService);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void checkAndReserveQuota_At80Percent_SendsMasterEmailAndTenantAdminBell() {
        TenantContext.setCurrentTenant("acme");

        TenantInfo tenant = new TenantInfo();
        tenant.setId(10L);
        tenant.setCode("acme");

        SubscriptionPlan starter = SubscriptionPlan.builder()
                .id(1L)
                .code("STARTER")
                .name("Gói Khởi Đầu")
                .priceYearly(BigDecimal.valueOf(12_000_000L))
                .maxJobs(5)
                .maxCvParses(100)
                .status("ACTIVE")
                .build();

        TenantSubscription sub = TenantSubscription.builder()
                .id(50L)
                .tenantId(10L)
                .planId(1L)
                .status("ACTIVE")
                .build();
        sub.applyPlanSnapshot(starter);

        when(tenantInfoRepository.findByCode("acme")).thenReturn(Optional.of(tenant));
        when(subscriptionRepository.findFirstByTenantIdAndStatusInOrderByCreatedAtDesc(anyLong(), any()))
                .thenReturn(Optional.of(sub));

        quotaService.checkAndReserveQuota("acme", QuotaType.CV_PARSE, 80);

        verify(masterNotificationService).sendQuotaWarning("acme", QuotaType.CV_PARSE, 80L, 100L);
        verify(tenantAdminNotificationService).notifyCompanyAdmins(
                eq("QUOTA_WARNING"),
                contains("80%"),
                anyString(),
                anyMap(),
                any(Instant.class)
        );
    }

    @Test
    void checkAndReserveQuota_WhenTenantContextDiffers_SkipsInAppBellOnly() {
        TenantContext.setCurrentTenant("other-tenant");

        TenantInfo tenant = new TenantInfo();
        tenant.setId(10L);
        tenant.setCode("acme");
        SubscriptionPlan starter = SubscriptionPlan.builder()
                .id(1L)
                .code("STARTER")
                .maxJobs(5)
                .maxCvParses(100)
                .status("ACTIVE")
                .build();
        TenantSubscription sub = TenantSubscription.builder()
                .id(50L)
                .tenantId(10L)
                .planId(1L)
                .status("ACTIVE")
                .build();
        sub.applyPlanSnapshot(starter);

        when(tenantInfoRepository.findByCode("acme")).thenReturn(Optional.of(tenant));
        when(subscriptionRepository.findFirstByTenantIdAndStatusInOrderByCreatedAtDesc(anyLong(), any()))
                .thenReturn(Optional.of(sub));

        quotaService.checkAndReserveQuota("acme", QuotaType.CV_PARSE, 85);

        verify(masterNotificationService).sendQuotaWarning("acme", QuotaType.CV_PARSE, 85L, 100L);
        verify(tenantAdminNotificationService, never())
                .notifyCompanyAdmins(anyString(), anyString(), anyString(), anyMap(), any(Instant.class));
    }
}
