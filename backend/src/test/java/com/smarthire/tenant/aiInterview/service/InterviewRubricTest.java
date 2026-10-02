package com.smarthire.tenant.aiInterview.service;

import com.smarthire.domain.tenant.entity.AiAnswer;
import com.smarthire.domain.tenant.entity.AiFeedback;
import com.smarthire.domain.tenant.entity.AiQuestion;
import com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class InterviewRubricTest {
    @Test void technicalScoreBlendsAnswersAndMiniAssessment() {
        var policy = policy(true, 30);
        var open = feedback(question(false, "TECHNICAL_KNOWLEDGE", "Java"), "{\"competencies\":{\"TECHNICAL_KNOWLEDGE\":80},\"skills\":{\"Java\":80}}");
        var mini = feedback(question(true, "TECHNICAL_KNOWLEDGE", "Java"), "{\"competencies\":{\"TECHNICAL_KNOWLEDGE\":100},\"skills\":{\"Java\":100}}");
        var report = InterviewRubric.report(policy, List.of(open, mini));
        assertThat(report.path("competencies").path("TECHNICAL_KNOWLEDGE").decimalValue()).isEqualByComparingTo("86.00");
        assertThat(report.path("overallScore").decimalValue()).isEqualByComparingTo("86.00");
        assertThat(report.path("weights").path("TECHNICAL_KNOWLEDGE").asInt()).isEqualTo(100);
        assertThat(report.path("skills").path("SQL").path("score").isNull()).isTrue();
        assertThat(report.path("skills").path("Java").path("score").decimalValue()).isEqualByComparingTo("90.00");
    }

    @Test void technicalScoreUsesAnswersWhenMiniAssessmentIsOff() {
        var report = InterviewRubric.report(policy(false, 30), List.of(
                feedback(question(false, "TECHNICAL_KNOWLEDGE", "Java"), "{\"competencies\":{\"TECHNICAL_KNOWLEDGE\":70},\"skills\":{\"Java\":70}}")));
        assertThat(report.path("competencies").path("TECHNICAL_KNOWLEDGE").decimalValue()).isEqualByComparingTo("70.00");
        assertThat(report.has("miniAssessmentScore")).isFalse();
    }

    @Test void openQuestionsAlwaysCarryCommunicationWhenItHasWeight() {
        var plan = InterviewRubric.plan(new InterviewPolicy(30, 1, true, 1, 30, 0,
                Map.of("TECHNICAL_KNOWLEDGE", 90, "PROBLEM_SOLVING", 0, "PRACTICAL_EXPERIENCE", 0,
                        "COMMUNICATION", 10, "BEHAVIORAL_SITUATIONAL", 0),
                List.of("Java"),
                List.of(new InterviewPolicy.Stage("Kỹ thuật", 1, List.of("TECHNICAL_KNOWLEDGE"), List.of("Java")))));
        assertThat(plan).hasSize(2);
        assertThat(plan.get(0).path("kind").asText()).isEqualTo("MCQ");
        assertThat(plan.get(1).path("competencies").toString()).contains("COMMUNICATION");
    }

    @Test void roadmapDoesNotNeedAnExplicitCommunicationStage() {
        var policy = new InterviewPolicy(30, 1, false, 3, 30, 0,
                Map.of("TECHNICAL_KNOWLEDGE", 90, "PROBLEM_SOLVING", 0, "PRACTICAL_EXPERIENCE", 0,
                        "COMMUNICATION", 10, "BEHAVIORAL_SITUATIONAL", 0),
                List.of("Java"),
                List.of(new InterviewPolicy.Stage("Kỹ thuật", 2, List.of("TECHNICAL_KNOWLEDGE"), List.of("Java"))));
        InterviewPolicies.validate(new com.smarthire.tenant.aiInterview.dto.request.AiInterviewConfigRequest(
                true, new BigDecimal("70"), 2, null, policy), java.util.Set.of("Java"), true);
    }

    @Test void referenceScoringGivesZeroToMissingOrUnquotedKeyPoints() throws Exception {
        var json = new com.fasterxml.jackson.databind.ObjectMapper();
        var rubric = InterviewRubric.withReference(
                "{\"competencies\":[\"TECHNICAL_KNOWLEDGE\",\"COMMUNICATION\"],\"skills\":[\"Java\"]}",
                json.readTree("{\"referenceAnswer\":\"IoC giao việc tạo object cho container\",\"keyPoints\":["
                        + "{\"point\":\"Container tạo và inject bean\",\"target\":\"TECHNICAL_KNOWLEDGE\"},"
                        + "{\"point\":\"Dùng @Component/@Bean\",\"target\":\"Java\"},"
                        + "{\"point\":\"Nêu phạm vi singleton/prototype\",\"target\":\"Java\"}]}"));
        var question = AiQuestion.builder().id(1L).rubricJson(rubric).build();
        // Point 0 is quoted from the answer, point 1 quotes text the candidate never wrote, point 2 is omitted.
        var row = json.readTree("{\"keyPoints\":[{\"index\":0,\"score\":90,\"evidence\":\"Spring  container tạo bean\"},"
                + "{\"index\":1,\"score\":80,\"evidence\":\"dùng @Bean trong config\"}]}");

        var result = InterviewRubric.referenceEvaluation(row, question, "Theo em, spring container tạo bean và inject vào class.");

        assertThat(result.path("keyPoints").get(0).path("score").decimalValue()).isEqualByComparingTo("90");
        assertThat(result.path("keyPoints").get(1).path("score").decimalValue()).isEqualByComparingTo("0");
        assertThat(result.path("keyPoints").get(2).path("score").decimalValue()).isEqualByComparingTo("0");
        assertThat(result.path("score").decimalValue()).isEqualByComparingTo("30");
        assertThat(result.path("competencies").path("TECHNICAL_KNOWLEDGE").decimalValue()).isEqualByComparingTo("90");
        assertThat(result.path("competencies").path("COMMUNICATION").decimalValue()).isEqualByComparingTo("0");
        assertThat(result.path("skills").path("Java").decimalValue()).isEqualByComparingTo("0");
    }

    @Test void referenceKeyPointsMustTargetTheQuestionRubric() throws Exception {
        var row = new com.fasterxml.jackson.databind.ObjectMapper().readTree("{\"referenceAnswer\":\"x\",\"keyPoints\":["
                + "{\"point\":\"a\",\"target\":\"Java\"},{\"point\":\"b\",\"target\":\"Python\"}]}");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> InterviewRubric.withReference(
                "{\"competencies\":[\"TECHNICAL_KNOWLEDGE\"],\"skills\":[\"Java\"]}", row)).isInstanceOf(IllegalStateException.class);
    }

    @Test void missingEvidenceScoresZeroEvenWhenAiSuggestsFullCredit() throws Exception {
        var json = new com.fasterxml.jackson.databind.ObjectMapper();
        var key = json.readTree("""
                {"referenceAnswer":"Use constructor injection","keyPoints":[
                {"point":"Explain injection"},{"point":"Explain lifecycle"}]}
                """);
        var question = AiQuestion.builder().rubricJson(InterviewRubric.withReference(null, key)).build();
        var result = InterviewRubric.referenceEvaluation(json.readTree("""
                {"keyPoints":[{"index":0,"score":100,"evidence":""}]}
                """), question, "asdfasdf");
        assertThat(result.path("score").decimalValue()).isEqualByComparingTo("0");
        assertThat(result.path("keyPoints").get(1).path("score").decimalValue()).isEqualByComparingTo("0");
    }

    @Test void evidenceCannotDropTechnicalOperatorsFromAnswer() throws Exception {
        var json = new com.fasterxml.jackson.databind.ObjectMapper();
        var key = json.readTree("""
                {"referenceAnswer":"C++ and C# differ","keyPoints":[
                {"point":"Explain C++"},{"point":"Explain C#"}]}
                """);
        var question = AiQuestion.builder().rubricJson(InterviewRubric.withReference(null, key)).build();
        var result = InterviewRubric.referenceEvaluation(json.readTree("""
                {"keyPoints":[{"index":0,"score":100,"evidence":"I use C++"}]}
                """), question, "I use C#");
        assertThat(result.path("score").decimalValue()).isEqualByComparingTo("0");
    }

    @Test void missingAnswerKeyIsAnErrorRatherThanACandidateZero() {
        var question = AiQuestion.builder().rubricJson("{\"keyPoints\":[{\"point\":\"x\"}]}").build();
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> InterviewRubric.referenceEvaluation(
                new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode(), question, "answer"))
                .isInstanceOf(IllegalStateException.class).hasMessage("Missing reference answer");
    }

    private static InterviewPolicy policy(boolean mini, int miniWeight) {
        return new InterviewPolicy(30, 1, mini, 3, miniWeight, 0,
                Map.of("TECHNICAL_KNOWLEDGE", 100, "PROBLEM_SOLVING", 0, "PRACTICAL_EXPERIENCE", 0, "COMMUNICATION", 0, "BEHAVIORAL_SITUATIONAL", 0),
                List.of("Java", "SQL"),
                List.of(new InterviewPolicy.Stage("Kỹ thuật", 1, List.of("TECHNICAL_KNOWLEDGE"), List.of("Java"))));
    }

    private static AiQuestion question(boolean mini, String competency, String skill) {
        return AiQuestion.builder().id(mini ? 2L : 1L).correctOption(mini ? 0 : null)
                .rubricJson("{\"competencies\":[\"" + competency + "\"],\"skills\":[\"" + skill + "\"]}").build();
    }

    private static AiFeedback feedback(AiQuestion question, String evaluation) {
        var answer = AiAnswer.builder().id(question.getId()).aiQuestion(question).build();
        return AiFeedback.builder().aiAnswer(answer).evaluationJson(evaluation).build();
    }
}
