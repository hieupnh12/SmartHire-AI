package com.smarthire.tenant.aiInterview.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Create or update an AI interview question", example = """
        {"questionText":"Tell me about a challenging project.","questionType":"BEHAVIORAL","questionOrder":0}
        """)
public record AiQuestionRequest(
        @NotBlank @Size(max = 20000) String questionText,
        @NotBlank @Size(max = 32) String questionType,
        @NotNull @Min(0) Integer questionOrder) {
}
