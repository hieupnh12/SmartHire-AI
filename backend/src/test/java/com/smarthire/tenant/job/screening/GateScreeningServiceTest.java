package com.smarthire.tenant.job.screening;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.domain.enums.TestSubmissionStatus;
import com.smarthire.domain.tenant.entity.AiInterview;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.GateScore;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobScreeningConfig;
import com.smarthire.domain.tenant.entity.MatchScore;
import com.smarthire.domain.tenant.entity.Submission;
import com.smarthire.domain.tenant.repository.GateScoreRepository;
import com.smarthire.domain.tenant.repository.MatchScoreRepository;
import com.smarthire.domain.tenant.repository.RankingDataRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GateScreeningServiceTest {
    @Mock JobScreeningConfigService screening;
    @Mock RankingDataRepository ranking;
    @Mock MatchScoreRepository matches;
    @Mock GateScoreRepository gates;

    GateScreeningService service;
    Application application;
    Job job;

    @BeforeEach
    void setUp() {
        service = new GateScreeningService(screening, ranking, matches, gates, new ObjectMapper());
        job = new Job();
        job.setId(3L);
        application = new Application();
        application.setId(9L);
        application.setJob(job);
        when(gates.findByApplication_Id(9L)).thenReturn(Optional.empty());
        when(gates.save(any(GateScore.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void usesGateWeightsAndIgnoresMissingInputsUntilComplete() {
        JobScreeningConfig config = JobScreeningConfigService.snapshot();
        config.setGateCvWeight(new BigDecimal("40"));
        config.setGateInterviewWeight(new BigDecimal("35"));
        config.setGateAssessmentWeight(new BigDecimal("25"));
        config.setGatePassThreshold(new BigDecimal("70"));
        when(screening.require(3L)).thenReturn(config);
        stubScores("82", "75", "90");

        GateScore score = service.recalculate(application);

        assertThat(score.getScore()).isEqualByComparingTo("81.55");
        assertThat(score.isPassed()).isTrue();
        assertThat(score.getBreakdownJson()).contains("\"complete\":true");
    }

    @Test
    void changingGateWeightsDoesNotChangeCvInputScore() {
        JobScreeningConfig config = JobScreeningConfigService.snapshot();
        config.setGateCvWeight(new BigDecimal("100"));
        config.setGateInterviewWeight(BigDecimal.ZERO);
        config.setGateAssessmentWeight(BigDecimal.ZERO);
        config.setGatePassThreshold(new BigDecimal("50"));
        when(screening.require(3L)).thenReturn(config);
        stubScores("82", "10", "10");

        GateScore score = service.recalculate(application);

        assertThat(score.getScore()).isEqualByComparingTo("82.00");
        assertThat(score.getBreakdownJson()).contains("\"cvScore\":82");
        ArgumentCaptor<GateScore> captor = ArgumentCaptor.forClass(GateScore.class);
        verify(gates).save(captor.capture());
        assertThat(captor.getValue().getBreakdownJson()).doesNotContain("\"cvScore\":10");
    }

    @Test
    void missingInputsScoreZeroAndDoNotPass() {
        JobScreeningConfig config = JobScreeningConfigService.snapshot();
        when(screening.require(3L)).thenReturn(config);
        when(ranking.cvs(9L)).thenReturn(List.of());
        when(ranking.aiInterviews(9L)).thenReturn(List.of());
        when(ranking.submissions(9L)).thenReturn(List.of());

        GateScore score = service.recalculate(application);

        assertThat(score.getScore()).isEqualByComparingTo("0.00");
        assertThat(score.isPassed()).isFalse();
        assertThat(score.getBreakdownJson()).contains("\"complete\":false");
    }

    private void stubScores(String cv, String interview, String assessment) {
        Cv resume = new Cv();
        resume.setId(4L);
        MatchScore match = new MatchScore();
        match.setScore(new BigDecimal(cv));
        when(ranking.cvs(9L)).thenReturn(List.of(resume));
        when(matches.findByJob_IdAndCv_Id(3L, 4L)).thenReturn(Optional.of(match));

        AiInterview session = new AiInterview();
        session.setId(5L);
        session.setStatus(AiInterviewStatus.SCORED);
        session.setOverallScore(new BigDecimal(interview));
        when(ranking.aiInterviews(9L)).thenReturn(List.of(session));

        Submission submission = new Submission();
        submission.setId(6L);
        submission.setStatus(TestSubmissionStatus.GRADED);
        submission.setScore(new BigDecimal(assessment));
        when(ranking.submissions(9L)).thenReturn(List.of(submission));
    }
}
