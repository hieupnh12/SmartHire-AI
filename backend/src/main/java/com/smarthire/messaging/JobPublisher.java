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
    private final TenantRegistryService registry;
    private final String cvParseExchange;
    private final String cvExtractExchange;
    private final String cvAnalysisExchange;
    private final String cvMatchingExchange;

    public JobPublisher(
            RabbitTemplate rabbitTemplate,
            TenantRegistryService registry,
            @Value("${app.rabbitmq.exchanges.cv-parse}") String cvParseExchange,
            @Value("${app.rabbitmq.exchanges.cv-extract}") String cvExtractExchange,
            @Value("${app.rabbitmq.exchanges.cv-analysis}") String cvAnalysisExchange,
            @Value("${app.rabbitmq.exchanges.cv-matching}") String cvMatchingExchange) {
        this.rabbitTemplate = rabbitTemplate;
        this.registry = registry;
        this.cvParseExchange = cvParseExchange;
        this.cvExtractExchange = cvExtractExchange;
        this.cvAnalysisExchange = cvAnalysisExchange;
        this.cvMatchingExchange = cvMatchingExchange;
    }

    public void publishParse(long cvId) { publish(cvParseExchange, new CvJobPayload(cvId)); }
    public void publishExtract(long cvId) { publish(cvExtractExchange, new CvJobPayload(cvId)); }
    public void publishAnalysis(long cvId) { publish(cvAnalysisExchange, new CvJobPayload(cvId)); }
    public void publishMatching(long cvId) { publish(cvMatchingExchange, new CvJobPayload(cvId)); }

    /** Kept for existing tests and callers. */
    public void publishCvAnalysis(String payloadJson) {
        publish(cvAnalysisExchange, payloadJson);
    }

    private void publish(String exchange, Object payload) {
        String code = registry.requireActive(TenantContext.getCurrentTenant()).getCode();
        rabbitTemplate.convertAndSend(exchange, RabbitMqConfig.RK, payload, message -> {
            message.getMessageProperties().setHeader("X-Tenant-ID", code);
            return message;
        });
    }
}
