package com.smarthire.tenant.assessment.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record SendAssessmentRequest(@NotNull @Positive Long applicationId) {}
