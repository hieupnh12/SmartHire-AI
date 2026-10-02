package com.smarthire.tenant.aiInterview.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.tenant.aiInterview.mapper.AiInterviewMapper;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import static org.assertj.core.api.Assertions.*;

class InterviewProcessQuestionsTest {
    final ObjectMapper mapper = new ObjectMapper();
    final AiInterview interview = AiInterview.builder().id(1L).build();
    final AiInterviewProcessRun run = AiInterviewProcessRun.builder().id(2L).processKey("TECHNICAL_KNOWLEDGE")
            .configSnapshotJson("{\"key\":\"TECHNICAL_KNOWLEDGE\",\"config\":{\"questionCount\":2}}").build();

    ObjectNode row(String kind, int index) {
        var row = mapper.createObjectNode().put("index", index).put("questionText", "Question " + index)
                .put("questionType", kind).put("difficulty", "hard").put("referenceAnswer", "Explain constructor injection");
        row.putArray("keyPoints").add("Constructor").add("Container").add("Lifecycle");
        if (kind.endsWith("CHOICE")) {
            row.putArray("options").add("First").add("Second").add("Third").add("Fourth");
            var correct = row.putArray("correctOptions").add(1); if (kind.equals("MULTIPLE_CHOICE")) correct.add(2);
            row.put("explanation", "Constructor and lifecycle are important");
        }
        return row;
    }
    @Test void communicationAcceptsEmptyOptionalChoiceFieldsButRejectsActualChoices() {
        var config = Map.<String, Object>of("difficulty", "adaptive");
        var communicationRun = AiInterviewProcessRun.builder().processKey("COMMUNICATION").build();
        var slots = InterviewProcessQuestions.slots(mapper, "COMMUNICATION", config, List.of("Java"), 1);
        var row = row("COMMUNICATION", 0);
        row.putArray("options"); row.putNull("correctOptions");
        var generated = InterviewProcessQuestions.validate(mapper, interview, communicationRun, config, slots,
                mapper.createArrayNode().add(row), 0);
        assertThat(generated).hasSize(1);
        assertThat(generated.getFirst().getOptionsJson()).isNull();
        assertThat(InterviewPolicies.tree(generated.getFirst().getRubricJson()).path("referenceAnswer").asText()).isNotBlank();
        row.putArray("options").add("Leaked choice");
        assertThatThrownBy(() -> InterviewProcessQuestions.validate(mapper, interview, communicationRun, config, slots,
                mapper.createArrayNode().add(row), 0)).hasMessage("Open exercise contains choice data");
    }

