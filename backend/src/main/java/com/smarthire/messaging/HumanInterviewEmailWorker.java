package com.smarthire.messaging;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.interview.service.HumanInterviewEmailService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
@Component
@RequiredArgsConstructor
public class HumanInterviewEmailWorker {
    public static final String QUEUE="smarthire.human-interview.email";
    private static final Logger log=LoggerFactory.getLogger(HumanInterviewEmailWorker.class);
    private final TenantInfoRepository tenants;
    private final TenantJobExecutor executor;
    private final HumanInterviewEmailService emails;
    private final RabbitTemplate rabbit;
    @Bean public Queue humanInterviewEmailQueue() { return QueueBuilder.durable(QUEUE).build(); }
    @Scheduled(fixedDelayString="${app.interview.email-dispatch-delay-ms:15000}",initialDelay=15000)
    public void dispatch() {
        for(var tenant:tenants.findAll()) {
            if(!"ACTIVE".equals(tenant.getStatus())) continue;
            try { executor.execute(tenant.getCode(),() -> {
                for(long id:emails.pending()) rabbit.convertAndSend(QUEUE,id,message -> { message.getMessageProperties().setHeader("X-Tenant-ID",TenantContext.getCurrentTenant());return message; });
            }); } catch(Exception ex) { log.warn("Human interview emails remain pending for retry"); }
        }
    }
    @RabbitListener(queues=QUEUE,concurrency="3-10")
    public void send(Long id,@Header(value="X-Tenant-ID",required=false) String tenant) { executor.execute(tenant,() -> emails.send(id)); }
}
