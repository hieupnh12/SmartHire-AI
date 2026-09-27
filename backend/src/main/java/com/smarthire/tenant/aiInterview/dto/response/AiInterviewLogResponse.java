package com.smarthire.tenant.aiInterview.dto.response;

import java.time.Instant;

public record AiInterviewLogResponse(
        Long id,
        Long aiInterviewId,
        String event,
        String status,
        String detail,
        Instant createdAt) {
}
