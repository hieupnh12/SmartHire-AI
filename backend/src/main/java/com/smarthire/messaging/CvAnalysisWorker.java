package com.smarthire.messaging;

import com.smarthire.tenant.cv.service.CvPipelineService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

@Component
public class CvAnalysisWorker {
    private static final Logger log = LoggerFactory.getLogger(CvAnalysisWorker.class);
    private final TenantJobExecutor executor;
    private final CvPipelineService pipeline;

    public CvAnalysisWorker(TenantJobExecutor executor, CvPipelineService pipeline) {
        this.executor = executor;
        this.pipeline = pipeline;
    }

    @RabbitListener(queues = "${app.rabbitmq.queues.cv-analysis}")
    public void onCvAnalysis(CvJobPayload payload, @Header(name = "X-Tenant-ID", required = false) String tenant) {
        executor.execute(tenant, () -> {
            log.info("Analyzing CV skills");
            pipeline.analyze(payload.cvId());
        });
    }
}
