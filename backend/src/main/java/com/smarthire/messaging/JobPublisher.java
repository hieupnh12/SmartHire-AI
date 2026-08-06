package com.smarthire.messaging;

import com.smarthire.config.RabbitMqConfig;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Publish async jobs to RabbitMQ (AI / email / notify).
 * Sync APIs (login, view job, dashboard read) must NOT go through this.
 */
@Component
public class JobPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final String cvAnalysisExchange;

    public JobPublisher(
            RabbitTemplate rabbitTemplate,
            @Value("${app.rabbitmq.exchanges.cv-analysis}") String cvAnalysisExchange) {
        this.rabbitTemplate = rabbitTemplate;
        this.cvAnalysisExchange = cvAnalysisExchange;
    }

    public void publishCvAnalysis(String payloadJson) {
        rabbitTemplate.convertAndSend(cvAnalysisExchange, RabbitMqConfig.RK, payloadJson);
    }
}
