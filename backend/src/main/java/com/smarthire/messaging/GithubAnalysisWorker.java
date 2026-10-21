package com.smarthire.messaging;

import com.smarthire.tenant.cv.github.GithubAnalysisService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

@Component
public class GithubAnalysisWorker {
    private static final Logger log = LoggerFactory.getLogger(GithubAnalysisWorker.class);
    private final TenantJobExecutor executor;
    private final GithubAnalysisService analysis;

    public GithubAnalysisWorker(TenantJobExecutor executor, GithubAnalysisService analysis) {
        this.executor = executor;
        this.analysis = analysis;
    }

    @RabbitListener(queues = "${app.rabbitmq.queues.cv-github}", concurrency = "${app.github.listener-concurrency:1-2}")
    public void onMessage(CvJobPayload payload, @Header(name = "X-Tenant-ID", required = false) String tenant) {
        executor.execute(tenant, () -> {
            try {
                analysis.analyze(payload.cvId());
            } catch (RuntimeException ex) {
                log.error("GitHub analysis worker swallowed a failure for CV {} so CV screening can continue", payload.cvId(), ex);
            }
        });
    }
}
