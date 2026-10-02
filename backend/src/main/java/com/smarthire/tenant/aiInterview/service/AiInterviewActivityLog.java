package com.smarthire.tenant.aiInterview.service;

import com.smarthire.domain.tenant.entity.AiInterview;
import com.smarthire.domain.tenant.entity.AiInterviewLog;
import com.smarthire.domain.tenant.repository.AiInterviewLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/** Persists each AI Interview pipeline step to ai_interview_logs. Details must never contain answer text or PII. */
@Service
public class AiInterviewActivityLog {
    private static final Logger log = LoggerFactory.getLogger(AiInterviewActivityLog.class);
    private static final int MAX_DETAIL = 1000;

    private final AiInterviewLogRepository logs;

    public AiInterviewActivityLog(AiInterviewLogRepository logs) {
        this.logs = logs;
    }

    public void record(AiInterview interview, String event, String detail) {
        String status = interview.getStatus() == null ? null : interview.getStatus().name();
        String safeDetail = detail == null || detail.length() <= MAX_DETAIL ? detail : detail.substring(0, MAX_DETAIL);
        logs.save(AiInterviewLog.builder()
                .aiInterview(interview)
                .event(event)
                .status(status)
                .detail(safeDetail)
                .build());
        log.info("AI interview {} event={} status={}", interview.getId(), event, status);
    }
}
