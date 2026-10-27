package com.smarthire.tenant.assessment.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import com.smarthire.domain.enums.QuestionType;

public record AssessmentConfigRequest(
        @Min(1) @Max(480) int durationMinutes,
        @Min(0) @Max(100) int passingPercent,
        boolean autoAssign,
        @NotNull @Size(min = 1, max = 100) List<@NotNull @Valid Section> sections,
        @Min(1) Integer objectiveDurationMinutes,
        @Min(0) @Max(100) Integer codingTestWeightPercent,
        @Min(0) @Max(100) Integer codingAiWeightPercent,
        List<@Valid RubricCriterionConfig> essayCriteria,
        @Size(max = 2000) String essayGradingGuide) {

    public AssessmentConfigRequest(int duration, int passingPercent, boolean autoAssign, List<Section> sections) {
        this(duration, passingPercent, autoAssign, sections, null, 80, 20, null, null);
    }

    public AssessmentConfigRequest(int duration, int passingPercent, boolean autoAssign, List<Section> sections, Integer objectiveDurationMinutes) {
        this(duration, passingPercent, autoAssign, sections, objectiveDurationMinutes, 80, 20, null, null);
    }

    public record Section(@NotBlank @Size(max = 128) String skill,
            @NotNull QuestionType questionType,
            @NotBlank @Pattern(regexp = "Easy|Medium|Hard") String difficulty,
            @Min(1) @Max(100) int count,
            @Min(1) @Max(10000) int points) {}

    public record RubricCriterionConfig(
            @NotBlank @Size(max = 200) String name,
            @Min(1) @Max(100) int weight,
            @Size(max = 1000) String guide) {}
}
