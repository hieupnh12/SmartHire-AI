package com.smarthire.tenant.aiInterview.dto.response;

import java.time.Instant;

public record AiAnswerResponse(
        Long id,
        Long aiQuestionId,
        String answerText,
        Integer answerDuration,
        Instant answeredAt,
        AiFeedbackResponse feedback) {
}
