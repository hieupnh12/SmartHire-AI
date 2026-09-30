package com.smarthire.tenant.assessment.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

@Schema(description = "Partial save: MCQ uses selectedOptionId, MULTIPLE_CHOICE uses selectedOptionIds, ESSAY uses answerText. Omitted questions remain unchanged; null/empty values clear the corresponding answer.",
        example = "{\"answers\":[{\"questionId\":1,\"selectedOptionId\":2}]}")
public record SaveAnswersRequest(
        @NotEmpty @Size(max = 100) List<@NotNull @Valid AnswerInput> answers) {
    public record AnswerInput(@NotNull @Positive Long questionId, @Positive Long selectedOptionId,
            @Size(max = 10) List<@NotNull @Positive Long> selectedOptionIds,
            @Size(max = 10000) String answerText) {
        public AnswerInput(Long questionId, Long selectedOptionId) {
            this(questionId, selectedOptionId, null, null);
        }
    }
}
