package com.smarthire.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Scaffold AI CV analysis worker.
 * Concurrency controlled by spring.rabbitmq.listener.simple.concurrency (Worker Pool).
 * Replace body with real OpenAI / model call when implementing CV-04.
 */
@Component
public class CvAnalysisWorker {

    private static final Logger log = LoggerFactory.getLogger(CvAnalysisWorker.class);

    @RabbitListener(queues = "${app.rabbitmq.queues.cv-analysis}")
    public void onCvAnalysis(String payload) {
        // TODO CV-04: parse payload → call AI → persist cv_analyses → WebSocket notify
        log.info("Received cv.analysis job (scaffold): {}", payload);
    }
}