    Map<String, Object> config(String format) {
        return Map.of("questionFormat", format, "difficulty", "hard", "randomizeOptions", false,
                "explanationRequired", true, "allowMultipleCorrectAnswers", true);
    }
    List<AiQuestion> generate(String format) {
        var config = config(format); var slots = InterviewProcessQuestions.slots(mapper, "TECHNICAL_KNOWLEDGE", config, List.of("Java"), 2);
        var rows = mapper.createArrayNode(); slots.forEach(slot -> rows.add(row(slot.path("kind").asText(), slot.path("index").asInt())));
        return InterviewProcessQuestions.validate(mapper, interview, run, config, slots, rows, 0);
    }
    @ParameterizedTest @CsvSource({"single,SINGLE_CHOICE,SINGLE_CHOICE", "multiple,MULTIPLE_CHOICE,MULTIPLE_CHOICE", "mixed,SINGLE_CHOICE,MULTIPLE_CHOICE"})
    void respectsConfiguredChoiceFormatsAndKeepsPrivateKeys(String format, String first, String second) {
        var questions = generate(format);
        assertThat(questions).extracting(AiQuestion::getQuestionType).containsExactly(first, second);
        var response = new AiInterviewMapper().toQuestion(questions.getFirst(), null, null, false);
        assertThat(response.options()).hasSize(4); assertThat(response.correctOptions()).isNull();
        assertThat(response.correctOption()).isNull(); assertThat(response.explanation()).isNull();
        assertThat(response.skills()).containsExactly("Java"); assertThat(response.difficulty()).isEqualTo("hard");
        assertThat(response.explanationRequired()).isTrue();
        var reviewed = new AiInterviewMapper().toQuestion(questions.getFirst(), null, null, true);
        assertThat(reviewed.correctOptions()).hasSize(format.equals("multiple") ? 2 : 1);
    }
    @Test void rejectsOpenQuestionWhenSingleChoiceWasConfigured() {
        var config = config("single"); var slots = InterviewProcessQuestions.slots(mapper, "TECHNICAL_KNOWLEDGE", config, List.of("Java"), 1);
        assertThatThrownBy(() -> InterviewProcessQuestions.validate(mapper, interview, run, config, slots,
                mapper.createArrayNode().add(row("CONCEPTUAL", 0)), 0)).hasMessageContaining("incorrect exercise format");
    }
    @Test void rejectsWrongDifficultyAndIncorrectAnswerCardinality() {
        var config = config("single"); var slots = InterviewProcessQuestions.slots(mapper, "TECHNICAL_KNOWLEDGE", config, List.of(), 1);
        var row = row("SINGLE_CHOICE", 0).put("difficulty", "easy");
        assertThatThrownBy(() -> InterviewProcessQuestions.validate(mapper, interview, run, config, slots, mapper.createArrayNode().add(row), 0))
                .hasMessageContaining("difficulty");
        row.put("difficulty", "hard"); row.putArray("correctOptions").add(0).add(1);
        assertThatThrownBy(() -> InterviewProcessQuestions.validate(mapper, interview, run, config, slots, mapper.createArrayNode().add(row), 0))
                .hasMessageContaining("cardinality");
    }
    @Test void randomizingOptionsRemapsAnswerKey() {
        var config = new HashMap<>(config("multiple")); config.put("randomizeOptions", true);
        var slots = InterviewProcessQuestions.slots(mapper, "TECHNICAL_KNOWLEDGE", config, List.of(), 1);
        var question = InterviewProcessQuestions.validate(mapper, interview, run, config, slots,
                mapper.createArrayNode().add(row("MULTIPLE_CHOICE", 0)), 0).getFirst();
        var options = InterviewPolicies.tree(question.getOptionsJson());
        assertThat(InterviewChoiceAnswers.correct(question).stream().map(index -> options.get(index).asText()).toList()).containsExactlyInAnyOrder("Second", "Third");
    }
    @Test void validatesMultipleChoiceAndMandatoryExplanation() {
        var question = generate("multiple").getFirst();
        assertThat(InterviewChoiceAnswers.parse(question, "{\"selectedOptions\":[1,2],\"explanation\":\"Uses constructor injection\"}").selected())
                .containsExactlyInAnyOrder(1, 2);
        for (String invalid : List.of("1", "{\"selectedOptions\":[1,1],\"explanation\":\"x\"}", "{\"selectedOptions\":[4],\"explanation\":\"x\"}", "{\"selectedOptions\":[1,2]}"))
            assertThatThrownBy(() -> InterviewChoiceAnswers.parse(question, invalid)).isInstanceOf(com.smarthire.common.exception.BusinessException.class);
    }
    @Test void canonicalSettingsDiscardUiMetadataAndAcceptNumericStrings() {
        var process = new com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy.Process("TECHNICAL_KNOWLEDGE", true, 1, 100,
                Map.of("questionCount", "4", "__fields", List.of("private metadata"), "Question Count3 câu4 câu", "3", "difficulty", "easy"));
        var settings = InterviewProcessSettings.config(process);
        assertThat(settings).containsEntry("questionCount", 4).containsEntry("difficulty", "easy").doesNotContainKeys("__fields", "Question Count3 câu4 câu");
    }

    @Test void roadmapAndTotalReadTheSameNumericStringCountsAsGeneration() {
        var application = new Application(); var job = new Job(); application.setJob(job); interview.setApplication(application);
        interview.setConfigSnapshotJson("""
            {"questionCount":1,"policy":{"schemaVersion":2,"processes":[
            {"key":"TECHNICAL_KNOWLEDGE","enabled":true,"order":1,"config":{"questionCount":"4"}},
            {"key":"PROBLEM_SOLVING","enabled":true,"order":2,"config":{"questionCount":"2"}}]}}
            """);
        var response = new AiInterviewMapper().toResponse(interview);
        assertThat(response.questionCount()).isEqualTo(6);
        assertThat(response.roadmap()).extracting(com.smarthire.tenant.aiInterview.dto.response.RoadmapStep::questionCount).containsExactly(4, 2);
        assertThat(response.roadmap().getFirst().kind()).isEqualTo("MCQ");
    }

    @Test void saveRejectsContradictoryFormatsInvalidWeightsAndUnsupportedRealtime() {
        var policy = InterviewPolicies.defaults();
        var process = new com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy.Process("TECHNICAL_KNOWLEDGE", true, 1, 100,
                Map.of("questionCount", 4, "questionFormat", "multiple", "allowMultipleCorrectAnswers", false));
        var v2 = new com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy(30, 1, false, 3, 30, 0,
                policy.weights(), List.of(), List.of(), 2, "TEXT", null, null, List.of(process));
        var request = new com.smarthire.tenant.aiInterview.dto.request.AiInterviewConfigRequest(true, java.math.BigDecimal.valueOf(70), 4, null, v2);
        assertThatThrownBy(() -> InterviewPolicies.validate(request, Set.of(), true)).hasMessageContaining("Multiple");
        var communication = new com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy.Process("COMMUNICATION", true, 1, 100,
                Map.of("questionCount", 1, "realTimeInteraction", true));
        v2 = new com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy(30, 1, false, 3, 30, 0,
                policy.weights(), List.of(), List.of(), 2, "TEXT", null, null, List.of(communication));
        var unsupported = new com.smarthire.tenant.aiInterview.dto.request.AiInterviewConfigRequest(true, java.math.BigDecimal.valueOf(70), 1, null, v2);
        assertThatThrownBy(() -> InterviewPolicies.validate(unsupported, Set.of(), true)).hasMessageContaining("Streaming");
    }
}
