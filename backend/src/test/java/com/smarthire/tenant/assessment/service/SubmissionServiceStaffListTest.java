package com.smarthire.tenant.assessment.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.TestSubmissionStatus;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.assessment.mapper.AssessmentMapper;
import com.smarthire.tenant.cv.service.CvAccess;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class SubmissionServiceStaffListTest {
    SubmissionRepository submissions = mock(SubmissionRepository.class);
    QuestionRepository questions = mock(QuestionRepository.class);
    JobRepository jobs = mock(JobRepository.class);
    CvAccess access = mock(CvAccess.class);
    SubmissionService service;
    Job job;
    JobTest test;

    @BeforeEach
    void setup() {
        service = new SubmissionService(mock(JobTestRepository.class), mock(ApplicationRepository.class), submissions,
                questions, mock(OptionRepository.class), mock(AnswerRepository.class), mock(CodingProblemRepository.class),
                access, mock(AssessmentMapper.class), mock(AiInterviewRepository.class), jobs);
        job = new Job();
        job.setId(1L);
        test = new JobTest();
        test.setId(10L);
        test.setJob(job);
        test.setTitle("Java");
        test.setDurationMinutes(30);
        test.setPassingScore(new BigDecimal("5"));
        Question question = new Question();
        question.setPoints(10);
        when(questions.findByTest_IdOrderByQuestionOrderAscIdAsc(10L)).thenReturn(List.of(question));
        when(jobs.findById(1L)).thenReturn(Optional.of(job));
    }

    @Test
    void listsActiveGradedAndOverduePapersWithoutMutatingThem() {
        when(access.staff()).thenReturn(true);
        Submission active = submission(1L, TestSubmissionStatus.IN_PROGRESS, Instant.now().minusSeconds(60), null);
        Submission graded = submission(2L, TestSubmissionStatus.GRADED, Instant.now().minusSeconds(600), new BigDecimal("10"));
        Submission overdue = submission(3L, TestSubmissionStatus.IN_PROGRESS, Instant.now().minusSeconds(3600), null);
        when(submissions.findByJobId(1L)).thenReturn(List.of(active, graded, overdue));

        var rows = service.staffList(1L);

        assertThat(rows).extracting(r -> r.status()).containsExactly(
                TestSubmissionStatus.IN_PROGRESS, TestSubmissionStatus.GRADED, TestSubmissionStatus.EXPIRED);
        assertThat(rows.get(0).remainingSeconds()).isBetween(1L, 30L * 60);
        assertThat(rows.get(1).passed()).isTrue();
        assertThat(rows.get(1).totalPoints()).isEqualTo(10);
        assertThat(rows.get(2).remainingSeconds()).isZero();
        assertThat(overdue.getStatus()).isEqualTo(TestSubmissionStatus.IN_PROGRESS);
        verify(access).requireJob(job);
        verify(submissions, never()).save(any());
    }

    @Test
    void rejectsNonStaff() {
        when(access.staff()).thenReturn(false);
        assertThatThrownBy(() -> service.staffList(1L)).isInstanceOf(BusinessException.class)
                .hasMessageContaining("Staff access required");
        verifyNoInteractions(submissions);
    }

    private Submission submission(long id, TestSubmissionStatus status, Instant startedAt, BigDecimal score) {
        User candidate = new User();
        candidate.setId(100L + id);
        candidate.setFullName("Candidate " + id);
        candidate.setEmail("c" + id + "@example.test");
        Application application = new Application();
        application.setId(200L + id);
        Submission submission = new Submission();
        submission.setId(id);
        submission.setTest(test);
        submission.setCandidate(candidate);
        submission.setApplication(application);
        submission.setStatus(status);
        submission.setStartedAt(startedAt);
        submission.setScore(score);
        return submission;
    }
}
