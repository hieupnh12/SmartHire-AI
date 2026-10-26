package com.smarthire.tenant.assessment.ai;

import java.util.List;

/**
 * Spring AI structured-output target for QUESTION_GEN.
 * ChatClient.call().entity(GeneratedBankQuestionBatch.class) maps the model JSON into this graph.
 */
public record GeneratedBankQuestionBatch(List<GeneratedBankQuestion> questions) {

    public record GeneratedBankQuestion(
            String questionText,
            Integer points,
            String explanation,
            List<GeneratedOption> options,
            GeneratedRubric rubricJson) {}

    public record GeneratedOption(String optionText, Boolean correct) {}

    public record GeneratedRubric(String referenceAnswer, List<GeneratedCriterion> criteria) {}

    public record GeneratedCriterion(String description, Integer weight) {}
}
