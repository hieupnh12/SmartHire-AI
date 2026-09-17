package com.smarthire.tenant.cv;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.cv.ai.HeuristicCvAiClient;
import com.smarthire.tenant.cv.service.CvMatchingService;
import com.smarthire.tenant.cv.service.CvSkillAnalysisService;
import com.smarthire.tenant.matching.service.SkillScoringService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

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
        assertThat(score.getBreakdownJson()).contains("verdict").contains("React");
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

        when(jobSkillRepository.findByJob_IdOrderByIdAsc(4L)).thenReturn(List.of(jobSkill("Java", "backend")));
        Skill extractedSkill = new Skill();
        extractedSkill.setName("strategic planning");
        CvSkill cvSkill = new CvSkill();
        cvSkill.setSkillName("Strategic Planning");
        cvSkill.setSkill(extractedSkill);
        when(cvSkillRepository.findByCv_Id(2L)).thenReturn(List.of(cvSkill));
        when(extractionRepository.findByCv_Id(2L)).thenReturn(Optional.of(extraction(cv,
                "{\"skills\":[{\"name\":\"Strategic Planning\"}],\"education\":[{\"degree\":\"Master\"}]}")));
        when(matchScoreRepository.findByJob_IdAndCv_Id(4L, 2L)).thenReturn(Optional.empty());
        when(matchScoreRepository.save(any(MatchScore.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MatchScore score = matching(mapper, scoring).score(cv);
        assertThat(score.getScore()).isEqualByComparingTo("0.00");
        assertThat(score.getBreakdownJson()).contains("khớp 0/1").doesNotContain("\"skills\":35");
    }

    @Test
    void usesGeminiScreeningScoreWhenPresent() {
        var mapper = new ObjectMapper();
        var scoring = new SkillScoringService();
        Job job = new Job();
        job.setId(4L);
        job.setTitle("AAA");
        Cv cv = new Cv();
        cv.setId(3L);
        cv.setJob(job);
        when(jobSkillRepository.findByJob_IdOrderByIdAsc(4L)).thenReturn(List.of(jobSkill("Java", "backend")));
        when(cvSkillRepository.findByCv_Id(3L)).thenReturn(List.of());
        CvExtraction extraction = extraction(cv, """
                {"skills":[],"screening":{"score":18,"verdict":"Consultant CV does not meet Java requirements."}}
                """);
        extraction.setModelVersion("gemini:gemini-2.0-flash");
        when(extractionRepository.findByCv_Id(3L)).thenReturn(Optional.of(extraction));
        when(matchScoreRepository.findByJob_IdAndCv_Id(4L, 3L)).thenReturn(Optional.empty());
        when(matchScoreRepository.save(any(MatchScore.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MatchScore score = matching(mapper, scoring).score(cv);
        assertThat(score.getScore()).isEqualByComparingTo("18.00");
        assertThat(score.getModelVersion()).isEqualTo("gemini:gemini-2.0-flash");
        assertThat(score.getBreakdownJson()).contains("does not meet Java");
    }

    private CvMatchingService matching(ObjectMapper mapper, SkillScoringService scoring) {
        return new CvMatchingService(
                jobSkillRepository, cvSkillRepository, extractionRepository, matchScoreRepository,
                scoring, mapper, redis, 1800);
    }

    private static JobSkill jobSkill(String name, String category) {
        Skill skill = new Skill();
        skill.setName(name);
        skill.setCategory(category);
        JobSkill row = new JobSkill();
        row.setSkill(skill);
        row.setRequired(true);
        row.setWeight(BigDecimal.ONE);
        return row;
    }

    private static CvExtraction extraction(Cv cv, String json) {
        CvExtraction extraction = new CvExtraction();
        extraction.setCv(cv);
        extraction.setExtractionJson(json);
        return extraction;
    }
}
