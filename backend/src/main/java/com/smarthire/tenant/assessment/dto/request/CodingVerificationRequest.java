package com.smarthire.tenant.assessment.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CodingVerificationRequest(@NotNull @Valid CodingRequest coding,
        @NotBlank @Size(max = 32) String language, @NotBlank @Size(max = 10000) String source) {}
