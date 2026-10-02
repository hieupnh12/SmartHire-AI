package com.smarthire.tenant.aiInterview.service;

import com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy;
import java.util.*;

/** Canonical V2 exercise settings; UI metadata is never sent to the provider. */
public final class InterviewProcessSettings {
    private InterviewProcessSettings() {}

    public static Map<String, Object> config(InterviewPolicy.Process process) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("questionCount", questionCount(process.config()));
        switch (process.key()) {
            case "TECHNICAL_KNOWLEDGE" -> {
                result.put("questionFormat", "mixed"); result.put("difficulty", "adaptive");
                result.put("randomizeOptions", true); result.put("allowMultipleCorrectAnswers", true);
                result.put("explanationRequired", true); result.put("showCorrectAnswer", true);
                result.put("showExplanationAfterInterview", true);
            }
            case "PROBLEM_SOLVING" -> {
                result.put("problemStyle", "mixed"); result.put("difficulty", "adaptive"); result.put("complexity", "medium");
                result.put("requireSolution", true); result.put("requireExplanation", true); result.put("allowHint", false);
            }
            case "PRACTICAL_EXPERIENCE" -> {
                result.put("experienceDepth", "standard"); result.put("askRealExample", true);
                result.put("askCandidateRole", true); result.put("askChallenges", true); result.put("askResult", true);
                result.put("verifyAgainstCV", true);
            }
            case "TECHNICAL_REASONING" -> {
                result.put("scenarioComplexity", "medium"); result.put("requireJustification", true);
                result.put("askAlternatives", true); result.put("askTradeOffs", true);
                result.put("challengeCandidateAnswer", true); result.put("followUpDepth", 2);
            }
            case "BEHAVIORAL_SITUATIONAL" -> {
                result.put("requireRealExample", true); result.put("askAction", true);
                result.put("askResult", true); result.put("askReflection", true);
            }
            case "COMMUNICATION" -> {
                result.put("language", "English"); result.put("technicalExplanationTask", true);
                result.put("nonTechnicalExplanationTask", true); result.put("realTimeInteraction", false);
                result.put("recordAudio", true); result.put("generateTranscript", true);
                result.put("adaptiveQuestions", true); result.put("speechSignals", true);
            }
            default -> throw new IllegalStateException("Unknown interview process");
        }
        if (!process.key().equals("TECHNICAL_KNOWLEDGE")) {
            result.put("responseMode", process.key().equals("PROBLEM_SOLVING") ? "text" : "speech");
            result.put("followUpEnabled", true); result.put("maxFollowUp", process.key().equals("COMMUNICATION") ? 1 : 2);
        }
        for (var entry : new ArrayList<>(result.entrySet())) {
            Object saved = process.config().get(entry.getKey());
            if (saved != null) {
                if (entry.getValue() instanceof Boolean) result.put(entry.getKey(), bool(process.config(), entry.getKey(), (Boolean) entry.getValue()));
                else if (entry.getValue() instanceof Integer) result.put(entry.getKey(), integer(process.config(), entry.getKey(), (Integer) entry.getValue()));
                else result.put(entry.getKey(), saved.toString());
            }
        }
        return result;
    }

    public static int questionCount(Map<String, Object> config) {
        for (String key : List.of("questionCount", "problemCount", "mainQuestionCount", "scenarioCount", "conversationTopics")) {
            if (config.containsKey(key)) return integer(config, key, 1);
        }
        return 1;
    }
    public static int integer(Map<String, Object> config, String key, int fallback) {
        Object value = config.get(key);
        if (value == null) return fallback;
        try { return new java.math.BigDecimal(value.toString()).intValueExact(); }
        catch (ArithmeticException | NumberFormatException ex) { throw new IllegalStateException("Invalid integer setting: " + key); }
    }
    public static boolean bool(Map<String, Object> config, String key, boolean fallback) {
        Object value = config.get(key);
        if (value == null) return fallback;
        if (value instanceof Boolean flag) return flag;
        if ("true".equals(value.toString()) || "false".equals(value.toString())) return Boolean.parseBoolean(value.toString());
        throw new IllegalStateException("Invalid boolean setting: " + key);
    }
    public static String competency(String key) { return "TECHNICAL_REASONING".equals(key) ? "PROBLEM_SOLVING" : key; }
    public static int followUpLimit(Map<String, Object> config) {
        return bool(config, "followUpEnabled", true) ? integer(config, "followUpDepth", integer(config, "maxFollowUp", 2)) : 0;
    }
}
