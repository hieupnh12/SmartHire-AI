package com.smarthire.tenant.assessment.dto.response;

import com.smarthire.domain.enums.TestStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record JobTestResponse(
        Long id, Long jobId, String title, String description,
        int durationMinutes, BigDecimal passingScore, TestStatus status, Instant createdAt) {
}
