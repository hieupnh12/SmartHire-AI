package com.smarthire.tenant.assessment.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import com.smarthire.domain.enums.QuestionType;

public record AssessmentConfigRequest(
        @Min(1) @Max(480) int durationMinutes,
        @Min(0) @Max(100) int passingPercent,
        boolean autoAssign,
        @NotNull @Size(min = 1, max = 100) List<@NotNull @Valid Section> sections) {
    public record Section(@NotBlank @Size(max = 128) String skill,
            @NotNull QuestionType questionType,
            @NotBlank @Pattern(regexp = "Easy|Medium|Hard") String difficulty,
            @Min(1) @Max(100) int count,
            @Min(1) @Max(10000) int points) {}
}
