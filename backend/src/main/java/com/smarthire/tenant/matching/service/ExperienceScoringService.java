package com.smarthire.tenant.matching.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class ExperienceScoringService {
    private final ObjectMapper mapper;
    private final SkillScoringService skills;
    public ExperienceScoringService(ObjectMapper mapper, SkillScoringService skills) {
        this.mapper = mapper; this.skills = skills;
    }
    public record Result(Integer months, BigDecimal score, List<String> evidence, String state) {}
    public Result score(String json, Set<String> requiredSkills, int requiredMonths, YearMonth now) {
        if (requiredMonths == 0) return new Result(null, null, List.of(), "DISABLED");
        if (json == null) return missing("MISSING");
        try {
            JsonNode entries = mapper.readTree(json).get("experience");
            if (entries == null || !entries.isArray()) return missing("NEEDS_REVIEW");
            Set<YearMonth> months = new HashSet<>();
            List<String> evidence = new ArrayList<>();
            for (JsonNode entry : entries) {
                if (!entry.path("skills").isArray()) return missing("NEEDS_REVIEW");
                boolean related = false;
                for (JsonNode skill : entry.path("skills"))
                    if (requiredSkills.contains(skills.normalize(skill.asText()))) related = true;
                if (!related) continue;
                YearMonth start = YearMonth.parse(entry.path("startDate").asText());
                YearMonth end = entry.path("current").asBoolean(false) ? now : YearMonth.parse(entry.path("endDate").asText());
                if (start.isAfter(end) || end.isAfter(now) || ChronoUnit.MONTHS.between(start, end) > 1200)
                    return missing("NEEDS_REVIEW");
                String quote = entry.path("evidence").asText();
                if (quote.isBlank()) return missing("NEEDS_REVIEW");
                evidence.add(quote);
                for (YearMonth month = start; !month.isAfter(end); month = month.plusMonths(1)) months.add(month);
            }
            return new Result(months.size(), BigDecimal.valueOf(months.size() * 100L)
                    .divide(BigDecimal.valueOf(requiredMonths), 2, RoundingMode.HALF_UP).min(BigDecimal.valueOf(100)),
                    evidence, "READY");
        } catch (Exception e) {
            return missing("NEEDS_REVIEW");
        }
    }
    private Result missing(String state) { return new Result(null, null, List.of(), state); }
}
