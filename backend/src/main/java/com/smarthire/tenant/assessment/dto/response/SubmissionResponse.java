package com.smarthire.tenant.assessment.dto.response;

import com.smarthire.domain.enums.TestSubmissionStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record SubmissionResponse(Long id, Long testId, Long applicationId, String title,
        TestSubmissionStatus status, Instant startedAt, Instant expiresAt, Instant submittedAt,
        Instant serverTime, long remainingSeconds, BigDecimal score, int totalPoints, Boolean passed,
        List<CandidateQuestion> questions, List<SavedAnswer> answers) {
    public record CandidateQuestion(Long id, String questionText, String questionType, int points,
            int questionOrder, List<CandidateOption> options) {}
    public record CandidateOption(Long id, String optionText) {}
    public record SavedAnswer(Long questionId, Long selectedOptionId) {}
}
