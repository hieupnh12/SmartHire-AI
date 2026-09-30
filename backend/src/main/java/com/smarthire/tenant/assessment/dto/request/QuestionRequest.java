package com.smarthire.tenant.assessment.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

@Schema(description = "MCQ (default), MULTIPLE_CHOICE or ESSAY. Essay has no options.", example = """
        {"questionText":"Which keyword defines a Java class?","points":5,"questionOrder":0,
         "difficulty":"Easy","skill":"Java","explanation":"class declares a type.",
         "options":[{"optionText":"class","correct":true},{"optionText":"def","correct":false}]}
        """)
public record QuestionRequest(
        @NotBlank @Size(max = 10000) String questionText,
        @NotNull @Min(1) @Max(10000) Integer points,
        @NotNull @Min(0) Integer questionOrder,
        @Size(max = 16) String difficulty,
        @Size(max = 255) String skill,
        @Size(max = 10000) String explanation,
        @Size(max = 10) List<@NotNull @Valid OptionRequest> options,
        com.smarthire.domain.enums.QuestionType questionType) {
    public QuestionRequest {
        if (questionType == null) questionType = com.smarthire.domain.enums.QuestionType.MCQ;
        if (options == null) options = List.of();
    }
    public QuestionRequest(String questionText, Integer points, Integer questionOrder, String difficulty,
            String skill, String explanation, List<OptionRequest> options) {
        this(questionText, points, questionOrder, difficulty, skill, explanation, options, null);
    }
    public record OptionRequest(@NotBlank @Size(max = 5000) String optionText, @NotNull Boolean correct) {}
}
