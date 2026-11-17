package com.smarthire.tenant.assessment.dto.response;

import com.smarthire.domain.enums.TestSubmissionStatus;
import java.math.BigDecimal;

public record AvailableAssessmentResponse(
        Long id,
        String title,
        String description,
        int durationMinutes,
        BigDecimal passingScore,
        Long submissionId,
        TestSubmissionStatus submissionStatus,
        boolean strictProctorEnabled,
        String proctorMeetUrl,
        Boolean proctorApproved,
        Boolean proctorCandidateReady) {
    public AvailableAssessmentResponse(Long id, String title, String description, int durationMinutes,
            BigDecimal passingScore, Long submissionId, TestSubmissionStatus submissionStatus) {
        this(id, title, description, durationMinutes, passingScore, submissionId, submissionStatus, false, null, null, null);
    }
}
