package com.smarthire.messaging;

import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.aiInterview.service.AiInterviewEvaluationService;
import com.smarthire.tenant.aiInterview.service.AiInterviewService;
import com.smarthire.tenant.aiInterview.service.AiInterviewWorkService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Pending database states are the durable outbox; duplicate queue deliveries are safe. */
@Component
@EnableScheduling
public class AiInterviewWorkDispatcher {
    private static final Logger log = LoggerFactory.getLogger(AiInterviewWorkDispatcher.class);
    private final TenantInfoRepository tenants;
    private final TenantJobExecutor executor;
    private final AiInterviewWorkService work;
    private final AiInterviewService interviews;
    private final AiInterviewEvaluationService evaluation;
    private final RabbitTemplate rabbit;
    private final String questionsQueue;
    private final String scoringQueue;
    private final String emailQueue;
    private final com.smarthire.tenant.assessment.service.AssessmentGenerationService assessmentGeneration;
    public AiInterviewWorkDispatcher(TenantInfoRepository tenants, TenantJobExecutor executor, AiInterviewWorkService work,
            AiInterviewService interviews, AiInterviewEvaluationService evaluation, RabbitTemplate rabbit,
            com.smarthire.tenant.assessment.service.AssessmentGenerationService assessmentGeneration,
            @Value("${app.rabbitmq.queues.interview-questions}") String questionsQueue,
            @Value("${app.rabbitmq.queues.interview-score}") String scoringQueue,
            @Value("${app.rabbitmq.queues.interview-email}") String emailQueue) {
        this.tenants = tenants; this.executor = executor; this.work = work; this.interviews = interviews;
        this.evaluation = evaluation; this.rabbit = rabbit;
        this.assessmentGeneration = assessmentGeneration;
        this.questionsQueue = questionsQueue; this.scoringQueue = scoringQueue; this.emailQueue = emailQueue;
    }

    @Scheduled(fixedDelayString = "${app.ai.interview.dispatch-delay-ms:15000}", initialDelay = 15000)
    public void dispatch() {
        for (var tenant : tenants.findAll()) {
            if (!"ACTIVE".equals(tenant.getStatus())) continue;
            try {
                executor.execute(tenant.getCode(), () -> {
                    interviews.expireDue();
                    evaluation.closeExhaustedRetries();
                    for (var id : assessmentGeneration.pending()) {
                        rabbit.convertAndSend(AssessmentGenerationWorker.QUEUE, id, message -> {
                            message.getMessageProperties().setHeader("X-Tenant-ID", TenantContext.getCurrentTenant());
                            return message;
                        });
                    }
                    for (var item : work.pending()) {
                        String queue = switch (item.kind()) {
                            case "GENERATING" -> questionsQueue;
                            case "SCORING" -> scoringQueue;
                            default -> emailQueue;
                        };
                        rabbit.convertAndSend(queue, item.id(), message -> {
                            message.getMessageProperties().setHeader("X-Tenant-ID", TenantContext.getCurrentTenant());
                            return message;
                        });
                    }
                });
            } catch (Exception ex) { log.warn("AI interview dispatch deferred; pending work remains in database"); }
        }
    }
}
