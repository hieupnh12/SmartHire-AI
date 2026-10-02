package com.smarthire.tenant.aiInterview;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.CvScreeningStatus;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.aiInterview.dto.request.UpsertAiAnswerRequest;
import com.smarthire.tenant.aiInterview.mapper.AiInterviewMapper;
import com.smarthire.tenant.aiInterview.dto.request.AiInterviewConfigRequest;
import com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy;
import com.smarthire.tenant.aiInterview.service.AiInterviewActivityLog;
import com.smarthire.tenant.aiInterview.service.AiInterviewService;
import com.smarthire.tenant.aiInterview.service.AiInterviewInvitationService;
import com.smarthire.tenant.aiInterview.service.AiInterviewProcessEngine;
import com.smarthire.tenant.aiInterview.service.InterviewPolicies;
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
    @Mock AiInterviewProcessEngine processEngine;
    @Mock AiInterviewProcessRunRepository processRuns;
    @Mock AiInterviewConsentRepository consents;
    AiInterviewService service;
    User candidate;
    Application application;
    AiInterview interview;
    AiQuestion question;

    @BeforeEach void setup() {
        service = new AiInterviewService(interviews, questions, answers, feedbacks, applications, stages,
                new AiInterviewMapper(), access, invitations, activity, logs, processEngine, processRuns, consents);
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

    @Test void cannotStartBeforeAvailabilityWindow() {
        owned();
        interview.setConfigSnapshotJson(InterviewPolicies.json(new AiInterviewConfigRequest(
                true, new BigDecimal("70"), 1, java.time.Instant.now().plusSeconds(3600),
                java.time.Instant.now().plusSeconds(7200), InterviewPolicies.defaults())));
        when(questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(11L)).thenReturn(List.of(question));

        assertThatThrownBy(() -> service.start(11L))
                .isInstanceOfSatisfying(BusinessException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("AI_INTERVIEW_NOT_STARTED"));
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

    @Test void existingSnapshotSurvivesJobConfigurationChanges() {
        ownsApplicationAndInterview();
        InterviewPolicies.snapshot(interview);
        application.getJob().setAiInterviewEnabled(false);
        application.getJob().setAiInterviewPassingScore(new BigDecimal("99"));
        when(interviews.findByApplication_IdOrderByIdDesc(7L)).thenReturn(List.of(interview));
        when(questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(11L)).thenReturn(List.of(question));
        var response = service.requestStart(7L);
        assertThat(response.status()).isEqualTo(AiInterviewStatus.IN_PROGRESS);
        assertThat(response.passingScore()).isEqualByComparingTo("70");
        assertThat(response.expiresAt()).isNotNull();
    }

    @Test void lateAnswerSubmitsSavedPaperAndRejectsNewContent() {
        owned();
        InterviewPolicies.snapshot(interview);
        interview.setStatus(AiInterviewStatus.IN_PROGRESS);
        interview.setExpiresAt(java.time.Instant.now().minusSeconds(1));
        when(questions.findByIdAndAiInterview_Id(20L, 11L)).thenReturn(Optional.of(question));
        when(questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(11L)).thenReturn(List.of(question));
        assertThatThrownBy(() -> service.upsertAnswer(11L, 20L, new UpsertAiAnswerRequest("Late content", null, null)))
                .isInstanceOfSatisfying(BusinessException.class, ex -> assertThat(ex.getCode()).isEqualTo("AI_INTERVIEW_EXPIRED"));
        assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.SCORING);
        assertThat(interview.getCompletedAt()).isNotNull();
        verify(answers).save(argThat(answer -> "".equals(answer.getAnswerText())));
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

    @Test void plannedAttemptAcceptsBlankAnswersAsZero() {
        owned();
        interview.setStatus(AiInterviewStatus.IN_PROGRESS);
        interview.setConfigSnapshotJson(InterviewPolicies.json(new AiInterviewConfigRequest(
                true, new BigDecimal("70"), 1, null, InterviewPolicies.defaults())));
        when(questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(11L)).thenReturn(List.of(question));
        when(answers.save(any())).thenAnswer(call -> call.getArgument(0));
        assertThat(service.complete(11L).status()).isEqualTo(AiInterviewStatus.SCORING);
        verify(answers).save(argThat(answer -> "".equals(answer.getAnswerText())));
    }

    @Test void failedAttemptWithinLimitOpensAnotherAttempt() {
        ownsApplication();
        interview.setStatus(AiInterviewStatus.FAILED);
        interview.setAttemptNumber(1);
        var policy = new InterviewPolicy(30, 2, false, 3, 30, 0, InterviewPolicies.defaults().weights(), List.of(), List.of());
        interview.setConfigSnapshotJson(InterviewPolicies.json(new AiInterviewConfigRequest(true, new BigDecimal("70"), 1, null, policy)));
        var next = AiInterview.builder().id(12L).application(application).status(AiInterviewStatus.GENERATING).attemptNumber(2).build();
        when(interviews.findByApplication_IdOrderByIdDesc(7L)).thenReturn(List.of(interview));
        when(invitations.openNextAttempt(7L)).thenReturn(next);
        assertThat(service.requestStart(7L).id()).isEqualTo(12L);
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

    private void staffEditsQuestions() {
        when(access.actor()).thenReturn(candidate);
        when(access.staff()).thenReturn(true);
        when(interviews.findByIdForUpdate(11L)).thenReturn(Optional.of(interview));
        application.getJob().setAiInterviewQuestionCount(5);
    }

    @Test void addingLastRequiredQuestionAutomaticallyMakesSessionReady() {
        staffEditsQuestions();
        interview.setStatus(AiInterviewStatus.CREATED);
        when(questions.save(any())).thenAnswer(call -> call.getArgument(0));
        when(questions.countByAiInterview_Id(11L)).thenReturn(5L);
        service.addQuestion(11L, new com.smarthire.tenant.aiInterview.dto.request.AiQuestionRequest("Explain isolation", "TECHNICAL", 4));
        assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.QUESTIONS_READY);
        verify(activity).record(eq(interview), eq("QUESTION_STATUS_UPDATED"), anyString());
    }

    @Test void incompleteQuestionSetRemainsPreparing() {
        staffEditsQuestions();
        interview.setStatus(AiInterviewStatus.CREATED);
        when(questions.save(any())).thenAnswer(call -> call.getArgument(0));
        when(questions.countByAiInterview_Id(11L)).thenReturn(4L);
        service.addQuestion(11L, new com.smarthire.tenant.aiInterview.dto.request.AiQuestionRequest("Explain locks", "TECHNICAL", 3));
        assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.CREATED);
    }

    @Test void deletingQuestionAutomaticallyRevokesReadiness() {
        staffEditsQuestions();
        when(questions.findByIdAndAiInterview_Id(20L, 11L)).thenReturn(Optional.of(question));
        when(questions.countByAiInterview_Id(11L)).thenReturn(4L);
        service.deleteQuestion(11L, 20L);
        assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.CREATED);
    }

    @Test void candidateCannotReadQuestionsBeforeStartingButSeesRoadmap() {
        asCandidate();
        var policy = new InterviewPolicy(25, 1, true, 3, 30, 1, InterviewPolicies.defaults().weights(), List.of("Java"),
                List.of(new InterviewPolicy.Stage("Java Core", 2, List.of("TECHNICAL_KNOWLEDGE", "PROBLEM_SOLVING",
                        "PRACTICAL_EXPERIENCE", "BEHAVIORAL_SITUATIONAL"), List.of("Java"))));
        interview.setConfigSnapshotJson(InterviewPolicies.json(new AiInterviewConfigRequest(true, new BigDecimal("70"), 2, null, policy)));
        when(interviews.findById(11L)).thenReturn(Optional.of(interview));
        var response = service.get(11L);
        assertThat(response.questions()).isEmpty();
        verifyNoInteractions(questions);
        assertThat(response.durationMinutes()).isEqualTo(25);
        assertThat(response.roadmap()).extracting(r -> r.title() + ":" + r.kind() + ":" + r.questionCount())
                .containsExactly("Java Core:OPEN:2", "Mini Assessment:MCQ:3");
    }

    @Test void processEngineSessionExposesAllConfiguredProcessesAsRoadmap() {
        asCandidate();
        var processes = List.of(
                process("TECHNICAL_KNOWLEDGE", 1, 10), process("PROBLEM_SOLVING", 2, 2),
                process("PRACTICAL_EXPERIENCE", 3, 3), process("TECHNICAL_REASONING", 4, 3),
                process("BEHAVIORAL_SITUATIONAL", 5, 4), process("COMMUNICATION", 6, 3));
        var defaults = InterviewPolicies.defaults();
        var policy = new InterviewPolicy(30, 1, false, 3, 30, 0, defaults.weights(), List.of(), List.of(),
                2, "TEXT", null, null, processes);
        interview.setConfigSnapshotJson(InterviewPolicies.json(new AiInterviewConfigRequest(true, new BigDecimal("70"), 25, null, policy)));
        when(interviews.findById(11L)).thenReturn(Optional.of(interview));

        var response = service.get(11L);

        assertThat(response.roadmap()).extracting(r -> r.title() + ":" + r.questionCount()).containsExactly(
                "Technical Knowledge:10", "Problem Solving:2", "Practical Experience:3",
                "Technical Reasoning:3", "Behavioral / Situational:4", "Communication:3");
    }

    private static InterviewPolicy.Process process(String key, int order, int questionCount) {
        return new InterviewPolicy.Process(key, true, order, 10, java.util.Map.of("questionCount", questionCount));
    }

    @Test void processQuestionIsMappedBackToItsRoadmapStage() {
        question.setRubricJson("{\"processKey\":\"PROBLEM_SOLVING\"}");
        var response = new AiInterviewMapper().toQuestion(question, null, null);
        assertThat(response.stageTitle()).isEqualTo("Problem Solving");
    }

    @Test void miniAssessmentAnswerMustBeAnOptionIndex() {
        owned();
        interview.setStatus(AiInterviewStatus.IN_PROGRESS);
        question.setCorrectOption(2);
        when(questions.findByIdAndAiInterview_Id(20L, 11L)).thenReturn(Optional.of(question));
        assertThatThrownBy(() -> service.upsertAnswer(11L, 20L, new UpsertAiAnswerRequest("C", null, null)))
                .isInstanceOfSatisfying(BusinessException.class, ex -> assertThat(ex.getCode()).isEqualTo("AI_ANSWER_BAD_OPTION"));
        verify(answers, never()).save(any());
    }

    @Test void plannedSessionRejectsManualQuestionStructureChanges() {
        staffEditsQuestions();
        interview.setConfigSnapshotJson(InterviewPolicies.json(new AiInterviewConfigRequest(
                true, new BigDecimal("70"), 1, null, InterviewPolicies.defaults())));
        assertThatThrownBy(() -> service.addQuestion(11L, new com.smarthire.tenant.aiInterview.dto.request.AiQuestionRequest("Extra", "TECHNICAL", 9)))
                .isInstanceOfSatisfying(BusinessException.class, ex -> assertThat(ex.getCode()).isEqualTo("AI_INTERVIEW_PLANNED"));
        assertThatThrownBy(() -> service.deleteQuestion(11L, 20L))
                .isInstanceOfSatisfying(BusinessException.class, ex -> assertThat(ex.getCode()).isEqualTo("AI_INTERVIEW_PLANNED"));
        verify(questions, never()).save(any());
        verify(questions, never()).delete(any());
    }

    @Test void cannotManuallyChangeSessionStatus() {
        staffEditsQuestions();
        var request = new com.smarthire.tenant.aiInterview.dto.request.UpdateAiInterviewRequest(
                null, AiInterviewStatus.QUESTIONS_READY, null, null, null);
        assertThatThrownBy(() -> service.update(11L, request)).isInstanceOfSatisfying(BusinessException.class,
                ex -> assertThat(ex.getCode()).isEqualTo("AI_INTERVIEW_SYSTEM_MANAGED"));
        verifyNoInteractions(questions);
    }
}
