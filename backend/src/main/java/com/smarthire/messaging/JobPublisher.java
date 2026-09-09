package com.smarthire.messaging;

import com.smarthire.config.RabbitMqConfig;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.service.TenantRegistryService;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JobPublisher {
    private final RabbitTemplate rabbitTemplate;
    private final String cvAnalysisExchange;
    private final TenantRegistryService registry;

    public JobPublisher(RabbitTemplate rabbitTemplate, TenantRegistryService registry,
            @Value("${app.rabbitmq.exchanges.cv-analysis}") String cvAnalysisExchange) {
        this.rabbitTemplate = rabbitTemplate;
        this.registry = registry;
        this.cvAnalysisExchange = cvAnalysisExchange;
    }

    public void publishCvAnalysis(String payloadJson) {
        String code = registry.requireActive(TenantContext.getCurrentTenant()).getCode();
        rabbitTemplate.convertAndSend(cvAnalysisExchange, RabbitMqConfig.RK, payloadJson, message -> {
            message.getMessageProperties().setHeader("X-Tenant-ID", code);
            return message;
        });
    }
}
