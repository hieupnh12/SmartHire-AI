package com.smarthire.tenant.assessment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.tenant.assessment.dto.request.QuestionRequest;
import org.springframework.http.HttpStatus;
import java.util.Set;

public final class QuestionContent {
    private QuestionContent() {}
    public static void validate(QuestionRequest request) {
        String type = request.questionType().name();
        if ("ESSAY".equals(type) && request.rubricJson() != null && !request.rubricJson().isNull()) validateRubric(request.rubricJson());
        if (!"ESSAY".equals(type) && request.rubricJson() != null && !request.rubricJson().isNull()) throw invalid("Only essays accept rubricJson");
        if ("CODING".equals(type)) {
            var coding = request.coding();
            if (coding == null || coding.testCases() == null || coding.testCases().isEmpty()
                    || coding.testCases().size() > 50 || coding.testCases().stream().noneMatch(c -> !c.sample())
                    || coding.testCases().stream().noneMatch(c -> c.sample())) throw invalid("Coding requires sample and hidden test cases");
            if (!Set.of("CODING_ALGORITHM", "CODING_OOP", "SQL_QUERY").contains(coding.category())
                    || coding.timeLimitMs() < 100 || coding.timeLimitMs() > 10000 || coding.memoryMb() < 32 || coding.memoryMb() > 512)
                throw invalid("Invalid coding limits or category");
            if (coding.testCases().stream().anyMatch(c -> c.weight() != null)) {
                var hidden = coding.testCases().stream().filter(c -> !c.sample()).toList();
                if (hidden.size() < 2 || hidden.stream().anyMatch(c -> c.weight() == null || c.weight().signum() <= 0)
                        || hidden.stream().map(c -> c.weight()).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add)
                            .compareTo(java.math.BigDecimal.valueOf(100)) != 0) throw invalid("Hidden test weights must total 100; two hidden tests required (totaling 100)");
            }
            validateLanguages(coding.starterCode(), false);
            validateLanguages(coding.harness(), true);
            coding.starterCode().fieldNames().forEachRemaining(language -> {
                if (!coding.harness().has(language)) throw invalid("Each language needs a harness containing {{SOURCE}}");
            });
        } else if (request.coding() != null) throw invalid("Only coding questions accept coding data");
    }
    public static void validateRubric(JsonNode rubric) {
        if (!rubric.isObject() || rubric.toString().length() > 50000 || !rubric.path("referenceAnswer").isTextual()
                || rubric.path("referenceAnswer").asText().isBlank() || !rubric.path("criteria").isArray()
                || rubric.path("criteria").isEmpty() || rubric.path("criteria").size() > 20) throw invalid("Essay requires a reference answer and weighted rubric criteria");
        if (rubric.has("category") && !Set.of("ESSAY_CONCEPTUAL", "ESSAY_SCENARIO").contains(rubric.path("category").asText())) throw invalid("Invalid essay category");
        int total = 0;
        for (JsonNode criterion : rubric.path("criteria")) {
            if (!criterion.path("description").isTextual() || criterion.path("description").asText().isBlank()
                    || !criterion.path("weight").isIntegralNumber() || criterion.path("weight").asInt() < 1)
                throw invalid("Each rubric criterion requires description and positive integer weight");
            total += criterion.path("weight").asInt();
        }
        if (total != 100) throw invalid("Rubric weights must total 100");
    }
    private static void validateLanguages(JsonNode node, boolean harness) {
        if (node == null || !node.isObject() || node.isEmpty() || node.size() > 5) throw invalid("Language templates are required");
        node.fields().forEachRemaining(entry -> {
            if (!Set.of("java", "python", "javascript", "cpp", "sql").contains(entry.getKey()) || !entry.getValue().isTextual()
                    || entry.getValue().asText().length() > 10000 || (harness && !entry.getValue().asText().contains("{{SOURCE}}")))
                throw invalid("Invalid language template");
        });
    }
    public static void apply(Question question, QuestionRequest request) {
        question.setRubricJson(request.rubricJson() == null || request.rubricJson().isNull() ? null : request.rubricJson().deepCopy());
        if (request.coding() == null) { question.setCodingProblem(null); return; }
        var data = request.coding();
        var problem = question.getCodingProblem() == null ? new CodingProblem() : question.getCodingProblem();
        problem.setQuestion(question); problem.setTest(question.getTest());
        problem.setTitle(data.title() == null || data.title().isBlank() ? question.getQuestionText().substring(0, Math.min(255, question.getQuestionText().length())) : data.title().trim());
        problem.setPrompt(question.getQuestionText()); problem.setCategory(data.category());
        problem.setTimeLimitMs(data.timeLimitMs()); problem.setMemoryMb(data.memoryMb());
        problem.setStarterCodeJson(data.starterCode().deepCopy()); problem.setHarnessJson(data.harness().deepCopy());
        problem.getTestCases().clear();
        for (var input : data.testCases()) {
            var row = new TestCase(); row.setCodingProblem(problem); row.setInputData(input.input());
            row.setWeight(input.weight() == null ? java.math.BigDecimal.ONE : input.weight());
            row.setExpectedOutput(input.expectedOutput()); row.setSample(input.sample()); problem.getTestCases().add(row);
        }
        question.setCodingProblem(problem);
    }
    private static BusinessException invalid(String message) {
        return new BusinessException(message, HttpStatus.BAD_REQUEST, "INVALID_TEST");
    }
}
