package com.smarthire.tenant.assessment.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record BankQuestionBatchRequest(
        @NotNull @Size(min = 1, max = 999) List<@NotNull @Valid BankQuestionRequest> questions) {}
