package com.smarthire.tenant.matching.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.enums.JobStatus;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.CvAnalysis;
import com.smarthire.domain.tenant.entity.CvSkill;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobSkill;
import com.smarthire.domain.tenant.entity.Skill;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.CvAnalysisRepository;
import com.smarthire.domain.tenant.repository.CvRepository;
import com.smarthire.domain.tenant.repository.CvSkillRepository;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.JobSkillRepository;
import com.smarthire.domain.tenant.repository.RecommendationRepository;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.job.mapper.JobMapper;
import com.smarthire.tenant.matching.dto.RecommendationModels.CandidateJobRecommendationPage;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class JobRecommendationServiceTest {

    private final CvAccess access = mock(CvAccess.class);
    private final CvRepository cvs = mock(CvRepository.class);
    private final CvSkillRepository cvSkills = mock(CvSkillRepository.class);
    private final CvAnalysisRepository cvAnalyses = mock(CvAnalysisRepository.class);
    private final JobRepository jobs = mock(JobRepository.class);
    private final JobSkillRepository jobSkills = mock(JobSkillRepository.class);
    private final ApplicationRepository applications = mock(ApplicationRepository.class);
    private final RecommendationRepository recommendations = mock(RecommendationRepository.class);
    private final JobRecommendationService service = new JobRecommendationService(
            access,
            cvs,
            cvSkills,
            cvAnalyses,
            jobs,
            jobSkills,
            applications,
            recommendations,
            new SkillScoringService(),
            new JobMapper(),
            new ObjectMapper());

    @Test
    void recommendJobsRanksHigherMatchedOpenJobFirstAndSavesSnapshots() {
        Candidate candidate = new Candidate();
        candidate.setId(5L);
        candidate.setStatus(UserStatus.ACTIVE);
        when(access.candidateActor()).thenReturn(candidate);

        Cv cv = new Cv();
        cv.setId(42L);
        cv.setCandidate(candidate);
        cv.setOriginalFilename("backend-cv.pdf");
        when(cvs.findByCandidate_IdAndApplicationCopyFalseOrderByIdDesc(5L)).thenReturn(List.of(cv));

        CvAnalysis analysis = CvAnalysis.builder().cv(cv).yearsExperience(new BigDecimal("3.0")).build();
        when(cvAnalyses.findByCv_Id(42L)).thenReturn(Optional.of(analysis));
        when(cvSkills.findByCv_Id(42L)).thenReturn(List.of(
                CvSkill.builder().cv(cv).skillName("Java").build(),
                CvSkill.builder().cv(cv).skillName("Spring Boot").build(),
                CvSkill.builder().cv(cv).skillName("Docker").build()));

        Job backendJob = new Job();
        backendJob.setId(10L);
        backendJob.setTitle("Backend Engineer");
        backendJob.setStatus(JobStatus.PUBLISHED);
        backendJob.setPublishedAt(Instant.now());
        backendJob.setMinYearsExperience(new BigDecimal("2.0"));

        Job frontendJob = new Job();
        frontendJob.setId(11L);
        frontendJob.setTitle("Frontend Engineer");
        frontendJob.setStatus(JobStatus.PUBLISHED);
        frontendJob.setPublishedAt(Instant.now());

        when(jobs.publicOpen(any(Instant.class), isNull(), eq(JobStatus.PUBLISHED)))
                .thenReturn(List.of(frontendJob, backendJob));

        when(jobSkills.findByJob_IdOrderByIdAsc(10L)).thenReturn(List.of(
                JobSkill.builder().job(backendJob).skill(Skill.builder().name("Java").build()).required(true).weight(BigDecimal.ONE).build(),
                JobSkill.builder().job(backendJob).skill(Skill.builder().name("Spring Boot").build()).required(true).weight(BigDecimal.ONE).build()));
        when(jobSkills.findByJob_IdOrderByIdAsc(11L)).thenReturn(List.of(
                JobSkill.builder().job(frontendJob).skill(Skill.builder().name("React").build()).required(true).weight(BigDecimal.ONE).build(),
                JobSkill.builder().job(frontendJob).skill(Skill.builder().name("Java").build()).required(false).weight(BigDecimal.ONE).build()));

        CandidateJobRecommendationPage page = service.recommendJobsForCandidate(10);

        assertThat(page.hasAnalyzedCv()).isTrue();
        assertThat(page.analyzedCvId()).isEqualTo(42L);
        assertThat(page.items()).hasSize(2);
        assertThat(page.items().get(0).job().id()).isEqualTo(10L);
        assertThat(page.items().get(0).score()).isEqualByComparingTo("100.00");
        assertThat(page.items().get(0).matchedSkills()).containsExactly("Java", "Spring Boot");
        assertThat(page.items().get(1).job().id()).isEqualTo(11L);
        assertThat(page.items().get(1).missingSkills()).containsExactly("React");

        verify(recommendations).deleteBySubjectTypeAndSubjectIdAndTargetType("CANDIDATE", 5L, "JOB");
        verify(recommendations).saveAll(any());
    }

    @Test
    void recommendJobsReturnsEmptyWhenCandidateHasNoAnalyzedCv() {
        Candidate candidate = new Candidate();
        candidate.setId(5L);
        candidate.setStatus(UserStatus.ACTIVE);
        when(access.candidateActor()).thenReturn(candidate);
        when(cvs.findByCandidate_IdAndApplicationCopyFalseOrderByIdDesc(5L)).thenReturn(List.of());

        CandidateJobRecommendationPage page = service.recommendJobsForCandidate(10);

        assertThat(page.hasAnalyzedCv()).isFalse();
        assertThat(page.items()).isEmpty();
        verifyNoInteractions(recommendations);
    }
}

