package com.smarthire.tenant.matching;

import com.smarthire.tenant.matching.dto.RankingModels.*;
import com.smarthire.tenant.matching.service.RankingCalculator;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class RankingCalculatorTest {
    private final RankingCalculator calculator = new RankingCalculator();
    private final Weights defaults = new Weights(35, 15, 30, 20);
    @Test void computesApprovedExample() {
        var result = calculator.calculate(defaults, Map.of("skills", bd(79), "experience", bd(80), "assessment", bd(85), "interview", bd(81)), Map.of());
        assertThat(result.score()).isEqualByComparingTo("81.35");
        assertThat(result.complete()).isTrue();
        assertThat(result.availableWeight()).isEqualTo(100);
    }
    @Test void normalizesOnlyAvailableWeights() {
        var result = calculator.calculate(defaults, Map.of("skills", bd(79), "experience", bd(80)), Map.of());
        assertThat(result.score()).isEqualByComparingTo("79.30");
        assertThat(result.availableWeight()).isEqualTo(50);
        assertThat(result.cohort()).isEqualTo("skills+experience");
        assertThat(result.complete()).isFalse();
    }
    @Test void distinguishesZeroFromMissingAndIgnoresDisabledComponents() {
        var result = calculator.calculate(new Weights(100, 0, 0, 0), Map.of("skills", BigDecimal.ZERO), Map.of());
        assertThat(result.complete()).isTrue();
        assertThat(result.score()).isZero();
        assertThat(result.requiredComponents()).isEqualTo(1);
        assertThat(calculator.calculate(defaults, Map.of(), Map.of()).score()).isNull();
    }
    @Test void rejectsInvalidWeightsAndScores() {
        assertThatThrownBy(() -> calculator.validate(new Config(new Weights(35, 15, 30, 30), Map.of("backend", 100), 24, 0))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> calculator.validate(new Config(defaults, Map.of("backend", 90), 24, 0))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> calculator.validate(new Config(defaults, Map.of("backend", 100), 0, 0))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> calculator.calculate(defaults, Map.of("skills", bd(101)), Map.of())).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void ranksWithinCohortWithSharedTiesAndExcludesTerminalApplications() {
        var results = calculator.rank(List.of(row(4, 70, "skills", "NEW"), row(2, 80, "skills", "NEW"),
                row(1, 80, "skills", "NEW"), row(3, 95, "skills+experience", "NEW"), row(5, 99, "skills", "REJECTED")));
        Map<Long, Integer> ranks = new HashMap<>(); results.forEach(r -> ranks.put(r.applicationId(), r.rank()));
        assertThat(ranks.get(1L)).isEqualTo(1); assertThat(ranks.get(2L)).isEqualTo(1);
        assertThat(ranks.get(3L)).isEqualTo(1); assertThat(ranks.get(4L)).isEqualTo(3); assertThat(ranks.get(5L)).isNull();
        assertThat(results.stream().filter(r -> r.result().score().intValue() == 80).map(Row::applicationId)).containsExactly(1L, 2L);
    }
    private Row row(long id, int score, String cohort, String status) {
        return new Row(id, "Candidate", status, null, new Calculation(bd(score), 35, 1, 4, cohort, false, List.of()),
                List.of(), List.of(), null, List.of(), List.of(), new Selection(null, null, null), null, List.of(), null);
    }
    private BigDecimal bd(int value) { return BigDecimal.valueOf(value); }
}
