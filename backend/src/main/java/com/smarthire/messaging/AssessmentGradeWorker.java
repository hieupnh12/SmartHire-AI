package com.smarthire.messaging;

import com.smarthire.tenant.assessment.service.*;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class AssessmentGradeWorker {
    public static final String ESSAY_QUEUE = "assessment.essay.grade";
    public static final String CODE_QUEUE = "assessment.code.grade.q";
    private final String codeQueue;
    private final RabbitTemplate rabbit;
    private final TenantJobExecutor executor;
    private final AssessmentGradingService grading;
    public AssessmentGradeWorker(RabbitTemplate rabbit, TenantJobExecutor executor, AssessmentGradingService grading,
            @org.springframework.beans.factory.annotation.Value("${app.rabbitmq.queues.assessment-code-grade}") String codeQueue) {
        this.codeQueue = codeQueue;
        this.rabbit = rabbit; this.executor = executor; this.grading = grading;
    }
    @Bean public Queue essayGradeQueue() { return new Queue(ESSAY_QUEUE, true); }
    // Coding queue is already declared by RabbitMqConfig.
    @TransactionalEventListener
    public void publish(AssessmentGradeEvent event) {
        try {
            for (String queue : new String[]{ESSAY_QUEUE, codeQueue}) rabbit.convertAndSend(queue, event.submissionId(), message -> {
                message.getMessageProperties().setHeader("X-Tenant-ID", event.tenant()); return message;
            });
        } catch (org.springframework.amqp.AmqpException unavailable) {
            // Answers are durable; staff can request a grading retry after broker recovery.
        }
    }
    @RabbitListener(queues = ESSAY_QUEUE, concurrency = "3-10")
    public void essay(long id, @Header(name = "X-Tenant-ID", required = false) String tenant) {
        executor.execute(tenant, () -> grading.suggest(id, "ESSAY"));
    }
    @RabbitListener(queues = "${app.rabbitmq.queues.assessment-code-grade}", concurrency = "3-10")
    public void code(long id, @Header(name = "X-Tenant-ID", required = false) String tenant) {
        executor.execute(tenant, () -> grading.suggest(id, "CODING"));
    }
}
