package com.smarthire.tenant.cv.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Optional;

/** Turns the computed screening breakdown and CV context into a pass/fail decision and recruiter insights. */
public interface CvScreeningAdvisor {
    Optional<Decision> decide(JsonNode breakdown, boolean formulaPassed);

    record Decision(
            boolean passed,
            String verdict,
            String advice,
            String candidateAdvice,
            List<String> strengths,
            List<String> risks,
            List<String> interviewQuestions) {
        public Decision(boolean passed, String verdict) {
            this(passed, verdict, "", "", List.of(), List.of(), List.of());
        }

        public Decision(boolean passed, String verdict, String advice) {
            this(passed, verdict, advice, "", List.of(), List.of(), List.of());
        }

        public Decision(boolean passed, String verdict, String advice, String candidateAdvice) {
            this(passed, verdict, advice, candidateAdvice, List.of(), List.of(), List.of());
        }

        public Decision {
            advice = advice == null ? "" : advice.trim();
            candidateAdvice = candidateAdvice == null ? "" : candidateAdvice.trim();
            strengths = sanitizeList(strengths);
            risks = sanitizeList(risks);
            interviewQuestions = sanitizeList(interviewQuestions);
        }

        private static List<String> sanitizeList(List<String> items) {
            if (items == null || items.isEmpty()) return List.of();
            return items.stream()
                    .filter(s -> s != null && !s.isBlank())
                    .map(String::trim)
                    .toList();
        }
    }
}
