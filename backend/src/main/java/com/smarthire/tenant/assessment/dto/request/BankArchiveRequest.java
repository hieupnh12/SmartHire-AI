package com.smarthire.tenant.assessment.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record BankArchiveRequest(
        @NotNull @Size(min = 1, max = 999) List<@NotNull @Positive Long> questionIds,
        boolean archived) {}
