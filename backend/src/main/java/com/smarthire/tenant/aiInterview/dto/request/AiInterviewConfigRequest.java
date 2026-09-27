package com.smarthire.tenant.aiInterview.dto.request;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;

public record AiInterviewConfigRequest(boolean enabled,
        @NotNull @DecimalMin("0") @DecimalMax("100") @Digits(integer = 3, fraction = 2) BigDecimal passingScore,
        @Min(1) @Max(10) int questionCount, Instant availableUntil) {}
