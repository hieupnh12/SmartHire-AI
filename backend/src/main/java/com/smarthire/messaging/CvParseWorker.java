package com.smarthire.messaging;

import com.smarthire.tenant.cv.service.CvPipelineService;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

@Component
public class CvParseWorker {
    private final TenantJobExecutor executor;
    private final CvPipelineService pipeline;

    public CvParseWorker(TenantJobExecutor executor, CvPipelineService pipeline) {
        this.executor = executor;
        this.pipeline = pipeline;
    }

    @RabbitListener(queues = "${app.rabbitmq.queues.cv-parse}")
    public void onMessage(CvJobPayload payload, @Header(name = "X-Tenant-ID", required = false) String tenant) {
        executor.execute(tenant, () -> pipeline.parse(payload.cvId()));
    }
}
