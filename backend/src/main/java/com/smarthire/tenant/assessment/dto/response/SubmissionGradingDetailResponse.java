package com.smarthire.tenant.assessment.dto.response;

import com.smarthire.domain.enums.TestSubmissionStatus;
import com.smarthire.tenant.assessment.service.AssessmentGradingService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record SubmissionGradingDetailResponse(long id, String testTitle, String candidateName, String candidateEmail,
        TestSubmissionStatus status, BigDecimal score, int totalPoints, BigDecimal passingScore,
        boolean emailAvailable, ObjectiveSummary objective, List<AssessmentGradingService.Review> reviews,
        Integrity integrity) {
    public record ObjectiveSummary(int correctCount, int questionCount, BigDecimal score, int totalPoints) {}
    public record Integrity(int proctorEventCount, List<ProctorRow> proctorEvents, List<CustomRunRow> customRuns) {}
    public record ProctorRow(String eventType, Instant createdAt, String detail) {}
    public record CustomRunRow(long questionId, String prompt, int count) {}
}
