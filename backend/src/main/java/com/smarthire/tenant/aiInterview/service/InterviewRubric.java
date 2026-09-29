package com.smarthire.tenant.aiInterview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy;
import java.math.*;
import java.util.*;

/** Pure scoring and question-plan rules; AI cannot choose weights or calculate the outcome. */
public final class InterviewRubric {
    private static final ObjectMapper JSON = new ObjectMapper();
    private InterviewRubric() {}

    public static List<ObjectNode> plan(InterviewPolicy p) {
        List<ObjectNode> plan = new ArrayList<>();
        for (int index = 0; index <= p.stages().size(); index++) {
            if (p.miniAssessmentEnabled() && index == p.miniAfterStage()) {
                for (int q = 0; q < p.miniQuestionCount(); q++) plan.add(slot("mini", "Mini Assessment", "MCQ",
                        List.of("TECHNICAL_KNOWLEDGE"), List.of(p.selectedSkills().get(q % p.selectedSkills().size()))));
            }
            if (index < p.stages().size()) {
                var stage = p.stages().get(index);
                var competencies = new ArrayList<>(stage.competencies());
                if (p.weights().getOrDefault("COMMUNICATION", 0) > 0 && !competencies.contains("COMMUNICATION")) {
                    competencies.add("COMMUNICATION");
                }
                for (int q = 0; q < stage.questionCount(); q++) plan.add(slot("stage-" + index, stage.title(), "OPEN",
                        competencies, stage.skills()));
            }
        }
        for (int i = 0; i < plan.size(); i++) plan.get(i).put("slot", i);
        return plan;
    }
    private static ObjectNode slot(String stageId, String title, String type, List<String> competencies, List<String> skills) {
        var node = JSON.createObjectNode().put("stageId", stageId).put("stageTitle", title).put("kind", type);
        node.set("competencies", JSON.valueToTree(competencies)); node.set("skills", JSON.valueToTree(skills));
        return node;
    }
    public static boolean hasReference(AiQuestion question) {
        var rubric = InterviewPolicies.tree(question.getRubricJson());
        return rubric != null && rubric.path("referenceAnswer").isTextual()
                && !rubric.path("referenceAnswer").asText().isBlank()
                && rubric.path("keyPoints").isArray() && !rubric.path("keyPoints").isEmpty();
    }

    /** Validates an AI reference answer and stores it in the rubric; the rubric is never sent to candidates. */
    public static String withReference(String rubricJson, JsonNode row) {
        var rubric = rubricJson == null ? JSON.createObjectNode() : (ObjectNode) InterviewPolicies.tree(rubricJson);
        var reference = row.path("referenceAnswer");
        if (!reference.isTextual() || reference.asText().isBlank() || reference.asText().length() > 10000)
            throw new IllegalStateException("Invalid reference answer");
        var points = row.path("keyPoints");
        if (!points.isArray() || points.size() < 2 || points.size() > 8) throw new IllegalStateException("Invalid key points");
        Set<String> targets = new HashSet<>();
        rubric.path("competencies").forEach(key -> targets.add(key.asText()));
        rubric.path("skills").forEach(key -> targets.add(key.asText()));
        var stored = JSON.createArrayNode();
        for (var point : points) {
            var text = point.path("point");
            if (!text.isTextual() || text.asText().isBlank() || text.asText().length() > 2000) throw new IllegalStateException("Invalid key point");
            var item = stored.addObject().put("point", text.asText().trim());
            if (targets.isEmpty()) continue;
            String target = point.path("target").asText("");
            if (!targets.contains(target)) throw new IllegalStateException("Key point target outside rubric");
            item.put("target", target);
        }
        rubric.put("referenceAnswer", reference.asText().trim());
        rubric.set("keyPoints", stored);
        return rubric.toString();
    }

    /** Reworded questions drop their answer key; scoring writes a new one for the new wording. */
    public static String withoutReference(String rubricJson) {
        var rubric = (ObjectNode) InterviewPolicies.tree(rubricJson);
        rubric.remove(List.of("referenceAnswer", "keyPoints"));
        return rubric.toString();
    }

