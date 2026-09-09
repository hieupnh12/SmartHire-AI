package com.smarthire.tenant.matching.service;

import com.smarthire.domain.tenant.entity.*;
import com.smarthire.tenant.matching.dto.RankingModels.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class SkillScoringService {
    private static final Map<String, String> ALIASES = Map.ofEntries(
            Map.entry("reactjs", "react"), Map.entry("react.js", "react"),
            Map.entry("springboot", "spring boot"), Map.entry("k8s", "kubernetes"),
            Map.entry("my sql", "mysql"), Map.entry("postgres", "postgresql"),
            Map.entry("nodejs", "node.js"), Map.entry("restful api", "rest api"));
    public String normalize(String value) {
        String key = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFKC)
                .trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
        return ALIASES.getOrDefault(key, key);
    }
    public String category(Skill skill) {
        if (skill.getCategory() != null && !skill.getCategory().isBlank()) {
            String category = normalize(skill.getCategory());
            return switch (category) {
                case "be", "back-end", "back end" -> "backend";
                case "fe", "front-end", "front end" -> "frontend";
                case "db", "databases" -> "database";
                default -> category.replaceAll("[^a-z0-9_-]+", "-").replaceAll("^-+|-+$", "").isEmpty()
                        ? "other" : category.replaceAll("[^a-z0-9_-]+", "-").replaceAll("^-+|-+$", "");
            };
        }
        return switch (normalize(skill.getName())) {
            case "java", "spring boot", "rest api", "node.js" -> "backend";
            case "react", "vue", "angular", "javascript", "typescript", "css", "html" -> "frontend";
            case "mysql", "postgresql", "redis", "mongodb", "sql" -> "database";
            case "docker", "kubernetes", "terraform", "jenkins" -> "devops";
            default -> "other";
        };
    }
    public BigDecimal similarity(String required, String candidate) {
        String a = normalize(required), b = normalize(candidate);
        if (!a.isEmpty() && a.equals(b)) return BigDecimal.ONE;
        // Explicit transferable-skill relation, never inferred from category membership.
        if (Set.of("mysql", "postgresql").contains(a) && Set.of("mysql", "postgresql").contains(b))
            return new BigDecimal("0.50");
        return BigDecimal.ZERO;
    }
    public List<GroupScore> score(List<JobSkill> requirements, List<CvSkill> skills, Map<String, Integer> weights) {
        Map<String, CvSkill> candidates = new TreeMap<>();
        for (CvSkill skill : skills) candidates.putIfAbsent(normalize(skill.getSkill() == null
                ? skill.getSkillName() : skill.getSkill().getName()), skill);
        List<GroupScore> result = new ArrayList<>();
        for (String group : new TreeSet<>(weights.keySet())) {
            Map<String, JobSkill> unique = new TreeMap<>();
            requirements.stream().filter(r -> category(r.getSkill()).equals(group)).forEach(r ->
                    unique.merge(normalize(r.getSkill().getName()), r, (a, b) -> a.isRequired() ? a : b));
            List<SkillMatch> matches = new ArrayList<>();
            BigDecimal sum = BigDecimal.ZERO, totalWeight = BigDecimal.ZERO;
            int exact = 0;
            for (var entry : unique.entrySet()) {
                String best = null;
                BigDecimal similarity = BigDecimal.ZERO;
                for (String candidate : candidates.keySet()) {
                    BigDecimal value = similarity(entry.getKey(), candidate);
                    if (value.compareTo(similarity) > 0) { similarity = value; best = candidate; }
                }
                JobSkill requirement = entry.getValue();
                BigDecimal weight = requirement.getWeight() == null ? BigDecimal.ONE : requirement.getWeight();
                if (weight.signum() <= 0) throw new IllegalArgumentException("Job skill weights must be positive");
                totalWeight = totalWeight.add(weight);
                sum = sum.add(similarity.multiply(weight));
                if (similarity.compareTo(BigDecimal.ONE) == 0) exact++;
                matches.add(new SkillMatch(entry.getKey(), best, similarity, requirement.isRequired(),
                        best == null ? null : candidates.get(best).getSkillName()));
            }
            result.add(new GroupScore(group, weights.get(group), totalWeight.signum() == 0 ? null :
                    sum.multiply(BigDecimal.valueOf(100)).divide(totalWeight, 2, RoundingMode.HALF_UP),
                    unique.isEmpty() ? null : BigDecimal.valueOf(exact * 100L)
                            .divide(BigDecimal.valueOf(unique.size()), 2, RoundingMode.HALF_UP), matches));
        }
        return result;
    }
    public BigDecimal overall(List<GroupScore> groups) {
        if (groups.stream().anyMatch(g -> g.weight() > 0 && g.score() == null)) return null;
        return RankingCalculator.round(groups.stream().filter(g -> g.weight() > 0)
                .map(g -> g.score().multiply(BigDecimal.valueOf(g.weight())).movePointLeft(2))
                .reduce(BigDecimal.ZERO, BigDecimal::add));
    }
}
