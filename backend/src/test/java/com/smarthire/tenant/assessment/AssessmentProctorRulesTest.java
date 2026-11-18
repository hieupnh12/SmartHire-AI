package com.smarthire.tenant.assessment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.NotificationCategory;
import com.smarthire.domain.enums.QuestionType;
import com.smarthire.domain.enums.TestStatus;
import com.smarthire.domain.enums.TestSubmissionStatus;
import com.smarthire.domain.tenant.entity.Answer;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobSkill;
import com.smarthire.domain.tenant.entity.JobTest;
import com.smarthire.domain.tenant.entity.Question;
import com.smarthire.domain.tenant.entity.Skill;
import com.smarthire.domain.tenant.entity.Submission;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.aiInterview.ai.AiInterviewClient;
import com.smarthire.tenant.applicant.service.ApplicantService;
import com.smarthire.tenant.assessment.dto.request.AssessmentConfigRequest;
import com.smarthire.tenant.assessment.mapper.AssessmentMapper;
import com.smarthire.tenant.assessment.service.AssessmentGenerationService;
import com.smarthire.tenant.assessment.service.AssessmentGradingService;
import com.smarthire.tenant.assessment.service.CodingJudge;
import com.smarthire.tenant.assessment.service.SubmissionGradingDetailService;
import com.smarthire.tenant.assessment.service.SubmissionService;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.notification.service.NotificationPreferenceService;
import com.smarthire.tenant.notification.service.StaffNotificationService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

class AssessmentProctorRulesTest {

    @Test
    void saveConfigRejectsAutoAssignTogetherWithStrictProctor() {
        var jobs = mock(JobRepository.class);
        var tests = mock(JobTestRepository.class);
        var skills = mock(JobSkillRepository.class);
        var access = mock(CvAccess.class);
        var service = new AssessmentGenerationService(
                jobs, tests, skills, mock(QuestionRepository.class), mock(OptionRepository.class),
                mock(ApplicationRepository.class), mock(AiInterviewRepository.class),
                mock(NotificationRepository.class), mock(EmailOutboxRepository.class),
                access, mock(AssessmentMapper.class), new ObjectMapper(), mock(NotificationPreferenceService.class));

        Job job = new Job();
        job.setId(10L);
        job.setTitle("Backend Engineer");
        when(access.staff()).thenReturn(true);
        when(access.actor()).thenReturn(new User());
        when(jobs.findById(10L)).thenReturn(Optional.of(job));

        var conflicting = new AssessmentConfigRequest(
                30, 70, true,
                List.of(new AssessmentConfigRequest.Section("Java", QuestionType.MCQ, "Easy", 2, 5)),
                null, 80, 20, null, null, false, true, "https://meet.google.com/abc-defg-hij");

        assertThatThrownBy(() -> service.saveConfig(10L, conflicting))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Strict Live Proctoring");
    }

