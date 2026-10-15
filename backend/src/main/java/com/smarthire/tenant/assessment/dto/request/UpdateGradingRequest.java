package com.smarthire.tenant.assessment.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public record UpdateGradingRequest(@NotNull @Size(max = 100) List<@NotNull @Valid Decision> decisions) {
    public record Decision(@Positive long questionId, @DecimalMin("0.00") @Digits(integer = 5, fraction = 2) BigDecimal score) {}
}
