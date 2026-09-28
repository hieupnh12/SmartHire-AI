package com.smarthire.tenant.aiInterview.dto.response;

import java.time.Instant;

public record AiQuestionResponse(
        Long id,
        Long aiInterviewId,
        String questionText,
        String questionType,
        int questionOrder,
        Instant createdAt,
        AiAnswerResponse answer) {
}
