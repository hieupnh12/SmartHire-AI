package com.smarthire.master.billing.event;

import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.entity.TenantSubscription;
import com.smarthire.domain.master.repository.SubscriptionPlanRepository;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.domain.master.repository.TenantSubscriptionRepository;
import com.smarthire.master.notification.service.MasterNotificationService;
import com.smarthire.master.tenant.service.MasterTenantService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Asynchronous background worker that listens for {@link TenantPaymentSuccessEvent}
 * after the payment transaction commits in the Master DB.
 * Ensures payment webhooks (SePay, VNPay, PayPal) return HTTP 200 OK immediately
 * without waiting 3-10 seconds for MySQL database creation and Flyway migrations.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TenantProvisioningEventListener {

    private final TenantInfoRepository tenantRepository;
    private final TenantSubscriptionRepository subscriptionRepository;
    private final SubscriptionPlanRepository planRepository;
    private final MasterTenantService masterTenantService;
    private final MasterNotificationService masterNotificationService;

    @Value("${app.tenant.base-domain:smarthire.top}")
    private String baseDomain;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onTenantPaymentSuccess(TenantPaymentSuccessEvent event) {
        if (event == null || event.tenantId() == null) {
            return;
        }

        try {
            TenantInfo tenant = tenantRepository.findById(event.tenantId()).orElse(null);
            if (tenant == null) {
                log.warn("TenantProvisioningEventListener: Tenant ID {} not found for Invoice #{}",
                        event.tenantId(), event.invoiceNumber());
                return;
            }

            if (!"PENDING_PAYMENT".equals(tenant.getStatus())
                    && !"PROVISIONING".equals(tenant.getStatus())
                    && !"FAILED".equals(tenant.getStatus())) {
                log.info("Tenant '{}' is already in status '{}' (Invoice #{}). Skipping DB provisioning.",
                        tenant.getCode(), tenant.getStatus(), event.invoiceNumber());
                return;
            }

            log.info("[Async Worker] Starting dedicated MySQL DB provisioning & Flyway migrations for tenant '{}' (Invoice #{})",
                    tenant.getCode(), event.invoiceNumber());

            String activationUrl = masterTenantService.provisionPendingTenant(tenant.getId());
            tenant = tenantRepository.findById(tenant.getId()).orElse(tenant);

            String workspaceUrl = "https://" + tenant.getSubdomain() + "." + baseDomain;
            String planName = null;
            if (event.subscriptionId() != null) {
                TenantSubscription sub = subscriptionRepository.findById(event.subscriptionId()).orElse(null);
                if (sub != null && sub.getPlanId() != null) {
                    SubscriptionPlan plan = planRepository.findById(sub.getPlanId()).orElse(null);
                    if (plan != null) {
                        planName = plan.getName();
                    }
                }
            }

            log.info("[Async Worker] Successfully provisioned DB '{}' for tenant '{}'. Dispatching activation email to {}",
                    tenant.getDbName(), tenant.getCode(), tenant.getContactEmail());

            try {
                masterNotificationService.sendWorkspaceActivated(tenant, planName, activationUrl, workspaceUrl);
            } catch (Exception mailEx) {
                log.warn("[Async Worker] Could not deliver workspace activation email for tenant '{}': {}",
                        tenant.getCode(), mailEx.getMessage());
            }
        } catch (Exception ex) {
            log.error("[Async Worker] Failed to provision dedicated database for tenantId={} (Invoice #{}): {}",
                    event.tenantId(), event.invoiceNumber(), ex.getMessage(), ex);
        }
    }
}
