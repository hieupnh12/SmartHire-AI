package com.smarthire.tenant.dashboard.dto;

import java.math.BigDecimal;

public record DashboardSummaryResponse(
        long openJobs,
        long newApplicants,
        long interviewsScheduled,
        BigDecimal hireRate,
        BigDecimal avgMatchScore
) {
}
