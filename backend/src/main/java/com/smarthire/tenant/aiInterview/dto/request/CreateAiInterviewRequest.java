package com.smarthire.tenant.aiInterview.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@Schema(description = "Create an AI interview session for an application", example = """
        {"applicationId":1,"workflowStageId":3}
        """)
public record CreateAiInterviewRequest(
        @NotNull @Positive Long applicationId,
        @Positive Long workflowStageId) {
}
