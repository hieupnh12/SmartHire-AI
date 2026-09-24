package com.smarthire.tenant.assessment.dto.response;

import com.smarthire.domain.enums.TestSubmissionStatus;
import java.math.BigDecimal;

public record AvailableAssessmentResponse(Long id, String title, String description, int durationMinutes,
        BigDecimal passingScore, Long submissionId, TestSubmissionStatus submissionStatus) {}
