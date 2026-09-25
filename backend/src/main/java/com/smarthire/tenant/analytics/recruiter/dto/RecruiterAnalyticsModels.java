package com.smarthire.tenant.analytics.recruiter.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class RecruiterAnalyticsModels {
    private RecruiterAnalyticsModels() {}

    public record Filter(Instant from, Instant to) {}
    public record ActionCounts(long cvsToScreen, long candidatesOverSla, long assessmentsPendingReview, long upcomingInterviews) {}
    public record JobAttention(long jobId, String title, long candidateCount, String currentFocusStage, long overdueCount, int healthScore) {}
    public record WorkloadResponse(ActionCounts actions, List<JobAttention> jobs) {}
    public record PipelineStage(String code, String label, long count, BigDecimal conversionRate) {}
    public record SlaAlert(String stageCode, String stageLabel, long candidateCount, long oldestWaitingMinutes, long thresholdMinutes) {}
    public record PipelineResponse(long totalCandidates, long activeJobs, List<PipelineStage> stages, List<SlaAlert> slaAlerts) {}
    public record SourceQuality(String code, String label, long candidateCount, BigDecimal averageQualityScore, BigDecimal conversionRate) {}
    public record TrendPoint(String period, BigDecimal score) {}
    public record Insight(String title, String message) {}
    public record QualityResponse(BigDecimal talentQualityIndex, List<SourceQuality> sources, List<TrendPoint> trend, Insight insight) {}
    public record PerformanceMetric(String code, BigDecimal value, String unit, BigDecimal target, String comparison, Boolean achieved) {}
    public record PerformanceResponse(List<PerformanceMetric> metrics, long achievedTargets, long totalTargets, String recommendation) {}
}
