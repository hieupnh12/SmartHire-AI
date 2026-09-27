package com.smarthire.messaging;

import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.aiInterview.service.AiInterviewWorkService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Pending database states are the durable outbox; duplicate queue deliveries are safe. */
@Component
@EnableScheduling
public class AiInterviewWorkDispatcher {
    public static final String EMAIL_QUEUE = "tenant.interview.email";
    private static final Logger log = LoggerFactory.getLogger(AiInterviewWorkDispatcher.class);
    private final TenantInfoRepository tenants;
    private final TenantJobExecutor executor;
    private final AiInterviewWorkService work;
    private final RabbitTemplate rabbit;
    private final String questionsQueue;
    private final String scoringQueue;
    public AiInterviewWorkDispatcher(TenantInfoRepository tenants, TenantJobExecutor executor, AiInterviewWorkService work,
            RabbitTemplate rabbit, @Value("${app.rabbitmq.queues.interview-questions}") String questionsQueue,
            @Value("${app.rabbitmq.queues.interview-score}") String scoringQueue) {
        this.tenants = tenants; this.executor = executor; this.work = work; this.rabbit = rabbit;
        this.questionsQueue = questionsQueue; this.scoringQueue = scoringQueue;
    }
    @Bean public Queue tenantInterviewEmailQueue() { return QueueBuilder.durable(EMAIL_QUEUE).build(); }

    @Scheduled(fixedDelayString = "${app.ai.interview.dispatch-delay-ms:15000}", initialDelay = 15000)
    public void dispatch() {
        for (var tenant : tenants.findAll()) {
            if (!"ACTIVE".equals(tenant.getStatus())) continue;
            try {
                executor.execute(tenant.getCode(), () -> {
                    for (var item : work.pending()) {
                        String queue = switch (item.kind()) {
                            case "GENERATING" -> questionsQueue;
                            case "SCORING" -> scoringQueue;
                            default -> EMAIL_QUEUE;
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
