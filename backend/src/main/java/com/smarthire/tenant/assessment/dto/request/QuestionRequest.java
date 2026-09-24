package com.smarthire.tenant.assessment.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

@Schema(description = "Single-choice MCQ. Exactly one option must be correct.", example = """
        {"questionText":"Which keyword defines a Java class?","points":5,"questionOrder":0,
         "options":[{"optionText":"class","correct":true},{"optionText":"def","correct":false}]}
        """)
public record QuestionRequest(
        @NotBlank @Size(max = 10000) String questionText,
        @NotNull @Min(1) @Max(10000) Integer points,
        @NotNull @Min(0) Integer questionOrder,
        @NotNull @Size(min = 2, max = 10) List<@NotNull @Valid OptionRequest> options) {
    public record OptionRequest(@NotBlank @Size(max = 5000) String optionText, @NotNull Boolean correct) {}
}
