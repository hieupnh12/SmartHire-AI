package com.smarthire.tenant.aiInterview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smarthire.domain.tenant.entity.*;
import java.util.*;

/** Validates the exercise contract before any generated questions are persisted. */
final class InterviewProcessQuestions {
    static final String INSTRUCTION = "Generate exactly one job-related exercise per supplied slot, preserving slot.index, "
            + "slot.kind, slot.questionType, slot.difficulty and slot.skills. Use commonConfiguration and configuration, "
            + "jobDescription, responsibilities, requirements, jobSkills and candidateEvidence when provided. "
            + "Resolve adaptive difficulty to exactly easy, medium or hard based on minimumYearsExperience and job level; never return adaptive as difficulty. Use the requested language. "
            + "Honor enabled requirement flags (solution/explanation/real example/role/challenges/result/reflection/justification/alternatives/trade-offs). "
            + "For coding/debugging/code review provide concrete code and the requested task inside questionText. "
            + "Never invent CV claims when evidence is missing. Communication must match the configured technical/non-technical audience and test job knowledge, problem solving, reasoning and clarity. When previousAnswer is supplied, adapt the next main question to it and the job requirements. "
            + "Return {\"questions\":[{\"index\":0,\"questionText\":\"...\",\"questionType\":\"...\",\"difficulty\":\"...\","
            + "\"referenceAnswer\":\"...\",\"keyPoints\":[\"...\"]}]}. "
            + "OPEN needs a private referenceAnswer and 3-6 nonempty scoring keyPoints, and no options/correctOptions. "
            + "Only for choice kinds add options, correctOptions and explanation fields. SINGLE_CHOICE needs exactly 4 distinct options and exactly 1 correctOptions index 0-3. "
            + "MULTIPLE_CHOICE needs exactly 4 distinct options and 2-3 distinct correctOptions indices 0-3. "
            + "Both choice kinds need a private explanation and referenceAnswer plus 3-6 keyPoints for evaluating a candidate explanation. "
            + "Only provide a hint when configuration.allowHint is true. Never reveal answers in questionText or hint. "
            + "Never repeat alreadyAskedQuestions. Never generate follow-up questions unless specifically requested.";

    private InterviewProcessQuestions() {}

