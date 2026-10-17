package com.smarthire.messaging;

import com.smarthire.tenant.assessment.service.BankQuestionGenerationService;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.context.annotation.Bean;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

@Component
public class BankQuestionGenerationWorker {
    public static final String QUEUE = "smarthire.assessment.bank.generate";
    private final TenantJobExecutor executor;
    private final BankQuestionGenerationService service;
    public BankQuestionGenerationWorker(TenantJobExecutor executor, BankQuestionGenerationService service) {
        this.executor = executor; this.service = service;
    }
    @Bean
    public Queue bankQuestionGenerationQueue() { return QueueBuilder.durable(QUEUE).build(); }
    @RabbitListener(queues = QUEUE, concurrency = "3-10")
    public void generate(String id, @Header("X-Tenant-ID") String tenant) {
        executor.execute(tenant, () -> {
            try { service.process(id); }
            catch (com.smarthire.common.exception.BusinessException failure) {
                throw new org.springframework.amqp.AmqpRejectAndDontRequeueException("Generation draft expired or unavailable");
            }
        });
    }
}
