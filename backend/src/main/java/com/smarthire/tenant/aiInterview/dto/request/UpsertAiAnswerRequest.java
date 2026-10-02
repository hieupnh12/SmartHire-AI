package com.smarthire.tenant.aiInterview.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.time.Instant;

@Schema(description = "Upsert candidate answer for an AI interview question", example = """
        {"answerText":"I led a migration to microservices...","answerDuration":120}
        """)
public record UpsertAiAnswerRequest(
        @Size(max = 50000) String answerText,
        @Min(0) Integer answerDuration,
        Instant answeredAt) {
}
