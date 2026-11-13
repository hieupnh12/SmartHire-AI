package com.smarthire.tenant.analytics;

import static com.smarthire.tenant.analytics.recruiter.dto.RecruiterAnalyticsModels.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.JobStatus;
import com.smarthire.domain.enums.ScreeningMode;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobSkill;
import com.smarthire.domain.tenant.entity.Skill;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.JobSkillRepository;
import com.smarthire.domain.tenant.repository.RecruiterAnalyticsRepository;
import com.smarthire.tenant.analytics.recruiter.mapper.RecruiterAnalyticsMapper;
import com.smarthire.tenant.analytics.recruiter.service.RecruiterAnalyticsService;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.matching.service.SkillScoringService;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class RecruiterAnalyticsServiceTest {
    @Mock
    RecruiterAnalyticsRepository repository;
    @Mock
    CvAccess access;
    @Mock
    JobRepository jobs;
    @Mock
    JobSkillRepository jobSkills;

    RecruiterAnalyticsService service;

    @BeforeEach
    void setUp() {
        service = new RecruiterAnalyticsService(
                repository,
                new RecruiterAnalyticsMapper(),
                access,
                jobs,
                jobSkills,
                new SkillScoringService(),
                new ObjectMapper());
        User actor = new User();
        actor.setId(7L);
        actor.setEmail("hr@acme.test");
        lenient().when(access.candidate()).thenReturn(false);
        lenient().when(access.actor()).thenReturn(actor);
    }

    @Test
    void rejectsUnauthorizedAccessToJob() {
        Job job = job(30L);
        when(jobs.findWithOwnerById(30L)).thenReturn(Optional.of(job));
        doThrow(new BusinessException("Not assigned to this job", HttpStatus.FORBIDDEN, "JOB_NOT_ASSIGNED"))
                .when(access).requireJob(job);

        Filter filter = new Filter(Instant.now().minus(30, ChronoUnit.DAYS), Instant.now(), 30L);
        assertThatThrownBy(() -> service.jobOverview(filter))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Not assigned");
        assertThatThrownBy(() -> service.pipeline(filter))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void rejectsCandidateActor() {
        when(access.candidate()).thenReturn(true);
        Filter filter = new Filter(Instant.now().minus(30, ChronoUnit.DAYS), Instant.now(), 30L);

        assertThatThrownBy(() -> service.pipeline(filter))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not available to candidates");
    }

    @Test
    void returnsNotFoundForMissingJob() {
        when(jobs.findWithOwnerById(999L)).thenReturn(Optional.empty());
        Filter filter = new Filter(Instant.now().minus(30, ChronoUnit.DAYS), Instant.now(), 999L);

        assertThatThrownBy(() -> service.quality(filter))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Job not found");
    }

    @Test
    void jobOverviewComputesHeadcountConversionAndSlaCounts() {
        Job job = job(30L);
        job.setHeadcount(5);
        when(jobs.findWithOwnerById(30L)).thenReturn(Optional.of(job));
        when(repository.countJobHiredAllTime(30L)).thenReturn(2L);
        when(repository.countJobPendingOffersAllTime(30L)).thenReturn(1L);
        when(repository.countJobAllTimeApplications(30L)).thenReturn(40L);
        when(repository.countApplications(eq(7L), eq(30L), any(), any())).thenReturn(20L);
        when(repository.countHired(eq(7L), eq(30L), any(), any())).thenReturn(2L);
        when(repository.averageQuality(eq(7L), eq(30L), any(), any())).thenReturn(new BigDecimal("78.44"));
        when(repository.countOverdue(eq(7L), eq(30L), any(), any())).thenReturn(3L);
        when(repository.countCvsToScreen(eq(7L), eq(30L), any(), any())).thenReturn(4L);
        when(repository.countPendingReviews(eq(7L), eq(30L), any(), any())).thenReturn(1L);
        when(repository.countUpcomingInterviews(eq(7L), eq(30L), any(), any())).thenReturn(2L);

        JobOverviewResponse overview = service.jobOverview(new Filter(Instant.now().minus(30, ChronoUnit.DAYS), Instant.now(), 30L));

        verify(access).requireJob(job);
        assertThat(overview.jobId()).isEqualTo(30L);
        assertThat(overview.headcount()).isEqualTo(5);
        assertThat(overview.hiredCount()).isEqualTo(2L);
        assertThat(overview.pendingOfferCount()).isEqualTo(1L);
        assertThat(overview.totalApplications()).isEqualTo(20L);
        assertThat(overview.allTimeApplications()).isEqualTo(40L);
        assertThat(overview.conversionRate()).isEqualByComparingTo("10.0");
        assertThat(overview.averageOverallScore()).isEqualByComparingTo("78.4");
        assertThat(overview.overdueCount()).isEqualTo(3L);
    }

    @Test
    void pipelineIncludesSevenStagesDropOffsAndTimeInStage() {
        Job job = job(30L);
        when(jobs.findWithOwnerById(30L)).thenReturn(Optional.of(job));

        when(repository.findPipeline(eq(7L), eq(30L), any(), any())).thenReturn(List.of(
                new Object[]{"NEW", 3L},
                new Object[]{"HUMAN_INTERVIEW", 2L},
                new Object[]{"HIRED", 1L},
                new Object[]{"REJECTED", 4L}));
        when(repository.findReachedStages(eq(7L), eq(30L), any(), any())).thenReturn(List.of(
                new Object[]{"NEW", 10L},
                new Object[]{"IN_REVIEW", 7L},
                new Object[]{"ASSESSMENT", 5L},
                new Object[]{"INTERVIEW", 4L},
                new Object[]{"HUMAN_INTERVIEW", 3L},
                new Object[]{"OFFER", 1L},
                new Object[]{"HIRED", 1L}));
        Instant t0 = Instant.now().minus(48, ChronoUnit.HOURS);
        Instant t1 = t0.plus(12, ChronoUnit.HOURS);
        Instant t2 = t1.plus(24, ChronoUnit.HOURS);
        when(repository.findStageTransitions(eq(7L), eq(30L), any(), any())).thenReturn(List.of(
                new Object[]{101L, "ASSESSMENT", Timestamp.from(t0), "NEW", "IN_REVIEW", Timestamp.from(t1)},
                new Object[]{101L, "ASSESSMENT", Timestamp.from(t0), "IN_REVIEW", "ASSESSMENT", Timestamp.from(t2)}));
        when(repository.findStageDropOffs(eq(7L), eq(30L), any(), any())).thenReturn(List.<Object[]>of(
                new Object[]{"IN_REVIEW", 3L, 1L, 0L}));
        when(repository.findSlaAlerts(eq(7L), eq(30L), any(), any())).thenReturn(List.of());
        when(repository.countActiveJobs(eq(7L), eq(30L), any(), any())).thenReturn(1L);

        PipelineResponse res = service.pipeline(new Filter(Instant.now().minus(30, ChronoUnit.DAYS), Instant.now(), 30L));

        assertThat(res.stages()).extracting(PipelineStage::code)
                .containsExactly("NEW", "IN_REVIEW", "ASSESSMENT", "INTERVIEW", "HUMAN_INTERVIEW", "OFFER", "HIRED");
        assertThat(res.totalCandidates()).isEqualTo(10L);
        assertThat(res.stages().get(0).avgHoursInStage()).isEqualByComparingTo("12.0");
        assertThat(res.stages().get(1).avgHoursInStage()).isEqualByComparingTo("24.0");
        assertThat(res.stages().get(4).count()).isEqualTo(2L);
        assertThat(res.stages().get(4).reachedCount()).isEqualTo(3L);
        assertThat(res.dropOffs()).anySatisfy(drop -> {
            assertThat(drop.stageCode()).isEqualTo("IN_REVIEW");
            assertThat(drop.rejectedCount()).isEqualTo(3L);
            assertThat(drop.failedCount()).isEqualTo(1L);
            assertThat(drop.totalDropOff()).isEqualTo(4L);
        });
    }

    @Test
    void qualityBuildsTrendAndFourScoreHistograms() {
        Job job = job(30L);
        when(jobs.findWithOwnerById(30L)).thenReturn(Optional.of(job));
        when(repository.findSourceQuality(eq(7L), eq(30L), any(), any())).thenReturn(List.<Object[]>of(
                new Object[]{"CAREER", 5L, new BigDecimal("82.5"), 1L}));
        when(repository.findApplicationTrend(eq(7L), eq(30L), any(), any(), eq("DAY"))).thenReturn(List.<Object[]>of(
                new Object[]{"2026-11-01", 4L, 1L, new BigDecimal("74.2")}));
        when(repository.findQualitySnapshotTrend(eq(7L), eq(30L), any(), any(), eq("DAY"))).thenReturn(List.<Object[]>of(
                new Object[]{"2026-11-01", new BigDecimal("79.5")}));
        when(repository.findOverallScoreRows(eq(7L), eq(30L), any(), any())).thenReturn(List.of(
                new Object[]{new BigDecimal("15"), null},
                new Object[]{new BigDecimal("85"), null}));
        when(repository.findCvMatchScoreRows(eq(7L), eq(30L), any(), any())).thenReturn(List.<Object[]>of(
                new Object[]{new BigDecimal("72"), 1}));
        when(repository.findAssessmentScoreRows(eq(7L), eq(30L), any(), any())).thenReturn(List.of());
        when(repository.findAiInterviewScoreRows(eq(7L), eq(30L), any(), any())).thenReturn(List.<Object[]>of(
                new Object[]{new BigDecimal("65"), 0},
                new Object[]{new BigDecimal("88"), 1}));
        when(repository.averageQuality(eq(7L), eq(30L), any(), any())).thenReturn(new BigDecimal("79.5"));

        QualityResponse res = service.quality(new Filter(Instant.now().minus(30, ChronoUnit.DAYS), Instant.now(), 30L));

        assertThat(res.trend()).hasSize(1);
        assertThat(res.trend().get(0).applications()).isEqualTo(4L);
        assertThat(res.trend().get(0).hired()).isEqualTo(1L);
        assertThat(res.trend().get(0).score()).isEqualByComparingTo("79.5");
        assertThat(res.scoreDistributions()).extracting(ScoreDistribution::type)
                .containsExactly("OVERALL", "CV_MATCH", "ASSESSMENT", "AI_INTERVIEW");
        ScoreDistribution overall = res.scoreDistributions().get(0);
        assertThat(overall.count()).isEqualTo(2L);
        assertThat(overall.average()).isEqualByComparingTo("50.0");
        assertThat(overall.buckets().get(0).count()).isEqualTo(1L);
        assertThat(overall.buckets().get(4).count()).isEqualTo(1L);
        ScoreDistribution ai = res.scoreDistributions().get(3);
        assertThat(ai.passRate()).isEqualByComparingTo("50.0");
    }

    @Test
    void jobInsightsComputesSkillGapsLossReasonsProctoringAndInterviews() {
        Job job = job(30L);
        job.setAiInterviewPassingScore(new BigDecimal("70.00"));
        when(jobs.findWithOwnerById(30L)).thenReturn(Optional.of(job));

        Skill javaSkill = Skill.builder().id(1L).name("Java").category("Backend").build();
        Skill k8sSkill = Skill.builder().id(2L).name("Kubernetes").category("DevOps").build();
        when(jobSkills.findByJob_IdOrderByIdAsc(30L)).thenReturn(List.of(
                JobSkill.builder().id(10L).job(job).skill(javaSkill).required(true).weight(BigDecimal.valueOf(2)).build(),
                JobSkill.builder().id(11L).job(job).skill(k8sSkill).required(false).weight(BigDecimal.ONE).build()));
        when(repository.findJobCvSkills(eq(30L), any(), any())).thenReturn(List.of(
                new Object[]{1L, "Java"},
                new Object[]{1L, "k8s"},
                new Object[]{2L, "Java"}));
        when(repository.findJobCvAnalysisSkills(eq(30L), any(), any())).thenReturn(List.of());
        when(repository.findJobLossStatusesAndReasons(eq(30L), any(), any())).thenReturn(List.of(
                new Object[]{"REJECTED", "Thiếu kinh nghiệm Java", null},
                new Object[]{"REJECTED", " thiếu kinh nghiệm java ", null},
                new Object[]{"WITHDRAWN", null, "Nhận offer khác"}));
        when(repository.countFinishedSubmissionsForJob(eq(30L), any(), any())).thenReturn(3L);
        when(repository.findProctorReportRiskScores(eq(30L), any(), any())).thenReturn(List.of(
                new BigDecimal("10"), new BigDecimal("45"), new BigDecimal("75")));
        when(repository.findProctorEventCounts(eq(30L), any(), any())).thenReturn(List.<Object[]>of(
                new Object[]{"PAGE_HIDDEN", 5L}));
        when(repository.findHumanInterviewEvaluations(eq(30L), any(), any())).thenReturn(List.<Object[]>of(
                new Object[]{new BigDecimal("80"), new BigDecimal("90"), new BigDecimal("85"), new BigDecimal("85"), "STRONG_HIRE"}));
        when(repository.findAiInterviewStats(eq(30L), any(), any())).thenReturn(List.<Object[]>of(
                new Object[]{"PASSED", new BigDecimal("82"), new BigDecimal("70")},
                new Object[]{"FAILED", new BigDecimal("55"), new BigDecimal("70")}));

        JobInsightsResponse insights = service.jobInsights(new Filter(Instant.now().minus(30, ChronoUnit.DAYS), Instant.now(), 30L));

        assertThat(insights.evaluatedCvCount()).isEqualTo(2L);
        assertThat(insights.skillGaps()).hasSize(2);
        assertThat(insights.skillGaps().get(0).skillName()).isEqualTo("Java");
        assertThat(insights.skillGaps().get(0).coveragePercent()).isEqualByComparingTo("100.0");
        assertThat(insights.skillGaps().get(1).skillName()).isEqualTo("Kubernetes");
        assertThat(insights.skillGaps().get(1).coveragePercent()).isEqualByComparingTo("50.0");
        assertThat(insights.lossAnalysis().totalRejected()).isEqualTo(2L);
        assertThat(insights.lossAnalysis().rejectReasons().get(0).count()).isEqualTo(2L);
        assertThat(insights.proctoring().highRiskCount()).isEqualTo(1L);
        assertThat(insights.proctoring().mediumRiskCount()).isEqualTo(1L);
        assertThat(insights.proctoring().lowRiskCount()).isEqualTo(1L);
        assertThat(insights.humanInterviews().recommendations()).containsEntry("STRONG_HIRE", 1L);
        assertThat(insights.aiInterviews().passedCount()).isEqualTo(1L);
        assertThat(insights.aiInterviews().completedSessions()).isEqualTo(2L);
    }

    private static Job job(long id) {
        Job job = new Job();
        job.setId(id);
        job.setTitle("Senior Backend Engineer");
        job.setStatus(JobStatus.PUBLISHED);
        job.setDepartment("Engineering");
        job.setScreeningMode(ScreeningMode.AUTO);
        return job;
    }
}