    @Test
    void saveConfigOnlySyncsStrictProctorToUnstartedTests() {
        var jobs = mock(JobRepository.class);
        var tests = mock(JobTestRepository.class);
        var skills = mock(JobSkillRepository.class);
        var submissions = mock(SubmissionRepository.class);
        var access = mock(CvAccess.class);
        var service = new AssessmentGenerationService(
                jobs, tests, skills, mock(QuestionRepository.class), mock(OptionRepository.class),
                mock(ApplicationRepository.class), mock(AiInterviewRepository.class),
                mock(NotificationRepository.class), mock(EmailOutboxRepository.class),
                access, mock(AssessmentMapper.class), new ObjectMapper(), mock(NotificationPreferenceService.class));
        ReflectionTestUtils.setField(service, "submissions", submissions);

        Job job = new Job();
        job.setId(11L);
        job.setTitle("Java Dev");
        Skill javaSkill = new Skill();
        javaSkill.setName("Java");
        JobSkill js = new JobSkill();
        js.setSkill(javaSkill);

        JobTest unstarted = JobTest.builder().id(100L).job(job).title("Java Dev").status(TestStatus.DRAFT).strictProctorEnabled(false).build();
        JobTest started = JobTest.builder().id(101L).job(job).title("Java Dev").status(TestStatus.PUBLISHED).strictProctorEnabled(false).build();

        when(access.staff()).thenReturn(true);
        when(access.actor()).thenReturn(new User());
        when(jobs.findById(11L)).thenReturn(Optional.of(job));
        when(skills.findByJob_IdOrderByIdAsc(11L)).thenReturn(List.of(js));
        when(tests.findByJob_IdOrderByIdDesc(11L)).thenReturn(List.of(unstarted, started));
        when(submissions.existsByTest_IdAndStatusNot(100L, TestSubmissionStatus.NOT_STARTED)).thenReturn(false);
        when(submissions.existsByTest_IdAndStatusNot(101L, TestSubmissionStatus.NOT_STARTED)).thenReturn(true);

        var config = new AssessmentConfigRequest(
                30, 70, false,
                List.of(new AssessmentConfigRequest.Section("Java", QuestionType.MCQ, "Easy", 2, 5)),
                null, 80, 20, null, null, false, true, "https://meet.google.com/proctor-room");

        service.saveConfig(11L, config);

        assertThat(unstarted.isStrictProctorEnabled()).isTrue();
        assertThat(unstarted.getProctorMeetUrl()).isEqualTo("https://meet.google.com/proctor-room");
        assertThat(started.isStrictProctorEnabled()).isFalse();
        assertThat(started.getProctorMeetUrl()).isNull();
    }

    @Test
    void autoGradingNeverOverwritesProctorTerminatedSubmission() {
        var submissions = mock(SubmissionRepository.class);
        var answers = mock(AnswerRepository.class);
        var access = mock(CvAccess.class);
        var service = new AssessmentGradingService(
                submissions, answers, mock(CodingSubmissionRepository.class),
                mock(AiInterviewClient.class), mock(CodingJudge.class),
                new ObjectMapper(), access, mock(ApplicationEventPublisher.class));

        Job job = new Job();
        job.setId(20L);
        JobTest test = JobTest.builder().id(200L).job(job).title("Java Assessment").autoGradingEnabled(true).strictProctorEnabled(true).build();
        Submission terminated = new Submission();
        terminated.setId(500L);
        terminated.setTest(test);
        terminated.setStatus(TestSubmissionStatus.FAILED);
        terminated.setProctorTerminatedReason("Sử dụng điện thoại tra đáp án");

        when(access.staff()).thenReturn(true);
        when(access.actor()).thenReturn(new User());
        when(submissions.findByJobId(20L)).thenReturn(List.of(terminated));
        when(submissions.findLockedById(500L)).thenReturn(Optional.of(terminated));

        assertThat(service.autoGradeJobSubmissions(20L)).isZero();
        assertThat(service.autoGradeSubmission(500L)).isFalse();
        assertThat(terminated.getStatus()).isEqualTo(TestSubmissionStatus.FAILED);
        verify(answers, never()).findBySubmission_IdOrderByQuestion_QuestionOrderAscQuestion_IdAsc(anyLong());
    }

