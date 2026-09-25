package com.smarthire.tenant.assessment.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

@Schema(description = "Partial save. Omitted questions remain unchanged; null selectedOptionId clears an answer.",
        example = "{\"answers\":[{\"questionId\":1,\"selectedOptionId\":2}]}")
public record SaveAnswersRequest(
        @NotEmpty @Size(max = 100) List<@NotNull @Valid AnswerInput> answers) {
    public record AnswerInput(@NotNull @Positive Long questionId, @Positive Long selectedOptionId) {}
}
