package com.smarthire.messaging;

import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.tenant.applicant.service.ApplicationClosureService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Per-tenant housekeeping: close stale applications and purge CV files past their retention date. */
@Component
@EnableScheduling
public class ApplicationMaintenanceScheduler {
    private static final Logger log = LoggerFactory.getLogger(ApplicationMaintenanceScheduler.class);
    private final TenantInfoRepository tenants;
    private final TenantJobExecutor executor;
    private final ApplicationClosureService closures;

    public ApplicationMaintenanceScheduler(TenantInfoRepository tenants, TenantJobExecutor executor, ApplicationClosureService closures) {
        this.tenants = tenants;
        this.executor = executor;
        this.closures = closures;
    }

    @Scheduled(cron = "${app.applications.maintenance-cron:0 15 * * * *}")
    public void run() {
        for (var tenant : tenants.findAll()) {
            if (!"ACTIVE".equals(tenant.getStatus())) continue;
            try {
                executor.execute(tenant.getCode(), () -> {
                    int expired = closures.expireStale();
                    int purged = closures.purgeExpiredCvFiles();
                    if (expired + purged > 0) {
                        log.info("Application maintenance for tenant {}: {} stale closed, {} CV files purged", tenant.getCode(), expired, purged);
                    }
                });
            } catch (Exception ex) {
                log.warn("Application maintenance deferred for tenant {}", tenant.getCode());
            }
        }
    }
}
