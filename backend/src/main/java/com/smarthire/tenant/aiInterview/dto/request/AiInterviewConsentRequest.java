package com.smarthire.tenant.aiInterview.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AiInterviewConsentRequest(@NotNull Boolean accepted, @NotBlank String policyVersion, String userAgent) {}
