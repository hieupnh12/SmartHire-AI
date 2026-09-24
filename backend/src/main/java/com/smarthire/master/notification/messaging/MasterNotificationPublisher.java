package com.smarthire.master.notification.messaging;

import com.smarthire.config.RabbitMqConfig;
import com.smarthire.master.notification.dto.MasterEmailPayload;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class MasterNotificationPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final String notifyEmailExchange;

    public MasterNotificationPublisher(
            RabbitTemplate rabbitTemplate,
            @Value("${app.rabbitmq.exchanges.notify-email}") String notifyEmailExchange) {
        this.rabbitTemplate = rabbitTemplate;
        this.notifyEmailExchange = notifyEmailExchange;
    }

    public void publishEmail(MasterEmailPayload payload) {
        log.info("Publishing email notification for tenant {} to queue. Type: {}", payload.getTenantCode(), payload.getNotificationType());
        rabbitTemplate.convertAndSend(notifyEmailExchange, RabbitMqConfig.RK, payload);
    }
}
