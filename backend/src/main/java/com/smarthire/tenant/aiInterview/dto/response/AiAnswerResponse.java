package com.smarthire.tenant.aiInterview.dto.response;

import java.time.Instant;

public record AiAnswerResponse(
        Long id,
        Long aiQuestionId,
        String answerText,
        Integer answerDuration,
        Instant answeredAt,
        AiFeedbackResponse feedback,
        @io.swagger.v3.oas.annotations.media.Schema(description = "Browser-measured speech signals saved with the answer; null when disabled or text-only")
        com.smarthire.tenant.aiInterview.dto.request.SpeechMetrics speechMetrics) {
}
