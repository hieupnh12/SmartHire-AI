package com.smarthire.tenant.aiInterview.dto.response;

import java.time.Instant;
import java.util.List;

public record AiQuestionResponse(
        Long id,
        Long aiInterviewId,
        String questionText,
        String questionType,
        int questionOrder,
        Instant createdAt,
        AiAnswerResponse answer,
        List<String> options,
        String stageTitle,
        List<String> competencies,
        List<String> skills,
        Integer correctOption,
        String explanation) {
}
