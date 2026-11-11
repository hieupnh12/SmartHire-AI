package com.smarthire.master.notification;

import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.entity.TenantSubscription;
import com.smarthire.domain.master.repository.SubscriptionPlanRepository;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.domain.master.repository.TenantSubscriptionRepository;
import com.smarthire.master.notification.scheduler.MasterNotificationScheduler;
import com.smarthire.master.notification.service.SubscriptionLifecycleNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MasterNotificationSchedulerTest {

    @Mock
    private TenantSubscriptionRepository subscriptionRepository;
    @Mock
    private TenantInfoRepository tenantInfoRepository;
    @Mock
    private SubscriptionPlanRepository planRepository;
    @Mock
    private SubscriptionLifecycleNotificationService lifecycleNotificationService;

    private MasterNotificationScheduler scheduler;

    @BeforeEach
    void setUp() {
        scheduler = new MasterNotificationScheduler(
                subscriptionRepository,
                tenantInfoRepository,
                planRepository,
                lifecycleNotificationService
        );
    }

    @Test
    void scanAndSendSubscriptionAlerts_ProcessesExpiringPastDueAndSuspendedAndCachesTenants() {
        TenantInfo acme = new TenantInfo();
        acme.setId(1L);
        acme.setCode("acme");
        acme.setStatus("ACTIVE");

        SubscriptionPlan pro = SubscriptionPlan.builder().id(2L).code("PRO").name("Chuyên Nghiệp").build();

        TenantSubscription expiringSub = TenantSubscription.builder()
                .id(10L)
                .tenantId(1L)
                .planId(2L)
                .status("ACTIVE")
                .endsAt(LocalDateTime.now().plusDays(3))
                .build();
        TenantSubscription pastDueSub = TenantSubscription.builder()
                .id(11L)
                .tenantId(1L)
                .planId(2L)
                .status("PAST_DUE")
                .endsAt(LocalDateTime.now().minusDays(1))
                .build();
        TenantSubscription suspendedSub = TenantSubscription.builder()
                .id(12L)
                .tenantId(1L)
                .planId(2L)
                .status("SUSPENDED")
                .gracePeriodEndsAt(LocalDateTime.now().minusDays(1))
                .build();

        when(subscriptionRepository.findByStatusInAndEndsAtBetween(eq(List.of("ACTIVE", "TRIAL")), any(), any()))
                .thenReturn(List.of(expiringSub));
        when(subscriptionRepository.findByStatus("PAST_DUE")).thenReturn(List.of(pastDueSub));
        when(subscriptionRepository.findByStatusAndGracePeriodEndsAtAfter(eq("SUSPENDED"), any()))
                .thenReturn(List.of(suspendedSub));

        when(tenantInfoRepository.findById(1L)).thenReturn(Optional.of(acme));
        when(planRepository.findById(2L)).thenReturn(Optional.of(pro));
        when(lifecycleNotificationService.notifyUpcomingExpiry(expiringSub, pro, acme)).thenReturn(true);
        when(lifecycleNotificationService.notifyOverdueOrSuspended(pastDueSub, pro, acme)).thenReturn(true);
        when(lifecycleNotificationService.notifyOverdueOrSuspended(suspendedSub, pro, acme)).thenReturn(false);

        int count = scheduler.scanAndSendSubscriptionAlerts();

        assertThat(count).isEqualTo(2);
        verify(tenantInfoRepository, times(1)).findById(1L);
        verify(planRepository, times(1)).findById(2L);
        verify(lifecycleNotificationService).notifyUpcomingExpiry(expiringSub, pro, acme);
        verify(lifecycleNotificationService).notifyOverdueOrSuspended(pastDueSub, pro, acme);
        verify(lifecycleNotificationService).notifyOverdueOrSuspended(suspendedSub, pro, acme);
    }
}
