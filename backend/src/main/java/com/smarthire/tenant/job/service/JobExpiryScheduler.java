package com.smarthire.tenant.job.service;

import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.messaging.TenantJobExecutor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "smarthire.jobs.close-scan-enabled", havingValue = "true", matchIfMissing = true)
public class JobExpiryScheduler {
    private static final Logger log = LoggerFactory.getLogger(JobExpiryScheduler.class);

    private final TenantInfoRepository tenants;
    private final TenantJobExecutor executor;
    private final JobService jobs;

    public JobExpiryScheduler(TenantInfoRepository tenants, TenantJobExecutor executor, JobService jobs) {
        this.tenants = tenants;
        this.executor = executor;
        this.jobs = jobs;
    }

    @Scheduled(fixedDelayString = "${smarthire.jobs.close-scan-ms:60000}")
    public void closeExpiredJobs() {
        for (TenantInfo tenant : tenants.findByStatus("ACTIVE")) {
            try {
                executor.execute(tenant.getCode(), jobs::closeExpiredJobs);
            } catch (Exception ex) {
                log.warn("Could not close expired jobs for tenant {}", tenant.getCode());
            }
        }
    }
}