    @Test
    void suggestHoldsFlaggedStrictProctorSubmissionForManualReview() {
        var submissions = mock(SubmissionRepository.class);
        var answers = mock(AnswerRepository.class);
        var applicantsProvider = mock(ObjectProvider.class);
        var applicants = mock(ApplicantService.class);
        var detailProvider = mock(ObjectProvider.class);
        var detailSvc = mock(SubmissionGradingDetailService.class);
        when(applicantsProvider.getIfAvailable()).thenReturn(applicants);
        when(detailProvider.getIfAvailable()).thenReturn(detailSvc);

        var service = new AssessmentGradingService(
                submissions, answers, mock(CodingSubmissionRepository.class),
                mock(AiInterviewClient.class), mock(CodingJudge.class),
                new ObjectMapper(), mock(CvAccess.class), mock(ApplicationEventPublisher.class));
        ReflectionTestUtils.setField(service, "applicants", applicantsProvider);
        ReflectionTestUtils.setField(service, "gradingDetailService", detailProvider);

        Job job = new Job();
        job.setId(21L);
        JobTest test = JobTest.builder()
                .id(201L).job(job).title("Backend Assessment")
                .autoGradingEnabled(true).strictProctorEnabled(true)
                .build();
        Application app = new Application();
        app.setId(301L);
        Submission flagged = new Submission();
        flagged.setId(501L);
        flagged.setTest(test);
        flagged.setApplication(app);
        flagged.setStatus(TestSubmissionStatus.SUBMITTED);
        flagged.setProctorViolationsCount(2);

        Question essayQ = Question.builder().id(901L).test(test).questionType("ESSAY").points(10).questionText("Explain ACID").build();
        Answer blankAnswer = new Answer();
        blankAnswer.setId(801L);
        blankAnswer.setSubmission(flagged);
        blankAnswer.setQuestion(essayQ);
        blankAnswer.setAnswerText("");

        when(submissions.findLockedById(501L)).thenReturn(Optional.of(flagged));
        when(answers.findBySubmission_IdOrderByQuestion_QuestionOrderAscQuestion_IdAsc(501L)).thenReturn(List.of(blankAnswer));

        service.suggest(501L, "ESSAY");

        assertThat(blankAnswer.getSuggestedScore()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(blankAnswer.getScore()).isNull();
        assertThat(flagged.getStatus()).isEqualTo(TestSubmissionStatus.SUBMITTED);
        assertThat(flagged.getScore()).isNull();
        verify(applicants, never()).settleAfterAssessment(anyLong());
        verify(detailSvc, never()).sendResultEmailSilently(anyLong());
    }

    @Test
    void signalProctorCandidateReadyNotifiesStaffOnce() {
        var submissions = mock(SubmissionRepository.class);
        var questions = mock(QuestionRepository.class);
        var answers = mock(AnswerRepository.class);
        var access = mock(CvAccess.class);
        var staffNotifications = mock(StaffNotificationService.class);

        var service = new SubmissionService(
                mock(JobTestRepository.class), mock(ApplicationRepository.class), submissions,
                questions, mock(OptionRepository.class), answers, mock(CodingProblemRepository.class),
                access, mock(AssessmentMapper.class), mock(AiInterviewRepository.class),
                mock(JobRepository.class), mock(ObjectProvider.class));
        ReflectionTestUtils.setField(service, "staffNotifications", staffNotifications);

        Candidate candidate = new Candidate();
        candidate.setId(40L);
        candidate.setFullName("Nguyen Van A");
        Job job = new Job();
        job.setId(30L);
        job.setTitle("Senior Java");
        JobTest test = JobTest.builder().id(300L).job(job).title("Senior Java").strictProctorEnabled(true).durationMinutes(45).build();
        Application app = new Application();
        app.setId(70L);
        app.setJob(job);
        app.setCandidate(candidate);

        Submission submission = new Submission();
        submission.setId(600L);
        submission.setTest(test);
        submission.setApplication(app);
        submission.setCandidate(candidate);
        submission.setStatus(TestSubmissionStatus.NOT_STARTED);
        submission.setProctorCandidateReady(false);

        when(access.candidate()).thenReturn(true);
        when(access.candidateActor()).thenReturn(candidate);
        when(submissions.findOwnedLocked(600L, 40L)).thenReturn(Optional.of(submission));
        when(submissions.save(any(Submission.class))).thenAnswer(inv -> inv.getArgument(0));
        when(questions.findByTest_IdOrderByQuestionOrderAscIdAsc(300L)).thenReturn(List.of());
        when(answers.findBySubmission_IdOrderByQuestion_QuestionOrderAscQuestion_IdAsc(600L)).thenReturn(List.of());

        service.signalProctorCandidateReady(600L);
        service.signalProctorCandidateReady(600L);

        assertThat(submission.isProctorCandidateReady()).isTrue();
        verify(staffNotifications, times(1)).notifyJobStaff(
                eq(job), eq(app), eq(NotificationCategory.ASSESSMENT),
                eq("STAFF_PROCTOR_CANDIDATE_READY"), any(), any(),
                eq("/recruiter/jobs/30/assessments/submissions"));
    }
}