    /**
     * Scores an answer only against the stored key points. A key point the AI omitted, or scored without a verbatim
     * quote from the answer, is 0; a rubric competency or skill that no key point covers is also 0.
     */
    public static ObjectNode referenceEvaluation(JsonNode row, AiQuestion question, String answer) {
        if (!hasReference(question)) throw new IllegalStateException("Missing reference answer");
        var rubric = InterviewPolicies.tree(question.getRubricJson());
        var points = rubric.path("keyPoints");
        Map<Integer, JsonNode> given = new HashMap<>();
        row.path("keyPoints").forEach(p -> { if (p.path("index").isIntegralNumber()) given.putIfAbsent(p.path("index").asInt(), p); });
        String text = normalize(answer);
        var result = JSON.createObjectNode();
        var scored = result.putArray("keyPoints");
        Map<String, List<BigDecimal>> byTarget = new HashMap<>();
        List<BigDecimal> all = new ArrayList<>();
        for (int i = 0; i < points.size(); i++) {
            var point = points.get(i);
            var hit = given.get(i);
            String evidence = hit == null ? "" : hit.path("evidence").asText("").trim();
            BigDecimal score = BigDecimal.ZERO;
            if (hit != null && hit.path("score").isNumber()) {
                var value = hit.path("score").decimalValue();
                if (value.signum() < 0 || value.compareTo(BigDecimal.valueOf(100)) > 0) throw new IllegalStateException("Invalid key point score");
                String quote = normalize(evidence);
                if (!quote.isEmpty() && text.contains(quote)) score = value.setScale(2, RoundingMode.HALF_UP);
            }
            scored.addObject().put("point", point.path("point").asText()).put("score", score)
                    .put("evidence", score.signum() > 0 ? evidence : "");
            all.add(score);
            if (point.has("target")) byTarget.computeIfAbsent(point.path("target").asText(), k -> new ArrayList<>()).add(score);
        }
        for (String field : List.of("competencies", "skills")) {
            var scores = result.putObject(field);
            for (var key : rubric.path(field)) {
                var values = byTarget.get(key.asText());
                scores.put(key.asText(), values == null ? BigDecimal.ZERO.setScale(2) : mean(values));
            }
        }
        result.put("score", mean(all));
        return result;
    }
    private static String normalize(String value) {
        if (value == null) return "";
        return java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFC).toLowerCase(Locale.ROOT)
                .replaceAll("\\s+", " ").trim();
    }
    public static String fixedEvaluation(AiQuestion question, int score) {
        var rubric = InterviewPolicies.tree(question.getRubricJson());
        var result = JSON.createObjectNode();
        for (String field : List.of("competencies", "skills")) {
            var scores = result.putObject(field);
            for (var key : rubric.path(field)) scores.put(key.asText(), score);
        }
        return result.toString();
    }
    public static ObjectNode report(InterviewPolicy policy, List<AiFeedback> feedback) {
        var result = JSON.createObjectNode();
        var groups = result.putObject("competencies");
        result.set("weights", JSON.valueToTree(policy.weights()));
        var skills = result.putObject("skills");
        BigDecimal total = BigDecimal.ZERO;
        for (String key : InterviewPolicies.COMPETENCIES) {
            if (policy.weights().get(key) == 0) continue;
            BigDecimal score = average(feedback, "competencies", key, false);
            if (score == null) throw new IllegalStateException("Missing competency evidence");
            if (key.equals("TECHNICAL_KNOWLEDGE") && policy.miniAssessmentEnabled()) {
                var mini = average(feedback, "competencies", key, true);
                if (mini == null) throw new IllegalStateException("Missing mini assessment");
                result.put("miniAssessmentScore", mini);
                score = score.multiply(BigDecimal.valueOf(100 - policy.miniWeight()))
                        .add(mini.multiply(BigDecimal.valueOf(policy.miniWeight()))).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            }
            groups.put(key, score);
            total = total.add(score.multiply(BigDecimal.valueOf(policy.weights().get(key))));
        }
        for (String skill : policy.selectedSkills()) {
            var entry = skills.putObject(skill);
            var all = values(feedback, "skills", skill, null);
            if (all.isEmpty()) entry.putNull("score"); else entry.put("score", mean(all));
            entry.put("evidenceCount", all.size());
            entry.put("miniAssessmentTested", !values(feedback, "skills", skill, true).isEmpty());
            var evidence = entry.putArray("questionIds");
            feedback.stream().filter(f -> InterviewPolicies.tree(f.getEvaluationJson()).path("skills").has(skill))
                    .forEach(f -> evidence.add(f.getAiAnswer().getAiQuestion().getId()));
        }
        result.put("overallScore", total.divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));
        return result;
    }
    private static BigDecimal average(List<AiFeedback> feedback, String field, String key, boolean mini) {
        var values = values(feedback, field, key, mini);
        return values.isEmpty() ? null : mean(values);
    }
    private static List<BigDecimal> values(List<AiFeedback> feedback, String field, String key, Boolean mini) {
        return feedback.stream().filter(f -> mini == null || (f.getAiAnswer().getAiQuestion().getCorrectOption() != null) == mini)
                .map(f -> InterviewPolicies.tree(f.getEvaluationJson()).path(field).path(key))
                .filter(JsonNode::isNumber).map(JsonNode::decimalValue).toList();
    }
    private static BigDecimal mean(List<BigDecimal> values) {
        return values.stream().reduce(BigDecimal.ZERO, BigDecimal::add).divide(BigDecimal.valueOf(values.size()), 2, RoundingMode.HALF_UP);
    }
}
