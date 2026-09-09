package com.smarthire.tenant.matching;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.tenant.matching.service.*;
import java.time.YearMonth;
import java.util.Set;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class ExperienceScoringServiceTest {
    private final ExperienceScoringService service = new ExperienceScoringService(new ObjectMapper(), new SkillScoringService());
    private final YearMonth now = YearMonth.of(2026, 9);
    @Test void mergesOverlappingRelevantMonthsAndExcludesUnrelatedWork() {
        var result = service.score("""
                {"experience":[
                  {"startDate":"2024-01","endDate":"2024-12","skills":["Java"],"evidence":"Java developer"},
                  {"startDate":"2024-07","endDate":"2025-06","skills":["Java"],"evidence":"Java project"},
                  {"startDate":"2020-01","endDate":"2023-12","skills":["Sales"],"evidence":"Sales role"}]}
                """, Set.of("java"), 24, now);
        assertThat(result.months()).isEqualTo(18); assertThat(result.score()).isEqualByComparingTo("75");
        assertThat(result.evidence()).hasSize(2);
    }
    @Test void supportsCurrentWorkAndCapsScore() {
        var result = service.score("""
                {"experience":[{"startDate":"2024-01","current":true,"skills":["Java"],"evidence":"Java developer"}]}
                """, Set.of("java"), 12, now);
        assertThat(result.score()).isEqualByComparingTo("100"); assertThat(result.months()).isEqualTo(33);
    }
    @Test void distinguishesEmptyExperienceFromMissingOrInvalidData() {
        assertThat(service.score("{\"experience\":[]}", Set.of("java"), 24, now).score()).isZero();
        assertThat(service.score(null, Set.of("java"), 24, now).score()).isNull();
        assertThat(service.score("{}", Set.of("java"), 24, now).state()).isEqualTo("NEEDS_REVIEW");
        assertThat(service.score("""
                {"experience":[{"startDate":"2030-01","endDate":"2031-01","skills":["Java"],"evidence":"future"}]}
                """, Set.of("java"), 24, now).score()).isNull();
    }
}
