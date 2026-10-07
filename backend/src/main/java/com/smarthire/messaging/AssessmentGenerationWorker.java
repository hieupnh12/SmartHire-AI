package com.smarthire.messaging;

import com.smarthire.tenant.assessment.service.AssessmentGenerationService;
import com.smarthire.common.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.context.annotation.Bean;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

@Component
public class AssessmentGenerationWorker {
    public static final String QUEUE = "smarthire.assessment.generate";
    private static final Logger log = LoggerFactory.getLogger(AssessmentGenerationWorker.class);
    private final TenantJobExecutor executor;
    private final AssessmentGenerationService generation;
    public AssessmentGenerationWorker(TenantJobExecutor executor, AssessmentGenerationService generation) {
        this.executor = executor; this.generation = generation;
    }
    @Bean
    public Queue assessmentGenerationQueue() { return QueueBuilder.durable(QUEUE).build(); }

    @RabbitListener(queues = QUEUE, concurrency = "3-10")
    public void generate(long id, @Header(name = "X-Tenant-ID", required = false) String tenant) {
        executor.execute(tenant, () -> {
            try { generation.generateForApplication(id); }
            catch (BusinessException ex) {
                // Eligibility remains durable; the dispatcher retries after configuration or bank corrections.
                log.warn("Automatic assessment deferred for application {}: {}", id, ex.getMessage());
            }
        });
    }
}
