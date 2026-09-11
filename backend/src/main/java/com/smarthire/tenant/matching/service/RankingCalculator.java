package com.smarthire.tenant.matching.service;

import com.smarthire.tenant.matching.dto.RankingModels.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class RankingCalculator {
    public static final String VERSION = "rank-v1";
    public static final List<String> KEYS = List.of("skills", "experience", "assessment", "interview");

    public void validate(Config config) {
        Weights w = config.weights();
        int[] weights = {w.skills(), w.experience(), w.assessment(), w.interview()};
        if (Arrays.stream(weights).anyMatch(v -> v < 0 || v > 100) || Arrays.stream(weights).sum() != 100)
            throw new IllegalArgumentException("Component weights must total 100");
        if (config.groups().isEmpty() || config.groups().values().stream().anyMatch(v -> v == null || v < 0 || v > 100)
                || config.groups().values().stream().mapToInt(Integer::intValue).sum() != 100)
            throw new IllegalArgumentException("Skill group weights must total 100");
        if (config.requiredExperienceMonths() < 0 || config.requiredExperienceMonths() > 1200
                || (w.experience() > 0 && config.requiredExperienceMonths() == 0))
            throw new IllegalArgumentException("Set required experience months or set experience weight to zero");
    }

    public Calculation calculate(Weights w, Map<String, BigDecimal> scores, Map<String, String> states) {
        int[] weights = {w.skills(), w.experience(), w.assessment(), w.interview()};
        List<Component> parts = new ArrayList<>();
        List<String> available = new ArrayList<>();
        BigDecimal sum = BigDecimal.ZERO;
        int availableWeight = 0;
        int required = 0;
        for (int n = 0; n < KEYS.size(); n++) {
            String key = KEYS.get(n);
            BigDecimal score = scores.get(key);
            if (score != null && (score.signum() < 0 || score.compareTo(BigDecimal.valueOf(100)) > 0))
                throw new IllegalArgumentException("Scores must be between 0 and 100");
            int weight = weights[n];
            BigDecimal contribution = score == null ? null : score.multiply(BigDecimal.valueOf(weight)).movePointLeft(2);
            if (weight > 0) {
                required++;
                if (score != null) {
                    available.add(key);
                    availableWeight += weight;
                    sum = sum.add(contribution);
                }
            }
            parts.add(new Component(key, score, weight, contribution == null ? null : round(contribution),
                    weight == 0 ? "DISABLED" : score != null ? "READY" : states.getOrDefault(key, "MISSING")));
        }
        return new Calculation(availableWeight == 0 ? null : sum.multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(availableWeight), 2, RoundingMode.HALF_UP), availableWeight,
                available.size(), required, String.join("+", available), available.size() == required, parts);
    }

    public List<Row> rank(List<Row> rows) {
        List<Row> sorted = rows.stream().sorted(Comparator
                .comparing((Row r) -> r.result().score(), Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparingLong(Row::applicationId)).toList();
        Map<String, Integer> counts = new HashMap<>();
        Map<String, Integer> ranks = new HashMap<>();
        Map<String, BigDecimal> previous = new HashMap<>();
        List<Row> result = new ArrayList<>();
        for (Row row : sorted) {
            if (row.result().score() == null || Set.of("REJECTED", "WITHDRAWN", "HIRED").contains(row.status())) {
                result.add(row.withRank(null));
                continue;
            }
            String cohort = row.result().cohort();
            int count = counts.merge(cohort, 1, Integer::sum);
            if (!previous.containsKey(cohort) || previous.get(cohort).compareTo(row.result().score()) != 0)
                ranks.put(cohort, count);
            previous.put(cohort, row.result().score());
            result.add(row.withRank(ranks.get(cohort)));
        }
        return result;
    }

    public static BigDecimal round(BigDecimal value) { return value.setScale(2, RoundingMode.HALF_UP); }
}
