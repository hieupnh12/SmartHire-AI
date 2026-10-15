package com.smarthire.tenant.cv.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.tenant.cv.ai.GeminiCvAiClient;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Asks Gemini to pass or fail a CV from the algorithm breakdown. The formula gate still binds. */
@Component
public class GeminiCvScreeningAdvisor implements CvScreeningAdvisor {
    private static final Logger log = LoggerFactory.getLogger(GeminiCvScreeningAdvisor.class);
    static final String INSTRUCTION = """
            Decide whether this candidate passes CV screening for one job.
            The user message is computed screening facts: skill matches, Jaccard, experience, education,
            component scores, weights, score, passThreshold, and formulaPassed.
            Use only these facts. Do not invent skills, scores, or evidence.
            Return JSON only: {"passed": true or false, "verdict": "2-4 sentences in Vietnamese"}.
            passed must be false when formulaPassed is false, when requiredMissing is not empty,
            or when score is below passThreshold.
            When formulaPassed is true, you may still set passed to false if the components show a poor fit.
            Name the components you used. Do not change the numeric scores.
            """;

    private final GeminiCvAiClient ai;
    private final ObjectMapper mapper;

    public GeminiCvScreeningAdvisor(GeminiCvAiClient ai, ObjectMapper mapper) {
        this.ai = ai;
        this.mapper = mapper;
    }

    @Override
    public Optional<Decision> decide(JsonNode breakdown, boolean formulaPassed) {
        if (!ai.configured()) return Optional.empty();
        try {
            JsonNode root = mapper.readTree(ai.completeJson(INSTRUCTION, breakdown.toString()));
            String verdict = root.path("verdict").asText("").trim();
            if (verdict.isBlank()) return Optional.empty();
            boolean passed = formulaPassed && root.path("passed").asBoolean(false);
            return Optional.of(new Decision(passed, verdict));
        } catch (Exception ex) {
            log.warn("CV screening decision skipped: {}", ex.getMessage());
            return Optional.empty();
        }
    }
}
