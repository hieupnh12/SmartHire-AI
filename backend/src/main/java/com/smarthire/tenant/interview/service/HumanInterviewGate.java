package com.smarthire.tenant.interview.service;

import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.domain.enums.CvScreeningStatus;
import com.smarthire.domain.enums.TestSubmissionStatus;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.Submission;
import com.smarthire.domain.tenant.repository.AiInterviewRepository;
import java.util.List;

/** Shared rules: Human Interview invite/unlock only after CV + AI Interview + Assessment all pass. */
public final class HumanInterviewGate {
    private HumanInterviewGate() {}

    public static boolean cvPassed(Application application) {
        return application != null && application.getCvScreeningStatus() == CvScreeningStatus.PASSED;
    }

    public static boolean aiInterviewPassed(AiInterviewRepository aiInterviews, long applicationId) {
        return aiInterviews != null && aiInterviews.existsByApplication_IdAndStatus(applicationId, AiInterviewStatus.PASSED);
    }

    public static boolean assessmentPassed(List<Submission> submissions) {
        if (submissions == null) return false;
        for (Submission submission : submissions) {
            if (submission.getStatus() != TestSubmissionStatus.GRADED || submission.getScore() == null) continue;
            var threshold = submission.getTest() == null ? null : submission.getTest().getPassingScore();
            if (threshold == null || submission.getScore().compareTo(threshold) >= 0) return true;
        }
        return false;
    }

    public static boolean allRoundsPassed(Application application, AiInterviewRepository aiInterviews, List<Submission> submissions) {
        return cvPassed(application)
                && application.getId() != null
                && aiInterviewPassed(aiInterviews, application.getId())
                && assessmentPassed(submissions);
    }
}
