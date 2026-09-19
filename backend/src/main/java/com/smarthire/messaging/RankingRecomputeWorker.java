package com.smarthire.messaging;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.tenant.matching.service.RankingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

@Component
public class RankingRecomputeWorker {
    private static final Logger log = LoggerFactory.getLogger(RankingRecomputeWorker.class);
    private final TenantJobExecutor executor;
    private final RankingService rankings;
    private final ObjectMapper mapper;
    public RankingRecomputeWorker(TenantJobExecutor executor, RankingService rankings, ObjectMapper mapper) {
        this.executor = executor; this.rankings = rankings; this.mapper = mapper;
    }
    @RabbitListener(queues = "${app.rabbitmq.queues.job-events}")
    public void onJobEvent(String payload, @Header(name = "X-Tenant-ID", required = false) String tenant) {
        executor.execute(tenant, () -> {
            JsonNode event;
            try {
                event = mapper.readTree(payload);
            } catch (Exception exception) {
                log.warn("Ignoring invalid ranking job event");
                return;
            }
            if ("RANKING_RECOMPUTE".equals(event.path("type").asText()) && event.path("jobId").canConvertToLong())
                rankings.recomputeFromWorker(event.path("jobId").asLong());
        });
    }
}
