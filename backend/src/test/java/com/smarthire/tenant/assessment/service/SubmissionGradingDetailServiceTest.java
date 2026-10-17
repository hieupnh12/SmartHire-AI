package com.smarthire.tenant.assessment.service;

import com.smarthire.domain.enums.*;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.assessment.dto.request.UpdateGradingRequest;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.notification.service.NotificationPreferenceService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class SubmissionGradingDetailServiceTest {
    final SubmissionRepository submissions = mock(SubmissionRepository.class);
    final QuestionRepository questions = mock(QuestionRepository.class);
    final AnswerRepository answers = mock(AnswerRepository.class);
    final EmailOutboxRepository emails = mock(EmailOutboxRepository.class);
    final AssessmentGradingService grading = mock(AssessmentGradingService.class);
    final SubmissionService room = mock(SubmissionService.class);
    final CvAccess access = mock(CvAccess.class);
    final NotificationPreferenceService preferences = mock(NotificationPreferenceService.class);
    final SubmissionGradingDetailService service = new SubmissionGradingDetailService(submissions, questions, answers, emails, grading, room, access, preferences);
    Submission submission;
    Question objective;
    Answer objectiveAnswer;

    @BeforeEach void setup() {
        var candidate = new Candidate(); candidate.setFullName("Candidate"); candidate.setEmail("candidate@example.test");
        var test = new JobTest(); test.setId(2L); test.setTitle("Test"); test.setJob(new Job()); test.setPassingScore(new BigDecimal("5"));
        submission = new Submission(); submission.setId(1L); submission.setTest(test); submission.setCandidate(candidate); submission.setStatus(TestSubmissionStatus.SUBMITTED);
        objective = new Question(); objective.setId(3L); objective.setQuestionType("MCQ"); objective.setPoints(10);
        objectiveAnswer = new Answer(); objectiveAnswer.setQuestion(objective); objectiveAnswer.setCorrect(true); objectiveAnswer.setScore(new BigDecimal("10"));
        lenient().when(access.staff()).thenReturn(true);
        lenient().when(submissions.findLockedById(1L)).thenReturn(Optional.of(submission));
        lenient().when(questions.findByTest_IdOrderByQuestionOrderAscIdAsc(2L)).thenReturn(List.of(objective));
        lenient().when(answers.findBySubmission_IdOrderByQuestion_QuestionOrderAscQuestion_IdAsc(1L)).thenReturn(List.of(objectiveAnswer));
        lenient().when(grading.reviews(1L)).thenReturn(List.of());
    }

    @Test void objectiveSummaryCountsUnansweredQuestionsAndUsesPersistedGrade() {
        var unanswered = new Question(); unanswered.setQuestionType("MULTIPLE_CHOICE"); unanswered.setPoints(5);
        when(questions.findByTest_IdOrderByQuestionOrderAscIdAsc(2L)).thenReturn(List.of(objective, unanswered));
        var result = service.detail(1L);
        assertThat(result.objective().correctCount()).isEqualTo(1);
        assertThat(result.objective().questionCount()).isEqualTo(2);
        assertThat(result.objective().score()).isEqualByComparingTo("10");
        assertThat(result.objective().totalPoints()).isEqualTo(15);
        assertThat(result.score()).isNull();
        verify(access).requireJob(submission.getTest().getJob());
    }

    @Test void candidateCannotReadReviewOrQueueEmail() {
        when(access.staff()).thenReturn(false);
        assertThatThrownBy(() -> service.detail(1L)).hasMessageContaining("Staff access required");
        assertThatThrownBy(() -> service.sendResult(1L)).hasMessageContaining("Staff access required");
        verifyNoInteractions(emails, room);
    }

    @Test void incompleteScoresCannotBeEmailed() {
        assertThatThrownBy(() -> service.sendResult(1L)).hasMessageContaining("Approve every");
        verifyNoInteractions(emails);
    }

    @Test void missingSubjectiveAnswerCannotBeEmailedEvenIfLegacyTotalExists() {
        submission.setScore(new BigDecimal("10"));
        var missing = new Question(); missing.setId(4L); missing.setQuestionType("ESSAY"); missing.setPoints(5);
        when(questions.findByTest_IdOrderByQuestionOrderAscIdAsc(2L)).thenReturn(List.of(objective, missing));
        assertThatThrownBy(() -> service.sendResult(1L)).hasMessageContaining("Approve every");
        verifyNoInteractions(emails);
    }

    @Test void queuesOfficialResultWithoutRubricOrSourceAndRespectsPreferences() {
        submission.setScore(new BigDecimal("10.00")); submission.setStatus(TestSubmissionStatus.GRADED);
        when(emails.findFirstByPurposeAndToEmailAndSubjectAndBodyOrderByIdDesc(anyString(), anyString(), anyString(), anyString())).thenReturn(Optional.empty());
        when(emails.save(any())).thenAnswer(call -> { EmailOutbox email = call.getArgument(0); email.setId(7L); return email; });
        var receipt = service.sendResult(1L);
        assertThat(receipt.status()).isEqualTo(NotificationStatus.PENDING);
        verify(emails).save(argThat(email -> email.getPurpose().equals("ASSESSMENT_RESULT") && email.getToEmail().equals("candidate@example.test") && email.getBody().contains("10/10")));
        when(preferences.emailOff(any(Candidate.class), eq(NotificationCategory.ASSESSMENT))).thenReturn(true);
        assertThatThrownBy(() -> service.sendResult(1L)).hasMessageContaining("disabled assessment");
    }

    @Test void repeatedResultRequestsReuseOutboxAndFailedEmailCanBeRetried() {
        submission.setScore(new BigDecimal("10"));
        var existing = new EmailOutbox(); existing.setId(7L); existing.setStatus(NotificationStatus.SENT);
        when(emails.findFirstByPurposeAndToEmailAndSubjectAndBodyOrderByIdDesc(anyString(), anyString(), anyString(), anyString())).thenReturn(Optional.of(existing));
        assertThat(service.sendResult(1L).id()).isEqualTo(7L);
        verify(emails, never()).save(any());
        existing.setStatus(NotificationStatus.FAILED); existing.setAttempts(3);
        assertThat(service.sendResult(1L).status()).isEqualTo(NotificationStatus.PENDING);
        assertThat(existing.getAttempts()).isZero();
    }

    @Test void updateDelegatesExplicitDecisionsAndActiveSubmissionsAreRejected() {
        service.update(1L, new UpdateGradingRequest(List.of(new UpdateGradingRequest.Decision(3L, new BigDecimal("8.5")))));
        verify(grading).approve(1L, 3L, new BigDecimal("8.5"));
        submission.setStatus(TestSubmissionStatus.IN_PROGRESS);
        assertThatThrownBy(() -> service.detail(1L)).hasMessageContaining("Submit before");
    }
}
