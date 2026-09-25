package com.smarthire.tenant.dashboard.dto;

public record DashboardActionItemsResponse(
        long newApplicants,
        long pendingCvScreening,
        long upcomingInterviews,
        long draftJobs,
        long jobsNearDeadline) {
}
