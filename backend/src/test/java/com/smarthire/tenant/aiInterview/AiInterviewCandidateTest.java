package com.smarthire.tenant.aiInterview;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.CvScreeningStatus;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.aiInterview.dto.request.UpsertAiAnswerRequest;
import com.smarthire.tenant.aiInterview.mapper.AiInterviewMapper;
import com.smarthire.tenant.aiInterview.service.AiInterviewActivityLog;
import com.smarthire.tenant.aiInterview.service.AiInterviewService;
import com.smarthire.tenant.aiInterview.service.AiInterviewInvitationService;
import com.smarthire.tenant.cv.service.CvAccess;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiInterviewCandidateTest {
    @Mock AiInterviewRepository interviews;
    @Mock AiQuestionRepository questions;
    @Mock AiAnswerRepository answers;
    @Mock AiFeedbackRepository feedbacks;
    @Mock ApplicationRepository applications;
    @Mock RecruitmentStageRepository stages;
    @Mock CvAccess access;
    @Mock AiInterviewInvitationService invitations;
    @Mock AiInterviewActivityLog activity;
    @Mock AiInterviewLogRepository logs;
    AiInterviewService service;
    User candidate;
    Application application;
    AiInterview interview;
    AiQuestion question;

    @BeforeEach void setup() {
        service = new AiInterviewService(interviews, questions, answers, feedbacks, applications, stages,
                new AiInterviewMapper(), access, invitations, activity, logs);
        candidate = user(9L);
        var job = new Job();
        job.setId(13L);
        job.setAiInterviewEnabled(true);
        job.setAiInterviewPassingScore(new BigDecimal("70.00"));
        application = new Application();
        application.setId(7L);
        application.setJob(job);
        application.setCandidate(candidate);
        application.setStatus(ApplicationStatus.INTERVIEW);
        application.setCvScreeningStatus(CvScreeningStatus.PASSED);
        interview = AiInterview.builder().id(11L).application(application).status(AiInterviewStatus.QUESTIONS_READY).build();
        question = AiQuestion.builder().id(20L).aiInterview(interview).questionText("Explain transactions").build();
    }

    private void asCandidate() {
        when(access.actor()).thenReturn(candidate);
        when(access.candidate()).thenReturn(true);
    }

    private void owned() {
        asCandidate();
        when(interviews.findByIdForUpdate(11L)).thenReturn(Optional.of(interview));
    }

    private void ownsApplication() {
        asCandidate();
        when(applications.findById(7L)).thenReturn(Optional.of(application));
    }

    private void ownsApplicationAndInterview() {
        ownsApplication();
        when(interviews.findByIdForUpdate(11L)).thenReturn(Optional.of(interview));
    }

    @Test void listIsScopedToCurrentCandidate() {
        when(access.actor()).thenReturn(candidate);
        when(access.candidate()).thenReturn(true);
        when(interviews.findByApplication_Candidate_IdOrderByIdDesc(9L)).thenReturn(List.of(interview));
        assertThat(service.mine()).hasSize(1);
        verify(interviews, never()).findAll();
    }

    @Test void cannotReadAnotherCandidatesInterview() {
        when(access.actor()).thenReturn(user(99L));
        when(access.candidate()).thenReturn(true);
        when(interviews.findById(11L)).thenReturn(Optional.of(interview));
        assertThatThrownBy(() -> service.get(11L)).isInstanceOf(BusinessException.class);
        verifyNoInteractions(questions, answers);
    }

    @Test void startsOnlyWhenQuestionsAreReady() {
        owned();
        when(questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(11L)).thenReturn(List.of(question));
        assertThat(service.start(11L).status()).isEqualTo(AiInterviewStatus.IN_PROGRESS);
        assertThat(interview.getStartedAt()).isNotNull();
        assertThat(interview.getPassingScoreSnapshot()).isEqualByComparingTo("70");
        verify(activity).record(eq(interview), eq("STARTED"), anyString());
    }

    @Test void cannotStartWithoutReadyQuestions() {
        owned();
        interview.setStatus(AiInterviewStatus.CREATED);
        assertThatThrownBy(() -> service.start(11L)).isInstanceOf(BusinessException.class);
        assertThat(interview.getStartedAt()).isNull();
    }

    @Test void cannotSubmitUnansweredQuestions() {
        owned();
        interview.setStatus(AiInterviewStatus.IN_PROGRESS);
        when(questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(11L)).thenReturn(List.of(question));
        assertThatThrownBy(() -> service.complete(11L)).isInstanceOf(BusinessException.class);
        assertThat(interview.getCompletedAt()).isNull();
    }

    @Test void completedAnswersCannotBeEditedByCandidate() {
        owned();
        interview.setStatus(AiInterviewStatus.SCORING);
        when(questions.findByIdAndAiInterview_Id(20L, 11L)).thenReturn(Optional.of(question));
        assertThatThrownBy(() -> service.upsertAnswer(11L, 20L, new UpsertAiAnswerRequest("answer", null, null)))
                .isInstanceOf(BusinessException.class);
        verify(answers, never()).save(any());
    }

    @Test void submitsPersistedAnswersForEvaluation() {
        owned();
        interview.setStatus(AiInterviewStatus.IN_PROGRESS);
        when(questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(11L)).thenReturn(List.of(question));
        when(answers.findByAiQuestion_IdIn(List.of(20L))).thenReturn(List.of(
                AiAnswer.builder().id(30L).aiQuestion(question).answerText("Atomic operations").build()));
        assertThat(service.complete(11L).status()).isEqualTo(AiInterviewStatus.SCORING);
        assertThat(interview.getCompletedAt()).isNotNull();
        verify(activity).record(eq(interview), eq("SUBMITTED"), anyString());
    }

    @Test void requestStartCreatesSingleAttemptWhenNoneExists() {
        ownsApplication();
        var created = AiInterview.builder().id(12L).application(application).status(AiInterviewStatus.GENERATING).build();
        when(interviews.findByApplication_IdOrderByIdDesc(7L)).thenReturn(List.of());
        when(invitations.invite(7L, null)).thenReturn(created);
        assertThat(service.requestStart(7L).status()).isEqualTo(AiInterviewStatus.GENERATING);
        verify(invitations).invite(7L, null);
    }

    @Test void requestStartBeginsReadyAttempt() {
        ownsApplicationAndInterview();
        when(interviews.findByApplication_IdOrderByIdDesc(7L)).thenReturn(List.of(interview));
        when(questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(11L)).thenReturn(List.of(question));
        assertThat(service.requestStart(7L).status()).isEqualTo(AiInterviewStatus.IN_PROGRESS);
        verifyNoInteractions(invitations);
    }

    @Test void requestStartRejectsCandidateWhoFailedCvScreening() {
        ownsApplication();
        application.setCvScreeningStatus(CvScreeningStatus.FAILED);
        when(interviews.findByApplication_IdOrderByIdDesc(7L)).thenReturn(List.of());
        assertThatThrownBy(() -> service.requestStart(7L))
                .isInstanceOfSatisfying(BusinessException.class, ex -> assertThat(ex.getCode()).isEqualTo("CV_SCREENING_NOT_PASSED"));
        verifyNoInteractions(invitations);
    }

    @Test void requestStartRejectsJobWithoutAiInterview() {
        ownsApplication();
        application.getJob().setAiInterviewEnabled(false);
        when(interviews.findByApplication_IdOrderByIdDesc(7L)).thenReturn(List.of());
        assertThatThrownBy(() -> service.requestStart(7L))
                .isInstanceOfSatisfying(BusinessException.class, ex -> assertThat(ex.getCode()).isEqualTo("AI_INTERVIEW_UNAVAILABLE"));
        verifyNoInteractions(invitations);
    }

    @Test void requestStartRejectsSomeoneElsesApplication() {
        when(access.actor()).thenReturn(user(99L));
        when(access.candidate()).thenReturn(true);
        when(applications.findById(7L)).thenReturn(Optional.of(application));
        assertThatThrownBy(() -> service.requestStart(7L))
                .isInstanceOfSatisfying(BusinessException.class, ex -> assertThat(ex.getCode()).isEqualTo("APPLICATION_NOT_FOUND"));
        verifyNoInteractions(interviews, invitations);
    }

    @Test void requestStartRejectsDuplicateAttemptAfterCompletion() {
        ownsApplication();
        interview.setStatus(AiInterviewStatus.FAILED);
        when(interviews.findByApplication_IdOrderByIdDesc(7L)).thenReturn(List.of(interview));
        assertThatThrownBy(() -> service.requestStart(7L))
                .isInstanceOfSatisfying(BusinessException.class, ex -> assertThat(ex.getCode()).isEqualTo("AI_INTERVIEW_ALREADY_COMPLETED"));
        verifyNoInteractions(invitations);
    }

    @Test void requestStartRequeuesFailedGenerationWithoutNewAttempt() {
        ownsApplicationAndInterview();
        interview.setStatus(AiInterviewStatus.ERROR);
        when(interviews.findByApplication_IdOrderByIdDesc(7L)).thenReturn(List.of(interview));
        when(questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(11L)).thenReturn(List.of());
        assertThat(service.requestStart(7L).status()).isEqualTo(AiInterviewStatus.GENERATING);
        verifyNoInteractions(invitations);
        verify(activity).record(eq(interview), eq("GENERATION_QUEUED"), anyString());
    }

    private static User user(long id) {
        User user = new User();
        user.setId(id);
        return user;
    }
}
