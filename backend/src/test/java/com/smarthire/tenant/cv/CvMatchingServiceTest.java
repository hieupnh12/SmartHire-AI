package com.smarthire.tenant.cv;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.CvAnalysis;
import com.smarthire.domain.tenant.entity.CvExtraction;
import com.smarthire.domain.tenant.entity.CvSkill;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobSkill;
import com.smarthire.domain.tenant.entity.MatchScore;
import com.smarthire.domain.tenant.entity.Skill;
import com.smarthire.domain.tenant.repository.CvAnalysisRepository;
import com.smarthire.domain.tenant.repository.CvExtractionRepository;
import com.smarthire.domain.tenant.repository.CvSkillRepository;
import com.smarthire.domain.tenant.repository.JobSkillRepository;
import com.smarthire.domain.tenant.repository.MatchScoreRepository;
import com.smarthire.domain.tenant.repository.SkillRepository;
import com.smarthire.tenant.cv.ai.HeuristicCvAiClient;
import com.smarthire.tenant.cv.service.CvMatchingService;
import com.smarthire.tenant.cv.service.CvSkillAnalysisService;
import com.smarthire.tenant.matching.service.SkillScoringService;
import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CvMatchingServiceTest {
    @Mock SkillRepository skillRepository;
    @Mock CvSkillRepository cvSkillRepository;
    @Mock CvAnalysisRepository analysisRepository;
    @Mock JobSkillRepository jobSkillRepository;
    @Mock CvExtractionRepository extractionRepository;
    @Mock MatchScoreRepository matchScoreRepository;
    @Mock RedisService redis;

    @Test
    void jaccardIsIntersectionOverUnion() {
        Set<String> job = new LinkedHashSet<>(List.of("java", "spring boot", "postgresql", "docker"));
        Set<String> cv = new LinkedHashSet<>(List.of("java", "spring boot", "postgresql", "react"));
        assertThat(CvMatchingService.jaccard(job, cv)).isEqualByComparingTo("0.6000");
        assertThat(CvMatchingService.jaccard(Set.of(), Set.of())).isEqualByComparingTo("0");
    }

    @Test
    void mapsTaxonomyAndScreensAgainstJobSkills() {
        var mapper = new ObjectMapper();
        var scoring = new SkillScoringService();
        var analysis = new CvSkillAnalysisService(
                skillRepository, cvSkillRepository, analysisRepository, scoring, mapper, new HeuristicCvAiClient(mapper));
        when(skillRepository.findByNameIgnoreCase("react")).thenReturn(Optional.empty());
        when(skillRepository.findByNameIgnoreCase("java")).thenReturn(Optional.empty());
        when(skillRepository.save(any(Skill.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(cvSkillRepository.findByCv_Id(1L)).thenReturn(List.of());
        when(analysisRepository.findByCv_Id(1L)).thenReturn(Optional.empty());
        when(analysisRepository.save(any(CvAnalysis.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Cv cv = new Cv();
        cv.setId(1L);
        Job job = new Job();
        job.setId(9L);
        job.setTitle("Frontend");
        cv.setJob(job);
        String json = """
                {"skills":[{"name":"ReactJS","confidence":0.9}],"experience":[{"startDate":"2024-01","endDate":"2025-06","skills":["Java"],"evidence":"Java work"}],"education":[]}
                """;
        analysis.analyze(cv, json);

        ArgumentCaptor<Skill> skillCaptor = ArgumentCaptor.forClass(Skill.class);
        verify(skillRepository, atLeastOnce()).save(skillCaptor.capture());
        assertThat(skillCaptor.getAllValues().stream().map(Skill::getName)).contains("react", "java");

        Skill required = new Skill();
        required.setName("React");
        required.setCategory("frontend");
        JobSkill jobSkill = new JobSkill();
        jobSkill.setSkill(required);
        jobSkill.setRequired(true);
        jobSkill.setWeight(BigDecimal.ONE);
        CvSkill extracted = new CvSkill();
        extracted.setSkillName("ReactJS");
        extracted.setSkill(skillCaptor.getAllValues().stream().filter(s -> "react".equals(s.getName())).findFirst().orElseThrow());

        when(jobSkillRepository.findByJob_IdOrderByIdAsc(9L)).thenReturn(List.of(jobSkill));
        when(cvSkillRepository.findByCv_Id(1L)).thenReturn(List.of(extracted));
        when(extractionRepository.findByCv_Id(1L)).thenReturn(Optional.of(extraction(cv, json)));
        when(matchScoreRepository.findByJob_IdAndCv_Id(9L, 1L)).thenReturn(Optional.empty());
        when(matchScoreRepository.save(any(MatchScore.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MatchScore score = matching(mapper, scoring).score(cv);
        assertThat(score.getModelVersion()).isEqualTo(CvMatchingService.HEURISTIC_SCREEN);
        assertThat(score.getScore()).isEqualByComparingTo("100.00");
        assertThat(score.getBreakdownJson()).contains("verdict").contains("React")
                .contains("\"passed\":true").contains("\"jaccardSimilarity\":1")
                .contains("TAXONOMY").doesNotContain("\"skills\":35");
    }

    @Test
    void consultantCvAgainstJavaJobScoresZeroCoverage() {
        var mapper = new ObjectMapper();
        var scoring = new SkillScoringService();
        Job job = new Job();
        job.setId(4L);
        job.setTitle("AAA");
        Cv cv = new Cv();
        cv.setId(2L);
        cv.setJob(job);

        when(jobSkillRepository.findByJob_IdOrderByIdAsc(4L)).thenReturn(List.of(jobSkill("Java", "backend", true)));
        Skill extractedSkill = new Skill();
        extractedSkill.setName("strategic planning");
        CvSkill cvSkill = new CvSkill();
        cvSkill.setSkillName("Strategic Planning");
        cvSkill.setSkill(extractedSkill);
        when(cvSkillRepository.findByCv_Id(2L)).thenReturn(List.of(cvSkill));
        when(extractionRepository.findByCv_Id(2L)).thenReturn(Optional.of(extraction(cv,
                "{\"skills\":[{\"name\":\"Strategic Planning\"}],\"education\":[{\"degree\":\"Master\"}]}")));
        when(analysisRepository.findByCv_Id(2L)).thenReturn(Optional.empty());
        when(matchScoreRepository.findByJob_IdAndCv_Id(4L, 2L)).thenReturn(Optional.empty());
        when(matchScoreRepository.save(any(MatchScore.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MatchScore score = matching(mapper, scoring).score(cv);
        assertThat(score.getScore()).isEqualByComparingTo("0.00");
        assertThat(score.getBreakdownJson()).contains("khớp 0/1").contains("\"passed\":false")
                .contains("MISSING").doesNotContain("\"skills\":35");
    }

    @Test
    void ignoresGeminiOverallScoreAndUsesHybridFormula() {
        var mapper = new ObjectMapper();
        var scoring = new SkillScoringService();
        Job job = new Job();
        job.setId(4L);
        job.setTitle("AAA");
        Cv cv = new Cv();
        cv.setId(3L);
        cv.setJob(job);
        when(jobSkillRepository.findByJob_IdOrderByIdAsc(4L)).thenReturn(List.of(jobSkill("Java", "backend", true)));
        when(cvSkillRepository.findByCv_Id(3L)).thenReturn(List.of());
        CvExtraction extraction = extraction(cv, """
                {"skills":[],"screening":{"score":18,"verdict":"Consultant CV does not meet Java requirements."}}
                """);
        extraction.setModelVersion("gemini:gemini-2.0-flash");
        when(extractionRepository.findByCv_Id(3L)).thenReturn(Optional.of(extraction));
        when(analysisRepository.findByCv_Id(3L)).thenReturn(Optional.empty());
        when(matchScoreRepository.findByJob_IdAndCv_Id(4L, 3L)).thenReturn(Optional.empty());
        when(matchScoreRepository.save(any(MatchScore.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MatchScore score = matching(mapper, scoring).score(cv);
        assertThat(score.getScore()).isNotEqualByComparingTo("18.00");
        assertThat(score.getScore()).isEqualByComparingTo("0.00");
        assertThat(score.getModelVersion()).isEqualTo(CvMatchingService.HYBRID_SCREEN);
        assertThat(score.getBreakdownJson()).contains("does not meet Java").contains("\"source\":\"hybrid\"");
    }

    @Test
    void semanticMatchCountsWhenTaxonomyMisses() {
        var mapper = new ObjectMapper();
        var scoring = new SkillScoringService();
        Job job = new Job();
        job.setId(5L);
        job.setTitle("Backend");
        Cv cv = new Cv();
        cv.setId(8L);
        cv.setJob(job);
        when(jobSkillRepository.findByJob_IdOrderByIdAsc(5L)).thenReturn(List.of(jobSkill("Spring Boot", "backend", true)));
        when(cvSkillRepository.findByCv_Id(8L)).thenReturn(List.of());
        CvExtraction extraction = extraction(cv, """
                {"skills":[],"screening":{"matched":[{"requirement":"Spring Boot","status":"MATCH",
                "evidence":"Developed REST APIs using Spring Boot for 2 years."}]}}
                """);
        extraction.setModelVersion("gemini:gemini-2.0-flash");
        when(extractionRepository.findByCv_Id(8L)).thenReturn(Optional.of(extraction));
        when(analysisRepository.findByCv_Id(8L)).thenReturn(Optional.empty());
        when(matchScoreRepository.findByJob_IdAndCv_Id(5L, 8L)).thenReturn(Optional.empty());
        when(matchScoreRepository.save(any(MatchScore.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MatchScore score = matching(mapper, scoring).score(cv);
        JsonNode breakdown = read(mapper, score.getBreakdownJson());
        assertThat(breakdown.path("matched").get(0).path("status").asText()).isEqualTo("MATCH");
        assertThat(breakdown.path("matched").get(0).path("matchType").asText()).isEqualTo("SEMANTIC");
        assertThat(breakdown.path("matched").get(0).path("evidence").asText()).contains("Spring Boot");
        assertThat(breakdown.path("jaccardSimilarity").decimalValue()).isEqualByComparingTo("0");
        assertThat(score.getScore()).isEqualByComparingTo("85.00");
        assertThat(breakdown.path("passed").asBoolean()).isTrue();
    }

    @Test
    void hybridScoreUsesJaccardAndKeepsRequiredMissingFromPassing() throws Exception {
        var mapper = new ObjectMapper();
        var scoring = new SkillScoringService();
        Job job = new Job();
        job.setId(6L);
        job.setTitle("Backend");
        Cv cv = new Cv();
        cv.setId(9L);
        cv.setJob(job);
        when(jobSkillRepository.findByJob_IdOrderByIdAsc(6L)).thenReturn(List.of(
                jobSkill("Java", "backend", true),
                jobSkill("Spring Boot", "backend", true),
                jobSkill("PostgreSQL", "database", true),
                jobSkill("Docker", "devops", true)));
        when(cvSkillRepository.findByCv_Id(9L)).thenReturn(List.of(
                cvSkill("Java"), cvSkill("Spring Boot"), cvSkill("PostgreSQL"), cvSkill("React")));
        when(extractionRepository.findByCv_Id(9L)).thenReturn(Optional.of(extraction(cv, "{\"skills\":[]}")));
        when(analysisRepository.findByCv_Id(9L)).thenReturn(Optional.empty());
        when(matchScoreRepository.findByJob_IdAndCv_Id(6L, 9L)).thenReturn(Optional.empty());
        when(matchScoreRepository.save(any(MatchScore.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MatchScore score = matching(mapper, scoring).score(cv);
        JsonNode breakdown = mapper.readTree(score.getBreakdownJson());
        assertThat(breakdown.path("jaccardSimilarity").decimalValue()).isEqualByComparingTo("0.6000");
        assertThat(breakdown.path("requiredMissing").toString()).contains("Docker");
        assertThat(breakdown.path("passed").asBoolean()).isFalse();
        assertThat(score.getScore()).isEqualByComparingTo("72.75");
    }

    @Test
    void experienceComponentUsesJobMinimumYears() {
        var mapper = new ObjectMapper();
        var scoring = new SkillScoringService();
        Job job = new Job();
        job.setId(7L);
        job.setTitle("Backend");
        job.setMinYearsExperience(new BigDecimal("2.0"));
        Cv cv = new Cv();
        cv.setId(10L);
        cv.setJob(job);
        CvAnalysis analysis = new CvAnalysis();
        analysis.setYearsExperience(new BigDecimal("3.0"));
        when(jobSkillRepository.findByJob_IdOrderByIdAsc(7L)).thenReturn(List.of(jobSkill("Java", "backend", true)));
        when(cvSkillRepository.findByCv_Id(10L)).thenReturn(List.of(cvSkill("Java")));
        when(extractionRepository.findByCv_Id(10L)).thenReturn(Optional.of(extraction(cv, "{\"skills\":[{\"name\":\"Java\"}]}")));
        when(analysisRepository.findByCv_Id(10L)).thenReturn(Optional.of(analysis));
        when(matchScoreRepository.findByJob_IdAndCv_Id(7L, 10L)).thenReturn(Optional.empty());
        when(matchScoreRepository.save(any(MatchScore.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MatchScore score = matching(mapper, scoring).score(cv);
        JsonNode breakdown = read(mapper, score.getBreakdownJson());
        assertThat(breakdown.path("experienceAnalysis").path("match").asBoolean()).isTrue();
        assertThat(breakdown.path("components").path("experience").decimalValue()).isEqualByComparingTo("100.00");
        assertThat(score.getScore()).isEqualByComparingTo("100.00");
    }

    private CvMatchingService matching(ObjectMapper mapper, SkillScoringService scoring) {
        return new CvMatchingService(
                jobSkillRepository, cvSkillRepository, extractionRepository, analysisRepository, matchScoreRepository,
                scoring, mapper, redis, 1800);
    }

    private static JobSkill jobSkill(String name, String category, boolean required) {
        Skill skill = new Skill();
        skill.setName(name);
        skill.setCategory(category);
        JobSkill row = new JobSkill();
        row.setSkill(skill);
        row.setRequired(required);
        row.setWeight(BigDecimal.ONE);
        return row;
    }

    private static CvSkill cvSkill(String name) {
        Skill skill = new Skill();
        skill.setName(name);
        CvSkill row = new CvSkill();
        row.setSkillName(name);
        row.setSkill(skill);
        return row;
    }

    private static CvExtraction extraction(Cv cv, String json) {
        CvExtraction extraction = new CvExtraction();
        extraction.setCv(cv);
        extraction.setExtractionJson(json);
        return extraction;
    }

    private static JsonNode read(ObjectMapper mapper, String json) {
        try {
            return mapper.readTree(json);
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
