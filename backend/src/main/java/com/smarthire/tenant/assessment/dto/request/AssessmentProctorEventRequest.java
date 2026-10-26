package com.smarthire.tenant.assessment.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AssessmentProctorEventRequest(
        @NotBlank
        @Size(max = 64)
        String event,
        @Size(max = 1000)
        String detail,
        @Min(0) @Max(86_400)
        Long durationSeconds) {
}
