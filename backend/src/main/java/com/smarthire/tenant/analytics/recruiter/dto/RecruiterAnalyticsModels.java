package com.smarthire.tenant.analytics.recruiter.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class RecruiterAnalyticsModels {
    private RecruiterAnalyticsModels() {}

    public record Filter(Instant from, Instant to, Long jobId) {
        public Filter(Instant from, Instant to) {
            this(from, to, null);
        }
    }

    public record ActionCounts(long cvsToScreen, long candidatesOverSla, long assessmentsPendingReview, long upcomingInterviews) {}
    public record JobAttention(long jobId, String title, long candidateCount, String currentFocusStage, long overdueCount, int healthScore) {}
    public record WorkloadResponse(ActionCounts actions, List<JobAttention> jobs) {}

    public record JobOverviewResponse(
            long jobId,
            String title,
            String status,
            String department,
            String screeningMode,
            Integer headcount,
            long hiredCount,
            long pendingOfferCount,
            long totalApplications,
            long allTimeApplications,
            BigDecimal conversionRate,
            BigDecimal averageOverallScore,
            long overdueCount,
            long cvsToScreen,
            long pendingAssessments,
            long upcomingInterviews,
            Instant publishedAt,
            Instant deadline) {}

    public record PipelineStage(
            String code,
            String label,
            long count,
            long reachedCount,
            BigDecimal conversionRate,
            BigDecimal avgHoursInStage) {}

    public record SlaAlert(String stageCode, String stageLabel, long candidateCount, long oldestWaitingMinutes, long thresholdMinutes) {}

    public record StageDropOff(
            String stageCode,
            String stageLabel,
            long rejectedCount,
            long failedCount,
            long withdrawnCount,
            long totalDropOff) {}

    public record PipelineResponse(
            long totalCandidates,
            long activeJobs,
            List<PipelineStage> stages,
            List<SlaAlert> slaAlerts,
            List<StageDropOff> dropOffs) {}

    public record SourceQuality(String code, String label, long candidateCount, BigDecimal averageQualityScore, BigDecimal conversionRate) {}
    public record TrendPoint(String period, BigDecimal score, long applications, long hired) {}
    public record Insight(String title, String message) {}

    public record ScoreBucket(String label, long count, int minInclusive, int maxInclusive) {}
    public record ScoreDistribution(
            String type,
            long count,
            BigDecimal average,
            BigDecimal min,
            BigDecimal max,
            BigDecimal passRate,
            List<ScoreBucket> buckets) {}

    public record QualityResponse(
            BigDecimal talentQualityIndex,
            List<SourceQuality> sources,
            List<TrendPoint> trend,
            Insight insight,
            List<ScoreDistribution> scoreDistributions) {}

    public record PerformanceMetric(String code, BigDecimal value, String unit, BigDecimal target, String comparison, Boolean achieved) {}
    public record PerformanceResponse(List<PerformanceMetric> metrics, long achievedTargets, long totalTargets, String recommendation) {}

    public record SkillGapItem(
            String skillName,
            String category,
            boolean required,
            BigDecimal weight,
            String minLevel,
            long matchedCandidates,
            long totalCandidates,
            BigDecimal coveragePercent,
            BigDecimal gapPercent) {}

    public record ReasonStat(String reason, long count, BigDecimal sharePercent) {}

    public record LossAnalysis(
            long totalRejected,
            long totalFailed,
            long totalWithdrawn,
            List<ReasonStat> rejectReasons,
            List<ReasonStat> withdrawReasons) {}

    public record ProctorEventStat(String eventType, long count) {}

    public record ProctorSummary(
            long totalSubmissions,
            long reportsCount,
            long lowRiskCount,
            long mediumRiskCount,
            long highRiskCount,
            BigDecimal averageRiskScore,
            List<ProctorEventStat> topEvents) {}

    public record HumanInterviewSummary(
            long evaluationCount,
            BigDecimal avgTechnicalScore,
            BigDecimal avgCommunicationScore,
            BigDecimal avgCultureScore,
            BigDecimal avgOverallScore,
            Map<String, Long> recommendations) {}

    public record AiInterviewSummary(
            long totalSessions,
            long completedSessions,
            long passedCount,
            BigDecimal averageScore,
            BigDecimal passingScore) {}

    public record JobInsightsResponse(
            long jobId,
            long evaluatedCvCount,
            List<SkillGapItem> skillGaps,
            LossAnalysis lossAnalysis,
            ProctorSummary proctoring,
            HumanInterviewSummary humanInterviews,
            AiInterviewSummary aiInterviews) {}
}
