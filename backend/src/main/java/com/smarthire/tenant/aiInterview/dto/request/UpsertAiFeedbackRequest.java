package com.smarthire.tenant.aiInterview.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

@Schema(description = "Upsert AI feedback for an answer", example = """
        {"score":8.5,"feedbackText":"Clear structure.","strengths":"Concrete examples","weaknesses":"Could quantify impact"}
        """)
public record UpsertAiFeedbackRequest(
        @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal score,
        @Size(max = 20000) String feedbackText,
        @Size(max = 20000) String strengths,
        @Size(max = 20000) String weaknesses) {
}
