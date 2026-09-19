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
    private final String jobEventsExchange;

    public JobPublisher(
            RabbitTemplate rabbitTemplate,
            TenantRegistryService registry,
            @Value("${app.rabbitmq.exchanges.cv-parse}") String cvParseExchange,
            @Value("${app.rabbitmq.exchanges.cv-extract}") String cvExtractExchange,
            @Value("${app.rabbitmq.exchanges.cv-analysis}") String cvAnalysisExchange,
            @Value("${app.rabbitmq.exchanges.cv-matching}") String cvMatchingExchange,
            @Value("${app.rabbitmq.exchanges.job-events}") String jobEventsExchange) {
        this.rabbitTemplate = rabbitTemplate;
        this.registry = registry;
        this.cvParseExchange = cvParseExchange;
        this.cvExtractExchange = cvExtractExchange;
        this.cvAnalysisExchange = cvAnalysisExchange;
        this.cvMatchingExchange = cvMatchingExchange;
        this.jobEventsExchange = jobEventsExchange;
    }

    public JobPublisher(RabbitTemplate rabbitTemplate, TenantRegistryService registry,
            String cvParseExchange, String cvExtractExchange, String cvAnalysisExchange,
            String cvMatchingExchange) {
        this(rabbitTemplate, registry, cvParseExchange, cvExtractExchange, cvAnalysisExchange,
                cvMatchingExchange, "job.events");
    }

    public JobPublisher(RabbitTemplate rabbitTemplate, TenantRegistryService registry, String cvAnalysisExchange) {
        this(rabbitTemplate, registry, "cv.parse", "cv.extract", cvAnalysisExchange,
                "cv.matching", "job.events");
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
    public void publishRankingRecompute(long jobId) {
        String code = registry.requireActive(TenantContext.getCurrentTenant()).getCode();
        rabbitTemplate.convertAndSend(jobEventsExchange, RabbitMqConfig.RK,
                "{\"type\":\"RANKING_RECOMPUTE\",\"jobId\":" + jobId + "}", message -> {
                    message.getMessageProperties().setHeader("X-Tenant-ID", code);
                    return message;
                });
    }
}
