package com.smarthire.tenant.aiInterview.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public record AiFeedbackResponse(
        Long id,
        Long aiAnswerId,
        BigDecimal score,
        String feedbackText,
        String strengths,
        String weaknesses,
        Instant createdAt, String evaluationJson) {
}
