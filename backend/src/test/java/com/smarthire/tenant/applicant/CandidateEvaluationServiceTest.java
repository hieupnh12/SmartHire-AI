package com.smarthire.tenant.applicant;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.domain.enums.TestSubmissionStatus;
import com.smarthire.domain.tenant.entity.AiInterview;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobScreeningConfig;
import com.smarthire.domain.tenant.entity.JobTest;
import com.smarthire.domain.tenant.entity.MatchScore;
import com.smarthire.domain.tenant.entity.Submission;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.RankingDataRepository;
import com.smarthire.tenant.applicant.dto.ApplicantModels.CandidateEvaluationView;
import com.smarthire.tenant.applicant.service.CandidateEvaluationService;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.job.screening.GateScreeningService;
import com.smarthire.tenant.job.screening.JobScreeningConfigService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CandidateEvaluationServiceTest {
    @Mock ApplicationRepository applications;
    @Mock CvAccess access;
    @Mock RankingDataRepository ranking;
    @Mock GateScreeningService gateScreening;
    @Mock JobScreeningConfigService screening;

    CandidateEvaluationService service;
    User candidate;
    Application application;

    @BeforeEach
    void setUp() {
        service = new CandidateEvaluationService(applications, access, ranking, gateScreening, screening, new ObjectMapper());
        candidate = new User();
        candidate.setId(9L);
        Job job = new Job();
        job.setId(1L);
        application = new Application();
        application.setId(4L);
        application.setJob(job);
        application.setCandidate(candidate);
        when(applications.findById(4L)).thenReturn(Optional.of(application));
        when(access.candidate()).thenReturn(true);
    }

    @Test
    void ownerSeesRoundReasonsWithAttemptsNewestFirst() {
        when(access.actor()).thenReturn(candidate);
        MatchScore match = new MatchScore();
        match.setScore(new BigDecimal("55.00"));
        match.setBreakdownJson("""
                {"passed":false,"explanation":"Thiếu kỹ năng bắt buộc","matched":[{"requirement":"Java"}],
                 "partialMatches":[],"missing":[{"requirement":"Kafka"}],"requiredMissing":["Kafka"],
                 "experienceAnalysis":{"requiredYears":3,"candidateYears":1.5},"educationAnalysis":{"requiredLevel":null}}""");
        when(gateScreening.latestMatch(application)).thenReturn(match);
        JobScreeningConfig config = new JobScreeningConfig();
        config.setCvPassThreshold(new BigDecimal("70"));
        when(screening.require(1L)).thenReturn(config);
        when(ranking.aiInterviews(4L)).thenReturn(List.of(
                interview(1L, 1, AiInterviewStatus.FAILED, null),
                interview(2L, 2, AiInterviewStatus.PASSED, "{\"summary\":\"Tốt\",\"competencies\":{\"TECHNICAL_KNOWLEDGE\":80}}")));
        JobTest test = new JobTest();
        test.setTitle("Java test");
        test.setPassingScore(new BigDecimal("60"));
        Submission submission = new Submission();
        submission.setId(7L);
        submission.setTest(test);
        submission.setStatus(TestSubmissionStatus.GRADED);
        submission.setScore(new BigDecimal("50"));
        when(ranking.submissions(4L)).thenReturn(List.of(submission));

        CandidateEvaluationView view = service.evaluation(4L);

        assertThat(view.cv().passed()).isFalse();
        assertThat(view.cv().threshold()).isEqualByComparingTo("70");
        assertThat(view.cv().explanation()).isEqualTo("Thiếu kỹ năng bắt buộc");
        assertThat(view.cv().matchedSkills()).containsExactly("Java");
        assertThat(view.cv().requiredMissingSkills()).containsExactly("Kafka");
        assertThat(view.cv().candidateYears()).isEqualByComparingTo("1.5");
        assertThat(view.aiInterviews()).extracting(row -> row.attemptNumber()).containsExactly(2, 1);
        assertThat(view.aiInterviews().get(0).passed()).isTrue();
        assertThat(view.aiInterviews().get(0).summary()).isEqualTo("Tốt");
        assertThat(view.aiInterviews().get(0).criteria()).containsKey("TECHNICAL_KNOWLEDGE");
        assertThat(view.aiInterviews().get(1).passed()).isFalse();
        assertThat(view.assessments().get(0).passed()).isFalse();
        assertThat(view.assessments().get(0).testTitle()).isEqualTo("Java test");
    }

    @Test
    void otherCandidateGetsNotFound() {
        User other = new User();
        other.setId(10L);
        when(access.actor()).thenReturn(other);

        assertThatThrownBy(() -> service.evaluation(4L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Application not found");
    }

    private static AiInterview interview(long id, int attempt, AiInterviewStatus status, String report) {
        AiInterview interview = new AiInterview();
        interview.setId(id);
        interview.setAttemptNumber(attempt);
        interview.setStatus(status);
        interview.setReportJson(report);
        return interview;
    }
}