    static List<ObjectNode> slots(ObjectMapper mapper, String key, Map<String, Object> config, List<String> skills, int count) {
        List<ObjectNode> result = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            String kind = "OPEN", type = switch (key) {
                case "PROBLEM_SOLVING" -> "SCENARIO";
                case "PRACTICAL_EXPERIENCE" -> "EXPERIENCE_BASED";
                case "TECHNICAL_REASONING" -> "CODE_REVIEW";
                case "BEHAVIORAL_SITUATIONAL" -> "BEHAVIORAL";
                case "COMMUNICATION" -> "COMMUNICATION";
                default -> "CONCEPTUAL";
            };
            if (key.equals("TECHNICAL_KNOWLEDGE")) {
                String format = config.getOrDefault("questionFormat", "mixed").toString();
                boolean multiple = InterviewProcessSettings.bool(config, "allowMultipleCorrectAnswers", true)
                        && (format.equals("multiple") || format.equals("mixed") && i % 2 == 1);
                kind = multiple ? "MULTIPLE_CHOICE" : "SINGLE_CHOICE"; type = kind;
            } else if (key.equals("PROBLEM_SOLVING")) {
                String style = config.getOrDefault("problemStyle", "mixed").toString();
                if (style.equals("coding") || style.equals("debugging") || style.equals("mixed") && i % 2 == 1) type = "CODE_REVIEW";
            }
            var slot = mapper.createObjectNode().put("index", i).put("kind", kind).put("questionType", type)
                    .put("difficulty", config.getOrDefault("difficulty", "adaptive").toString());
            var assigned = new ArrayList<String>();
            for (int skillIndex = i; skillIndex < skills.size(); skillIndex += count) assigned.add(skills.get(skillIndex));
            if (assigned.isEmpty() && !skills.isEmpty()) assigned.add(skills.get(i % skills.size()));
            slot.set("skills", mapper.valueToTree(assigned)); result.add(slot);
        }
        return result;
    }

    static List<AiQuestion> validate(ObjectMapper mapper, AiInterview interview, AiInterviewProcessRun run,
            Map<String, Object> config, List<ObjectNode> slots, JsonNode rows, int order) {
        if (!rows.isArray() || rows.size() != slots.size()) throw new IllegalStateException("Invalid process question count");
        Map<Integer, JsonNode> bySlot = new HashMap<>();
        Set<String> seen = new HashSet<>();
        for (var row : rows) {
            if (!row.path("index").isIntegralNumber() || row.path("index").asInt() < 0
                    || row.path("index").asInt() >= slots.size() || bySlot.put(row.path("index").asInt(), row) != null)
                throw new IllegalStateException("Invalid process question slot");
        }
        List<AiQuestion> generated = new ArrayList<>();
        for (var slot : slots) {
            int index = slot.path("index").asInt(); var row = bySlot.get(index);
            String text = text(row, "questionText", 10000), reference = text(row, "referenceAnswer", 10000);
            if (!seen.add(text.toLowerCase(Locale.ROOT)) || !slot.path("questionType").asText().equals(row.path("questionType").asText()))
                throw new IllegalStateException("Duplicate question or incorrect exercise format");
            String difficulty = text(row, "difficulty", 32);
            if (!List.of("easy", "medium", "hard").contains(difficulty)
                    || !slot.path("difficulty").asText().equals("adaptive") && !slot.path("difficulty").asText().equals(difficulty))
                throw new IllegalStateException("Incorrect exercise difficulty");
            var points = row.path("keyPoints");
            if (!points.isArray() || points.size() < 3 || points.size() > 6) throw new IllegalStateException("Invalid process question rubric");
            for (var point : points) if (!point.isTextual() || point.asText().isBlank() || point.asText().length() > 2000)
                throw new IllegalStateException("Invalid scoring key point");
            var rubric = mapper.createObjectNode().put("processKey", run.getProcessKey()).put("referenceAnswer", reference)
                    .put("difficulty", difficulty).put("kind", slot.path("kind").asText());
            rubric.set("keyPoints", points); rubric.set("skills", slot.path("skills"));
            rubric.putArray("competencies").add(InterviewProcessSettings.competency(run.getProcessKey()));
            var question = AiQuestion.builder().aiInterview(interview).processRun(run).questionText(text)
                    .questionType(row.path("questionType").asText()).questionOrder(order + index * 10)
                    .sequenceNo((index + 1) * 10).questionRole("MAIN").build();
            if (!slot.path("kind").asText().equals("OPEN")) {
                var options = row.path("options"); var correct = row.path("correctOptions");
                Set<String> distinct = new HashSet<>(); Set<Integer> indices = new HashSet<>();
                if (!options.isArray() || options.size() != 4 || !correct.isArray()) throw new IllegalStateException("Invalid choice options");
                for (var option : options) if (!option.isTextual() || option.asText().isBlank() || option.asText().length() > 2000
                        || !distinct.add(option.asText().trim().toLowerCase(Locale.ROOT))) throw new IllegalStateException("Invalid choice options");
                for (var answer : correct) if (!answer.isIntegralNumber() || answer.asInt() < 0 || answer.asInt() > 3
                        || !indices.add(answer.asInt())) throw new IllegalStateException("Invalid choice answer key");
                boolean single = slot.path("kind").asText().equals("SINGLE_CHOICE");
                if (single ? indices.size() != 1 : indices.size() < 2 || indices.size() > 3)
                    throw new IllegalStateException("Incorrect choice answer cardinality");
                var values = new ArrayList<String>(); for (var option : options) values.add(option.asText());
                if (InterviewProcessSettings.bool(config, "randomizeOptions", true)) {
                    var permutation = new ArrayList<>(List.of(0, 1, 2, 3)); Collections.shuffle(permutation);
                    var shuffled = new ArrayList<String>(); var remapped = new HashSet<Integer>();
                    for (int position = 0; position < 4; position++) {
                        shuffled.add(values.get(permutation.get(position)));
                        if (indices.contains(permutation.get(position))) remapped.add(position);
                    }
                    values = shuffled; indices = remapped;
                }
                rubric.set("correctOptions", mapper.valueToTree(indices.stream().sorted().toList()));
                rubric.put("explanationRequired", InterviewProcessSettings.bool(config, "explanationRequired", true));
                question.setOptionsJson(InterviewPolicies.json(values));
                question.setCorrectOption(single ? indices.iterator().next() : null);
                question.setExplanation(text(row, "explanation", 10000));
            } else if (hasChoiceData(row.path("options")) || hasChoiceData(row.path("correctOptions")))
                throw new IllegalStateException("Open exercise contains choice data");
            if (InterviewProcessSettings.bool(config, "allowHint", false)) rubric.put("hint", text(row, "hint", 2000));
            question.setRubricJson(rubric.toString()); generated.add(question);
        }
        return generated;
    }
    private static boolean hasChoiceData(JsonNode value) {
        return !value.isMissingNode() && !value.isNull() && !(value.isArray() && value.isEmpty());
    }

    static String text(JsonNode node, String key, int max) {
        var value = node.path(key);
        if (!value.isTextual() || value.asText().isBlank() || value.asText().length() > max) throw new IllegalStateException("Invalid exercise text: " + key);
        return value.asText().trim();
    }
}
