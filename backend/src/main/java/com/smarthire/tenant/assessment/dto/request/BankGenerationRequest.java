package com.smarthire.tenant.assessment.dto.request;

import com.smarthire.domain.enums.QuestionType;
import jakarta.validation.constraints.*;

public record BankGenerationRequest(
        @NotBlank @Size(max = 128) String skill,
        @NotNull QuestionType questionType,
        @NotBlank @Pattern(regexp = "Easy|Medium|Hard") String difficulty,
        @Min(1) @Max(5) int count,
        @NotBlank @Pattern(regexp = "java|python|javascript|sql") String language,
        @Size(max = 2000) String instructions) {}
