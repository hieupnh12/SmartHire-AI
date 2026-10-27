package com.smarthire.tenant.assessment.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record AssessmentJobReportResponse(long jobId, List<QuestionStat> questions, List<AttemptStat> attempts) {
    public record QuestionStat(long questionId, String type, int points, long graded, long fullCredit, double passRatePercent, Double avgScorePercent) {}
    public record AttemptStat(long submissionId, long testId, String testTitle, String candidateName, String status,
            BigDecimal score, Integer totalPoints, Long durationSeconds, int customRunCount, int proctorEventCount) {}
}
