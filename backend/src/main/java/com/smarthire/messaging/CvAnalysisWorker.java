package com.smarthire.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

@Component
public class CvAnalysisWorker {
    private static final Logger log = LoggerFactory.getLogger(CvAnalysisWorker.class);
    private final TenantJobExecutor executor;
    public CvAnalysisWorker(TenantJobExecutor executor) { this.executor = executor; }

    @RabbitListener(queues = "${app.rabbitmq.queues.cv-analysis}")
    public void onCvAnalysis(String payload, @Header(name = "X-Tenant-ID", required = false) String tenant) {
        executor.execute(tenant, () -> {
            // TODO CV-04: call AI and persist results inside this tenant scope.
            log.info("Received CV analysis job (scaffold)");
        });
    }
}
