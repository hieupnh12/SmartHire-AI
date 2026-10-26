package com.smarthire.tenant.assessment.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "Draft bank questions with AI. Does not persist; recruiter must review and create.")
public record QuestionBankGenerateRequest(
        @NotBlank @Size(max = 128) String skill,
        @NotBlank @Pattern(regexp = "Easy|Medium|Hard") String difficulty,
        @NotBlank @Pattern(regexp = "MCQ|MULTIPLE_CHOICE|ESSAY") String questionType,
        @Min(1) @Max(10) int count,
        @Size(max = 2000) String topic,
        @Pattern(regexp = "vi|en") String language,
        @Size(max = 4000) String context) {
    public QuestionBankGenerateRequest(String skill, String difficulty, String questionType, int count, String topic, String language) {
        this(skill, difficulty, questionType, count, topic, language, null);
    }
    public QuestionBankGenerateRequest {
        if (language == null || language.isBlank()) language = "vi";
        if (topic != null && topic.isBlank()) topic = null;
        if (context != null && context.isBlank()) context = null;
    }
}
