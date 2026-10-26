package com.smarthire.tenant.assessment.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AssessmentProctorEventRequest(
        @NotBlank @Size(max = 64) String event,
        @Size(max = 2000) String detail) {}
