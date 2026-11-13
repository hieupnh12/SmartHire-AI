package com.smarthire.tenant.mobile.dto;

import java.time.Instant;

public record MobileDashboardResponse(
        String candidateName,
        String candidateEmail,
        long totalApplications,
        long activeApplications,
        long upcomingInterviewsCount,
        long pendingAssessmentsCount,
        long unreadNotificationsCount,
        NextInterviewItem nextInterview,
        RecentApplicationItem recentApplication
) {
    public record NextInterviewItem(
            Long id,
            String title,
            String interviewType,
            String status,
            Instant scheduledStart,
            Instant scheduledEnd,
            String meetingLink
    ) {}

    public record RecentApplicationItem(
            Long id,
            Long jobId,
            String jobTitle,
            String status,
            Instant appliedAt
    ) {}
}
