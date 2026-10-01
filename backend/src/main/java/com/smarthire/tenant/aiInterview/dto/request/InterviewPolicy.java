package com.smarthire.tenant.aiInterview.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.Map;

public record InterviewPolicy(
        @Min(1) @Max(180) int durationMinutes,
        @Min(1) @Max(5) int maxAttempts,
        boolean miniAssessmentEnabled,
        @Min(3) @Max(10) int miniQuestionCount,
        @Min(0) @Max(100) int miniWeight,
        @Min(0) int miniAfterStage,
        @NotNull Map<String, @NotNull @Min(0) @Max(100) Integer> weights,
        @NotNull @Size(max = 30) List<@NotBlank String> selectedSkills,
        @NotNull @Size(max = 20) List<@NotNull @Valid Stage> stages,
        Integer schemaVersion,
        String interviewMode,
        Review review,
        Voice voice,
        List<@Valid Process> processes) {
    public InterviewPolicy(int durationMinutes, int maxAttempts, boolean miniAssessmentEnabled, int miniQuestionCount,
            int miniWeight, int miniAfterStage, Map<String, Integer> weights, List<String> selectedSkills, List<Stage> stages) {
        this(durationMinutes, maxAttempts, miniAssessmentEnabled, miniQuestionCount, miniWeight, miniAfterStage,
                weights, selectedSkills, stages, null, null, null, null, null);
    }
    public record Stage(@NotBlank @Size(max = 120) String title,
            @Min(1) @Max(30) int questionCount,
            @NotEmpty List<@NotBlank String> competencies,
            @NotNull List<@NotBlank String> skills) {}

    public record Review(boolean showCorrectAnswer, boolean showExplanationAfterInterview) {}
    public record Voice(boolean enabled, String language, boolean recordAudio, boolean generateTranscript,
                        boolean ttsEnabled, boolean realTimeInteraction) {}
    public record Process(@NotBlank @Size(max = 64) String key, boolean enabled, @Min(1) int order,
                          @Min(0) @Max(100) int weight, @NotNull Map<String, Object> config) {}
}
