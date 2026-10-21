package com.smarthire.tenant.cv.mapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.enums.CvStatus;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.tenant.cv.dto.CvModels.GithubAnalysisView;
import com.smarthire.tenant.matching.service.SkillScoringService;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class CvMapperGithubTest {
    @Test
    void candidatesDoNotReceiveGithubEvidence() {
        Candidate candidate = new Candidate();
        candidate.setId(2L);
        candidate.setFullName("An");
        Cv cv = new Cv();
        cv.setId(9L);
        cv.setCandidate(candidate);
        cv.setOriginalFilename("a.pdf");
        cv.setFileUrl("https://files/a.pdf");
        cv.setStatus(CvStatus.ANALYZED);
        GithubAnalysisView view = new GithubAnalysisView("COMPLETED", new BigDecimal("80"), null, null, null, false, 1, 1, null);
        CvMapper mapper = new CvMapper(new ObjectMapper(), mock(SkillScoringService.class));

        assertThat(mapper.detail(cv, null, List.of(), null, null, view, false).githubAnalysis()).isNull();
        assertThat(mapper.detail(cv, null, List.of(), null, null, view, true).githubAnalysis()).isSameAs(view);
    }
}
