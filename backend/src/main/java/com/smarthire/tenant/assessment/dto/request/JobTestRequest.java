package com.smarthire.tenant.assessment.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

@Schema(description = "Create or replace draft test metadata. The job cannot change after creation.", example = """
        {"jobId":1,"title":"Java basics","description":"Java assessment","durationMinutes":30,"passingScore":5}
        """)
public record JobTestRequest(
        @NotNull @Positive Long jobId,
        @NotBlank @Size(max = 255) String title,
        @Size(max = 10000) String description,
        @NotNull @Min(1) Integer durationMinutes,
        @DecimalMin("0.00") @Digits(integer = 8, fraction = 2)
        @Schema(description = "Optional passing threshold in raw points, not a percentage")
        BigDecimal passingScore) {
}
