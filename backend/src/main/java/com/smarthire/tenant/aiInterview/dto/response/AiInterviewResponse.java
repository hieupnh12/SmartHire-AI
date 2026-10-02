package com.smarthire.tenant.aiInterview.dto.response;

import com.smarthire.domain.enums.AiInterviewStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record AiInterviewResponse(
        Long id,
        Long applicationId,
        Long jobId,
        Long candidateId,
        Long workflowStageId,
        Instant startedAt,
        Instant completedAt,
        BigDecimal overallScore,
        AiInterviewStatus status,
        Instant createdAt,
        List<AiQuestionResponse> questions,
        String jobTitle,
        BigDecimal passingScore,
        String errorMessage,
        int questionCount,
        Instant expiresAt,
        int attemptNumber,
        boolean canRetry,
        String reportJson,
        Integer durationMinutes,
        Integer maxAttempts,
        Instant availableFrom,
        Instant availableUntil,
        List<RoadmapStep> roadmap) {
}
