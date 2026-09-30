package com.smarthire.messaging;

import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.job.service.JobService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

@Component
public class JobExpiryListener {
    private static final Logger log = LoggerFactory.getLogger(JobExpiryListener.class);
    private final JobService jobService;

    public JobExpiryListener(JobService jobService) {
        this.jobService = jobService;
    }

    @RabbitListener(queues = "${app.rabbitmq.queues.job-expiry}")
    public void onJobExpiry(Long jobId, @Header("X-Tenant-ID") String tenantId) {
        log.info("Received job expiry event for jobId: {} in tenant: {}", jobId, tenantId);
        if (tenantId == null || jobId == null) return;

        TenantContext.setCurrentTenant(tenantId);
        try {
            jobService.closeIfExpired(jobId);
        } catch (Exception e) {
            log.error("Failed to close expired job: {}", jobId, e);
        } finally {
            TenantContext.clear();
        }
    }
}
