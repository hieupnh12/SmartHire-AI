package com.smarthire.master.notification;

import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.entity.TenantSubscription;
import com.smarthire.domain.master.repository.SubscriptionPlanRepository;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.domain.master.repository.TenantSubscriptionRepository;
import com.smarthire.master.notification.service.MasterNotificationService;
import com.smarthire.master.notification.service.SubscriptionLifecycleNotificationService;
import com.smarthire.messaging.TenantJobExecutor;
import com.smarthire.tenant.notification.service.TenantAdminNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubscriptionLifecycleNotificationServiceTest {

    @Mock
    private MasterNotificationService masterNotificationService;
    @Mock
    private TenantInfoRepository tenantInfoRepository;
    @Mock
    private SubscriptionPlanRepository planRepository;
    @Mock
    private TenantSubscriptionRepository subscriptionRepository;
    @Mock
    private RedisService redisService;
    @Mock
    private TenantJobExecutor tenantJobExecutor;
    @Mock
    private TenantAdminNotificationService tenantAdminNotificationService;

    private SubscriptionLifecycleNotificationService service;

    @BeforeEach
    void setUp() {
        service = new SubscriptionLifecycleNotificationService(
                masterNotificationService,
                tenantInfoRepository,
                planRepository,
                redisService
        );
        ReflectionTestUtils.setField(service, "subscriptionRepository", subscriptionRepository);
        ReflectionTestUtils.setField(service, "tenantJobExecutor", tenantJobExecutor);
        ReflectionTestUtils.setField(service, "tenantAdminNotificationService", tenantAdminNotificationService);

        lenient().doAnswer(inv -> {
            Runnable runnable = inv.getArgument(1);
            runnable.run();
            return null;
        }).when(tenantJobExecutor).execute(anyString(), any(Runnable.class));
        lenient().when(redisService.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);
        lenient().when(tenantAdminNotificationService.notifyCompanyAdmins(anyString(), anyString(), anyString(), anyMap(), any(Instant.class)))
                .thenReturn(1);
    }

    private TenantInfo activeTenant() {
        TenantInfo tenant = new TenantInfo();
        tenant.setId(10L);
        tenant.setCode("acme");
        tenant.setName("Acme Corp");
        tenant.setStatus("ACTIVE");
        tenant.setDeleted(false);
        tenant.setBillingEmail("billing@acme.vn");
        return tenant;
    }

    private SubscriptionPlan proPlan() {
        return SubscriptionPlan.builder()
                .id(2L)
                .code("PRO")
                .name("Chuyên Nghiệp")
                .build();
    }

    @Test
    void notifyUpcomingExpiry_SevenThreeOneDays_SendsEmailAndTenantAdminBell() {
        TenantInfo tenant = activeTenant();
        SubscriptionPlan plan = proPlan();

        when(masterNotificationService.sendSubscriptionLifecycleEmail(eq(tenant), anyString(), anyString(), anyString(), anyMap()))
                .thenReturn(true);

        // 7D window (5-7 days left)
        TenantSubscription sub7 = TenantSubscription.builder()
                .id(100L)
                .tenantId(10L)
                .planId(2L)
                .planNameSnapshot("Chuyên Nghiệp")
                .status("ACTIVE")
                .endsAt(LocalDateTime.now().plusDays(6).plusHours(2))
                .autoRenew(true)
                .build();

        assertThat(service.notifyUpcomingExpiry(sub7, plan, tenant)).isTrue();
        verify(masterNotificationService).sendSubscriptionLifecycleEmail(
                eq(tenant), eq("SUBSCRIPTION_EXPIRY_7D"), anyString(), anyString(), anyMap());
        verify(tenantJobExecutor).execute(eq("acme"), any(Runnable.class));
        verify(tenantAdminNotificationService).notifyCompanyAdmins(
                eq("SUBSCRIPTION_EXPIRY_7D"), anyString(), anyString(), anyMap(), any(Instant.class));

        // 3D window (2-3 days left)
        sub7.setEndsAt(LocalDateTime.now().plusDays(3).plusHours(1));
        assertThat(service.notifyUpcomingExpiry(sub7, plan, tenant)).isTrue();
        verify(masterNotificationService).sendSubscriptionLifecycleEmail(
                eq(tenant), eq("SUBSCRIPTION_EXPIRY_3D"), anyString(), anyString(), anyMap());
        verify(tenantAdminNotificationService).notifyCompanyAdmins(
                eq("SUBSCRIPTION_EXPIRY_3D"), anyString(), anyString(), anyMap(), any(Instant.class));

        // 1D urgent window (<= 1 day)
        sub7.setEndsAt(LocalDateTime.now().plusHours(12));
        assertThat(service.notifyUpcomingExpiry(sub7, plan, tenant)).isTrue();
        verify(masterNotificationService).sendSubscriptionLifecycleEmail(
                eq(tenant), eq("SUBSCRIPTION_EXPIRY_1D"), anyString(), anyString(), anyMap());
        verify(tenantAdminNotificationService).notifyCompanyAdmins(
                eq("SUBSCRIPTION_EXPIRY_1D"), anyString(), anyString(), anyMap(), any(Instant.class));
    }

    @Test
    void notifyUpcomingExpiry_Over7DaysOrInactiveTenant_DoesNotDispatch() {
        TenantInfo tenant = activeTenant();
        SubscriptionPlan plan = proPlan();

        TenantSubscription farFuture = TenantSubscription.builder()
                .id(101L)
                .tenantId(10L)
                .status("ACTIVE")
                .endsAt(LocalDateTime.now().plusDays(15))
                .build();
        assertThat(service.notifyUpcomingExpiry(farFuture, plan, tenant)).isFalse();

        tenant.setDeleted(true);
        farFuture.setEndsAt(LocalDateTime.now().plusDays(2));
        assertThat(service.notifyUpcomingExpiry(farFuture, plan, tenant)).isFalse();

        verifyNoInteractions(masterNotificationService);
        verifyNoInteractions(tenantAdminNotificationService);
    }

    @Test
    void notifyOverdueOrSuspended_RollsBackBellDedupKeyWhenExecutorFails() {
        TenantInfo tenant = activeTenant();
        SubscriptionPlan plan = proPlan();
        TenantSubscription pastDue = TenantSubscription.builder()
                .id(102L)
                .tenantId(10L)
                .planId(2L)
                .planNameSnapshot("Chuyên Nghiệp")
                .status("PAST_DUE")
                .endsAt(LocalDateTime.now().minusHours(2))
                .gracePeriodEndsAt(LocalDateTime.now().plusDays(5))
                .build();

        when(masterNotificationService.sendSubscriptionLifecycleEmail(eq(tenant), anyString(), anyString(), anyString(), anyMap()))
                .thenReturn(true);
        doAnswer(inv -> {
            throw new IllegalStateException("Tenant DB unavailable");
        }).when(tenantJobExecutor).execute(eq("acme"), any(Runnable.class));

        boolean result = service.notifyOverdueOrSuspended(pastDue, plan, tenant);

        assertThat(result).isTrue(); // email channel still succeeded
        ArgumentCaptor<String> redisKeyCaptor = ArgumentCaptor.forClass(String.class);
        verify(redisService).setIfAbsent(redisKeyCaptor.capture(), eq("1"), any(Duration.class));
        verify(redisService).delete(redisKeyCaptor.getValue());
    }

    @Test
    void notifySubscriptionsByIds_LoadsAndNotifiesSuspendedSubscription() {
        TenantInfo tenant = activeTenant();
        SubscriptionPlan plan = proPlan();
        TenantSubscription suspended = TenantSubscription.builder()
                .id(200L)
                .tenantId(10L)
                .planId(2L)
                .planNameSnapshot("Chuyên Nghiệp")
                .status("SUSPENDED")
                .endsAt(LocalDateTime.now().minusDays(6))
                .build();

        when(subscriptionRepository.findById(200L)).thenReturn(Optional.of(suspended));
        when(tenantInfoRepository.findById(10L)).thenReturn(Optional.of(tenant));
        when(planRepository.findById(2L)).thenReturn(Optional.of(plan));
        when(masterNotificationService.sendSubscriptionLifecycleEmail(
                eq(tenant), eq("SUBSCRIPTION_SUSPENDED"), anyString(), anyString(), anyMap()))
                .thenReturn(true);

        service.notifySubscriptionsByIds(List.of(200L));

        verify(masterNotificationService).sendSubscriptionLifecycleEmail(
                eq(tenant), eq("SUBSCRIPTION_SUSPENDED"), anyString(), anyString(), anyMap());
        verify(tenantAdminNotificationService).notifyCompanyAdmins(
                eq("SUBSCRIPTION_SUSPENDED"), anyString(), anyString(), anyMap(), any(Instant.class));
    }

    @Test
    void notifyUpcomingExpiry_SkipsBellWhenRedisDedupAlreadyExists() {
        TenantInfo tenant = activeTenant();
        SubscriptionPlan plan = proPlan();
        TenantSubscription expiringSoon = TenantSubscription.builder()
                .id(300L)
                .tenantId(10L)
                .planId(2L)
                .status("TRIAL")
                .endsAt(LocalDateTime.now().plusDays(2))
                .build();

        when(redisService.setIfAbsent(anyString(), eq("1"), any(Duration.class))).thenReturn(false);
        when(masterNotificationService.sendSubscriptionLifecycleEmail(any(), anyString(), anyString(), anyString(), anyMap()))
                .thenReturn(false);

        boolean sent = service.notifyUpcomingExpiry(expiringSoon, plan, tenant);

        assertThat(sent).isFalse();
        verify(tenantAdminNotificationService, never())
                .notifyCompanyAdmins(anyString(), anyString(), anyString(), anyMap(), any(Instant.class));
    }
}
