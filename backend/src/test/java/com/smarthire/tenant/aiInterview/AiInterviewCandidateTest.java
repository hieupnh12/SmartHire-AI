package com.smarthire.tenant.aiInterview;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.aiInterview.dto.request.UpsertAiAnswerRequest;
import com.smarthire.tenant.aiInterview.mapper.AiInterviewMapper;
import com.smarthire.tenant.aiInterview.service.AiInterviewService;
import com.smarthire.tenant.aiInterview.service.AiInterviewInvitationService;
import com.smarthire.tenant.cv.service.CvAccess;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.*;
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
    AiInterviewService service;
    User candidate;
    Application application;
    AiInterview interview;
    AiQuestion question;

    @BeforeEach void setup() {
        service = new AiInterviewService(interviews, questions, answers, feedbacks, applications, stages,
                new AiInterviewMapper(), access, invitations);
        candidate = user(9L);
        application = new Application();
        application.setId(7L);
        application.setCandidate(candidate);
        application.setStatus(ApplicationStatus.INTERVIEW);
        interview = AiInterview.builder().id(11L).application(application).status(AiInterviewStatus.QUESTIONS_READY).build();
        question = AiQuestion.builder().id(20L).aiInterview(interview).questionText("Explain transactions").build();
    }

    private void owned() {
        when(access.actor()).thenReturn(candidate);
        when(access.candidate()).thenReturn(true);
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
    }
    private static User user(long id) {
        User user = new User();
        user.setId(id);
        return user;
    }
}
