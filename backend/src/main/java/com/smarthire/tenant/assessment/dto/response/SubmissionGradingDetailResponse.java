package com.smarthire.tenant.assessment.dto.response;

import com.smarthire.domain.enums.TestSubmissionStatus;
import com.smarthire.tenant.assessment.service.AssessmentGradingService;
import java.math.BigDecimal;
import java.util.List;

public record SubmissionGradingDetailResponse(long id, String testTitle, String candidateName, String candidateEmail,
        TestSubmissionStatus status, BigDecimal score, int totalPoints, BigDecimal passingScore,
        boolean emailAvailable, ObjectiveSummary objective, List<AssessmentGradingService.Review> reviews) {
    public record ObjectiveSummary(int correctCount, int questionCount, BigDecimal score, int totalPoints) {}
}
