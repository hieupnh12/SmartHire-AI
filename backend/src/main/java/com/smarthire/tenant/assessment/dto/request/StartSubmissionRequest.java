package com.smarthire.tenant.assessment.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@Schema(example = "{\"applicationId\":1}")
public record StartSubmissionRequest(@NotNull @Positive Long applicationId) {}
