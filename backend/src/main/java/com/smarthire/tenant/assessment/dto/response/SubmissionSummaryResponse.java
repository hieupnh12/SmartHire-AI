package com.smarthire.tenant.assessment.dto.response;

import com.smarthire.domain.enums.TestSubmissionStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record SubmissionSummaryResponse(Long id, Long testId, String testTitle, Long applicationId,
        Long candidateId, String candidateName, String candidateEmail, TestSubmissionStatus status,
        Instant startedAt, Instant expiresAt, Instant submittedAt, long remainingSeconds,
        BigDecimal score, int totalPoints, BigDecimal passingScore, Boolean passed,
        boolean proctorApproved, boolean proctorCandidateReady, String proctorTerminatedReason,
        boolean strictProctorEnabled, String proctorMeetUrl) {
    public SubmissionSummaryResponse(Long id, Long testId, String testTitle, Long applicationId,
            Long candidateId, String candidateName, String candidateEmail, TestSubmissionStatus status,
            Instant startedAt, Instant expiresAt, Instant submittedAt, long remainingSeconds,
            BigDecimal score, int totalPoints, BigDecimal passingScore, Boolean passed,
            boolean proctorApproved, boolean proctorCandidateReady, String proctorTerminatedReason) {
        this(id, testId, testTitle, applicationId, candidateId, candidateName, candidateEmail, status,
                startedAt, expiresAt, submittedAt, remainingSeconds, score, totalPoints, passingScore, passed,
                proctorApproved, proctorCandidateReady, proctorTerminatedReason, false, null);
    }
    public SubmissionSummaryResponse(Long id, Long testId, String testTitle, Long applicationId,
            Long candidateId, String candidateName, String candidateEmail, TestSubmissionStatus status,
            Instant startedAt, Instant expiresAt, Instant submittedAt, long remainingSeconds,
            BigDecimal score, int totalPoints, BigDecimal passingScore, Boolean passed) {
        this(id, testId, testTitle, applicationId, candidateId, candidateName, candidateEmail, status,
                startedAt, expiresAt, submittedAt, remainingSeconds, score, totalPoints, passingScore, passed,
                true, false, null, false, null);
    }
}
