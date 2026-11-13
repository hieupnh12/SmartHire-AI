package com.smarthire.master.notification.scheduler;

import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.entity.TenantSubscription;
import com.smarthire.domain.master.repository.SubscriptionPlanRepository;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.domain.master.repository.TenantSubscriptionRepository;
import com.smarthire.master.notification.service.SubscriptionLifecycleNotificationService;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Periodically scans active subscriptions nearing expiration (7D / 3D / 1D) as well as
 * PAST_DUE / recently SUSPENDED subscriptions and dispatches deduplicated email + Tenant Admin
 * inbox alerts.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MasterNotificationScheduler {

    private final TenantSubscriptionRepository subscriptionRepository;
    private final TenantInfoRepository tenantInfoRepository;
    private final SubscriptionPlanRepository planRepository;
    private final SubscriptionLifecycleNotificationService lifecycleNotificationService;

    @Scheduled(cron = "${app.subscription.expiry-reminder-cron:0 5 * * * *}")
    public int scanAndSendSubscriptionAlerts() {
        LocalDateTime now = LocalDateTime.now();
        Map<Long, TenantInfo> tenantCache = new HashMap<>();
        Map<Long, SubscriptionPlan> planCache = new HashMap<>();
        int dispatched = 0;

        // 1. Active / Trial subscriptions within 8 days of ends_at (covers 7D, 3D, 1D windows cleanly across timezones)
        List<TenantSubscription> expiringSubs = subscriptionRepository.findByStatusInAndEndsAtBetween(
                List.of("ACTIVE", "TRIAL"), now, now.plusDays(8));
        for (TenantSubscription sub : expiringSubs) {
            TenantInfo tenant = resolveTenant(sub.getTenantId(), tenantCache);
            SubscriptionPlan plan = resolvePlan(sub.getPlanId(), planCache);
            if (lifecycleNotificationService.notifyUpcomingExpiry(sub, plan, tenant)) {
                dispatched++;
            }
        }

        // 2. PAST_DUE subscriptions in grace period
        for (TenantSubscription sub : subscriptionRepository.findByStatus("PAST_DUE")) {
            TenantInfo tenant = resolveTenant(sub.getTenantId(), tenantCache);
            SubscriptionPlan plan = resolvePlan(sub.getPlanId(), planCache);
            if (lifecycleNotificationService.notifyOverdueOrSuspended(sub, plan, tenant)) {
                dispatched++;
            }
        }

        // 3. Recently SUSPENDED subscriptions (grace ended within last 7 days)
        for (TenantSubscription sub : subscriptionRepository.findByStatusAndGracePeriodEndsAtAfter("SUSPENDED", now.minusDays(7))) {
            TenantInfo tenant = resolveTenant(sub.getTenantId(), tenantCache);
            SubscriptionPlan plan = resolvePlan(sub.getPlanId(), planCache);
            if (lifecycleNotificationService.notifyOverdueOrSuspended(sub, plan, tenant)) {
                dispatched++;
            }
        }

        if (dispatched > 0) {
            log.info("MasterNotificationScheduler dispatched {} subscription lifecycle alert(s)", dispatched);
        }
        return dispatched;
    }

    private TenantInfo resolveTenant(Long tenantId, Map<Long, TenantInfo> cache) {
        if (tenantId == null) return null;
        return cache.computeIfAbsent(tenantId, id -> tenantInfoRepository.findById(id).orElse(null));
    }

    private SubscriptionPlan resolvePlan(Long planId, Map<Long, SubscriptionPlan> cache) {
        if (planId == null) return null;
        return cache.computeIfAbsent(planId, id -> planRepository.findById(id).orElse(null));
    }
}
