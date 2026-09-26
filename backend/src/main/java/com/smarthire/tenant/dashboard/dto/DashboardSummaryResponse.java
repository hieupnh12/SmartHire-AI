package com.smarthire.tenant.dashboard.dto;

import java.math.BigDecimal;

public record DashboardSummaryResponse(
        long openJobs,
        long newApplicants,
        long interviewsScheduled,
        BigDecimal hireRate,
        BigDecimal avgMatchScore,
        long totalJobs,
        long activeJobs,
        long pausedJobs,
        long draftJobs,
        long jobsNearDeadline,
        long totalApplications,
        BigDecimal averageApplicationsPerOpenJob,
        long pendingCvScreening
) {
}
