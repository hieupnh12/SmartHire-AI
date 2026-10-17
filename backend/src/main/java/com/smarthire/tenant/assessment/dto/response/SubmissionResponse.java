package com.smarthire.tenant.assessment.dto.response;

import com.smarthire.domain.enums.TestSubmissionStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record SubmissionResponse(Long id, Long testId, Long applicationId, String title,
        TestSubmissionStatus status, Instant startedAt, Instant expiresAt, Instant submittedAt,
        Instant serverTime, long remainingSeconds, BigDecimal score, int totalPoints, Boolean passed,
        List<CandidateQuestion> questions, List<SavedAnswer> answers, Instant objectiveCompletedAt, Instant objectiveExpiresAt) {
    public record CandidateQuestion(Long id, String questionText, String questionType, int points,
            int questionOrder, List<CandidateOption> options, com.smarthire.tenant.assessment.dto.request.CodingRequest coding) {}
    public record CandidateOption(Long id, String optionText) {}
    public record SavedAnswer(Long questionId, Long selectedOptionId, List<Long> selectedOptionIds,
            @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
            String answerText, String language) {}
}
