package com.smarthire.tenant.aiInterview.dto.request;

import com.smarthire.domain.enums.AiInterviewStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.Instant;

@Schema(description = "Update AI interview session metadata/status", example = """
        {"workflowStageId":3,"status":"IN_PROGRESS","startedAt":"2026-09-26T07:00:00Z"}
        """)
public record UpdateAiInterviewRequest(
        @Positive Long workflowStageId,
        AiInterviewStatus status,
        Instant startedAt,
        Instant completedAt,
        @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal overallScore) {
}
