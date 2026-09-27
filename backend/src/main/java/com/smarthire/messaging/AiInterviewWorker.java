package com.smarthire.messaging;

import com.smarthire.tenant.aiInterview.service.AiInterviewEvaluationService;
import com.smarthire.tenant.aiInterview.service.AiInterviewWorkService;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

@Component
public class AiInterviewWorker {
    private final TenantJobExecutor executor;
    private final AiInterviewEvaluationService evaluation;
    private final AiInterviewWorkService work;
    public AiInterviewWorker(TenantJobExecutor executor, AiInterviewEvaluationService evaluation, AiInterviewWorkService work) {
        this.executor = executor; this.evaluation = evaluation; this.work = work;
    }
    @RabbitListener(queues = {"${app.rabbitmq.queues.interview-questions}", "${app.rabbitmq.queues.interview-score}"})
    public void process(Long id, @Header(value = "X-Tenant-ID", required = false) String tenant) {
        executor.execute(tenant, () -> evaluation.process(id));
    }
    @RabbitListener(queues = AiInterviewWorkDispatcher.EMAIL_QUEUE)
    public void email(Long id, @Header(value = "X-Tenant-ID", required = false) String tenant) {
        executor.execute(tenant, () -> work.sendEmail(id));
    }
}
