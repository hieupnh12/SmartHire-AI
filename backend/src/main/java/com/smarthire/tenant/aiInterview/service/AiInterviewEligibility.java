package com.smarthire.tenant.aiInterview.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.CvScreeningStatus;
import com.smarthire.domain.tenant.entity.Application;
import java.time.Instant;
import org.springframework.http.HttpStatus;

public final class AiInterviewEligibility {
    private AiInterviewEligibility() {}

    public static void require(Application application) {
        if (application.getCvScreeningStatus() != CvScreeningStatus.PASSED) {
            throw new BusinessException("CV screening must be passed first", HttpStatus.CONFLICT, "CV_SCREENING_NOT_PASSED");
        }
        var job = application.getJob();
        if (!InterviewPolicies.enabled(job) || job.getDeletedAt() != null
                || job.getAiInterviewAvailableUntil() != null && !Instant.now().isBefore(job.getAiInterviewAvailableUntil())) {
            throw new BusinessException("AI interview is not available for this job", HttpStatus.CONFLICT, "AI_INTERVIEW_UNAVAILABLE");
        }
        if (application.getStatus() != ApplicationStatus.INTERVIEW || application.getArchivedAt() != null
                || application.getWithdrawnAt() != null) {
            throw new BusinessException("Application is not in the interview round", HttpStatus.CONFLICT, "AI_INTERVIEW_NOT_ELIGIBLE");
        }
    }

    /** In-flight sessions keep the snapshot taken when questions were created. */
    public static void requireExisting(com.smarthire.domain.tenant.entity.AiInterview interview) {
        var application = interview.getApplication();
        if (application.getCvScreeningStatus() != CvScreeningStatus.PASSED || application.getArchivedAt() != null
                || application.getWithdrawnAt() != null) {
            throw new BusinessException("Application is not in the interview round", HttpStatus.CONFLICT, "AI_INTERVIEW_NOT_ELIGIBLE");
        }
    }
}
