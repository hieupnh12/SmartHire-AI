package com.smarthire.tenant.assessment.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Spring AI structured-output target for QUESTION_GEN.
 * ChatClient.call().entity(GeneratedBankQuestionBatch.class) maps the model JSON into this graph.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record GeneratedBankQuestionBatch(
        @JsonProperty("questions") List<GeneratedBankQuestion> questions) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GeneratedBankQuestion(
            @JsonProperty("questionText") String questionText,
            @JsonProperty("points") Integer points,
            @JsonProperty("explanation") String explanation,
            @JsonProperty("options") List<GeneratedOption> options,
            @JsonProperty("rubricJson") GeneratedRubric rubricJson) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GeneratedOption(
            @JsonProperty("optionText") String optionText,
            @JsonProperty("correct") Boolean correct) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GeneratedRubric(
            @JsonProperty("referenceAnswer") String referenceAnswer,
            @JsonProperty("criteria") List<GeneratedCriterion> criteria) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GeneratedCriterion(
            @JsonProperty("description") String description,
            @JsonProperty("weight") Integer weight) {}
}
