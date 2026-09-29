package com.smarthire.tenant.assessment.dto.response;

import com.smarthire.domain.enums.TestSubmissionStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record SubmissionSummaryResponse(Long id, Long testId, String testTitle, Long applicationId,
        Long candidateId, String candidateName, String candidateEmail, TestSubmissionStatus status,
        Instant startedAt, Instant expiresAt, Instant submittedAt, long remainingSeconds,
        BigDecimal score, int totalPoints, BigDecimal passingScore, Boolean passed) {
}
