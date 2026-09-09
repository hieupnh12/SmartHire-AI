package com.smarthire.tenant.matching;

import com.smarthire.domain.tenant.entity.*;
import com.smarthire.tenant.matching.service.SkillScoringService;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class SkillScoringServiceTest {
    private final SkillScoringService service = new SkillScoringService();
    @Test void normalizesAliasesWithoutConfusingLanguages() {
        assertThat(service.normalize(" ReactJS ")).isEqualTo("react");
        assertThat(service.normalize("SpringBoot")).isEqualTo("spring boot");
        assertThat(service.normalize("K8s")).isEqualTo("kubernetes");
        assertThat(service.similarity("Java", "JavaScript")).isZero();
        assertThat(service.similarity("Docker", "Kubernetes")).isZero();
        Skill categorized = new Skill(); categorized.setCategory("Cloud.Platform");
        assertThat(service.category(categorized)).isEqualTo("cloud-platform");
    }
    @Test void separatesRelatedSimilarityFromExactCoverage() {
        var result = service.score(List.of(requirement("PostgreSQL", "database")), List.of(cv("My SQL")), Map.of("database", 100)).getFirst();
        assertThat(result.score()).isEqualByComparingTo("50"); assertThat(result.coverage()).isZero();
        assertThat(result.matches().getFirst().required()).isTrue();
    }
    @Test void deduplicatesAliasesAndAppliesTwoGroupWeights() {
        var groups = service.score(List.of(requirement("React", "frontend"), requirement("React.js", "frontend"),
                        requirement("Docker", "devops"), requirement("Kubernetes", "devops")),
                List.of(cv("ReactJS"), cv("React.js"), cv("Docker")), Map.of("frontend", 80, "devops", 20));
        assertThat(service.overall(groups)).isEqualByComparingTo("90");
        assertThat(groups.stream().filter(g -> g.category().equals("frontend")).findFirst().orElseThrow().matches()).hasSize(1);
    }
    @Test void missingRequiredGroupDoesNotBecomePerfectMatch() {
        var groups = service.score(List.of(), List.of(cv("Java")), Map.of("backend", 100));
        assertThat(service.overall(groups)).isNull();
    }
    private JobSkill requirement(String name, String category) {
        Skill skill = new Skill(); skill.setName(name); skill.setCategory(category);
        JobSkill result = new JobSkill(); result.setSkill(skill); result.setWeight(BigDecimal.ONE); return result;
    }
    private CvSkill cv(String name) { CvSkill result = new CvSkill(); result.setSkillName(name); return result; }
}
