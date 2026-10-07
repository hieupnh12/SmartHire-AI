package com.smarthire.tenant.aiInterview.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.CvScreeningStatus;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.aiInterview.ai.AiInterviewClient;
import com.smarthire.tenant.notification.service.NotificationPreferenceService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiInterviewEvaluationServiceTest {
    @Mock AiInterviewRepository interviews;
    @Mock AiQuestionRepository questions;
    @Mock AiAnswerRepository answers;
    @Mock AiFeedbackRepository feedbacks;
    @Mock JobSkillRepository skills;
    @Mock CvRepository cvs;
    @Mock CvExtractionRepository extractions;
    @Mock ApplicationStatusHistoryRepository history;
    @Mock RecruitmentStageRepository stages;
    @Mock NotificationRepository notifications;
    @Mock EmailOutboxRepository emails;
    @Mock JobTestRepository tests;
    @Mock AiInterviewClient ai;
    @Mock AiInterviewActivityLog activity;
    @Mock AiInterviewProcessEngine processEngine;
    @Mock InterviewConversationService conversation;
    @Mock NotificationPreferenceService preferences;
    final ObjectMapper mapper = new ObjectMapper();
    AiInterviewEvaluationService service;
    Application application;
    AiInterview interview;

    @BeforeEach void setup() {
        service = new AiInterviewEvaluationService(interviews, questions, answers, feedbacks, skills, cvs, extractions,
                history, stages, notifications, emails, tests, ai, mapper, activity, processEngine, conversation, preferences);
        var job = new Job();
        job.setId(13L);
        job.setTitle("Java Backend Developer");
        job.setAiInterviewEnabled(true);
        job.setAiInterviewQuestionCount(5);
        var candidate = new User();
        candidate.setId(9L);
        candidate.setEmail("candidate@example.com");
        application = new Application();
        application.setId(7L);
        application.setJob(job);
        application.setCandidate(candidate);
        application.setStatus(ApplicationStatus.INTERVIEW);
        application.setCvScreeningStatus(CvScreeningStatus.PASSED);
        interview = AiInterview.builder().id(11L).application(application).status(AiInterviewStatus.GENERATING).build();
    }

    private void plannedInterview() {
        var policy = new com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy(30, 1, true, 3, 30, 1,
                java.util.Map.of("TECHNICAL_KNOWLEDGE", 100, "PROBLEM_SOLVING", 0, "PRACTICAL_EXPERIENCE", 0,
                        "COMMUNICATION", 0, "BEHAVIORAL_SITUATIONAL", 0), List.of("Java"),
                List.of(new com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy.Stage("Java", 1,
                        List.of("TECHNICAL_KNOWLEDGE"), List.of("Java"))));
        interview.setConfigSnapshotJson(InterviewPolicies.json(new com.smarthire.tenant.aiInterview.dto.request.AiInterviewConfigRequest(
                true, new BigDecimal("70"), 1, null, policy)));
        interview.setPassingScoreSnapshot(new BigDecimal("70"));
        when(interviews.findByIdForUpdate(11L)).thenReturn(Optional.of(interview));
    }

    @Test void miniAssessmentGenerationIsBlocked() {
        plannedInterview();
        service.process(11L);
        assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.ERROR);
        assertThat(interview.getOverallScore()).isNull();
        verifyNoInteractions(ai, questions, answers, feedbacks, history, notifications, emails);
    }

    @Test void legacyScoringIsBlocked() {
        when(interviews.findByIdForUpdate(11L)).thenReturn(Optional.of(interview));
        interview.setStatus(AiInterviewStatus.SCORING);
        service.process(11L);
        assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.ERROR);
        assertThat(interview.getOverallScore()).isNull();
        verifyNoInteractions(ai, questions, answers, feedbacks, history, notifications, emails);
    }

    @Test void communicationProviderFailureDoesNotBecomeACandidateZero() {
        legacySnapshot(interview);
        when(interviews.findByIdForUpdate(11L)).thenReturn(Optional.of(interview));
        doThrow(new AiInterviewClient.ProviderException("HTTP 503")).when(processEngine).initializeAndGenerateFirst(interview);
        service.process(11L);
        assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.ERROR);
        assertThat(interview.getOverallScore()).isNull();
        verifyNoInteractions(feedbacks, history, notifications, emails);
    }





    @Test void unsnapshottedGenerationIsBlocked() {
        when(interviews.findByIdForUpdate(11L)).thenReturn(Optional.of(interview));
        service.process(11L);
        assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.ERROR);
        assertThat(interview.getOverallScore()).isNull();
        verifyNoInteractions(ai, questions, answers, feedbacks, history, notifications, emails);
    }



    @Test void passingScoreMovesApplicationToAssessment() {
        interview.setStatus(AiInterviewStatus.SCORING);
        interview.setPassingScoreSnapshot(new BigDecimal("70.00"));

        service.finish(interview, new BigDecimal("78.00"));

        assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.PASSED);
        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.ASSESSMENT);
        var row = ArgumentCaptor.forClass(ApplicationStatusHistory.class);
        verify(history).save(row.capture());
        assertThat(row.getValue().getFromStatus()).isEqualTo("INTERVIEW");
        assertThat(row.getValue().getToStatus()).isEqualTo("ASSESSMENT");
        verify(notifications).save(any());
        verify(emails).save(any());
        verify(activity).record(eq(interview), eq("ASSESSMENT_UNLOCKED"), anyString());
    }

    @Test void scoreBelowThresholdFailsApplication() {
        interview.setStatus(AiInterviewStatus.SCORING);
        interview.setPassingScoreSnapshot(new BigDecimal("70.00"));

        service.finish(interview, new BigDecimal("60.00"));

        assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.FAILED);
        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.FAILED);
        verify(history).save(any());
        verify(emails).save(any());
        verify(activity, never()).record(eq(interview), eq("ASSESSMENT_UNLOCKED"), anyString());
    }

    @Test void failedAttemptWithRetryLeftKeepsApplicationOpenUntilDeadline() {
        var deadline = java.time.Instant.now().plusSeconds(3600);
        var policy = new com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy(30, 2, false, 3, 30, 0,
                InterviewPolicies.defaults().weights(), List.of(), List.of());
        interview.setStatus(AiInterviewStatus.SCORING);
        interview.setPassingScoreSnapshot(new BigDecimal("70.00"));
        interview.setConfigSnapshotJson(InterviewPolicies.json(new com.smarthire.tenant.aiInterview.dto.request.AiInterviewConfigRequest(
                true, new BigDecimal("70.00"), 1, deadline, policy)));

        service.finish(interview, new BigDecimal("60.00"));
        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.INTERVIEW);

        // Once the retry deadline has passed the latest failed attempt closes the application.
        interview.setConfigSnapshotJson(InterviewPolicies.json(new com.smarthire.tenant.aiInterview.dto.request.AiInterviewConfigRequest(
                true, new BigDecimal("70.00"), 1, java.time.Instant.now().minusSeconds(1), policy)));
        when(interviews.findByStatusAndApplication_StatusOrderByIdAsc(AiInterviewStatus.FAILED, ApplicationStatus.INTERVIEW))
                .thenReturn(List.of(interview));
        when(interviews.findByApplication_IdOrderByIdDesc(7L)).thenReturn(List.of(interview));
        service.closeExhaustedRetries();
        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.FAILED);
        verify(history, times(2)).save(any());
    }

    @Test void communicationScoringUsesFullWeight() {
        var weights = java.util.Map.of("TECHNICAL_KNOWLEDGE", 0, "PROBLEM_SOLVING", 0,
                "PRACTICAL_EXPERIENCE", 0, "COMMUNICATION", 100, "BEHAVIORAL_SITUATIONAL", 0);
        var processes = List.of(new com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy.Process("COMMUNICATION", true, 1, 100, java.util.Map.of("questionCount", 1)));
        var policy = new com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy(30, 1, false, 3, 30, 0,
                weights, List.of(), List.of(), 2, "TEXT", null, null, processes);
        interview.setConfigSnapshotJson(InterviewPolicies.json(new com.smarthire.tenant.aiInterview.dto.request.AiInterviewConfigRequest(true, new BigDecimal("70"), 2, null, policy)));
        interview.setPassingScoreSnapshot(new BigDecimal("70")); interview.setStatus(AiInterviewStatus.SCORING);
        var run = AiInterviewProcessRun.builder().processKey("COMMUNICATION").build();
        var question = AiQuestion.builder().id(1L).processRun(run).build();
        var answer = AiAnswer.builder().id(10L).aiQuestion(question).answerText("Answer").build();
        var feedback = AiFeedback.builder().aiAnswer(answer).score(new BigDecimal("100")).build();
        when(interviews.findByIdForUpdate(11L)).thenReturn(Optional.of(interview));
        when(questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(11L)).thenReturn(List.of(question));
        when(answers.findByAiQuestion_IdIn(List.of(1L))).thenReturn(List.of(answer));
        when(feedbacks.findByAiAnswer_IdIn(List.of(10L))).thenReturn(List.of(feedback));
        service.process(11L);
        assertThat(interview.getOverallScore()).isEqualByComparingTo("100");
        assertThat(InterviewPolicies.tree(interview.getReportJson()).at("/competencies/PROBLEM_SOLVING").decimalValue()).isEqualByComparingTo("0");
        verifyNoInteractions(ai);
    }

    @Test void unaskedAdaptiveTopicsCountAsZeroWhenSubmittedEarly() {
        var weights = java.util.Map.of("TECHNICAL_KNOWLEDGE", 0, "PROBLEM_SOLVING", 0,
                "PRACTICAL_EXPERIENCE", 0, "COMMUNICATION", 100, "BEHAVIORAL_SITUATIONAL", 0);
        var processes = List.of(new com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy.Process("COMMUNICATION", true, 1, 100, java.util.Map.of("questionCount", 2)));
        var policy = new com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy(30, 1, false, 3, 30, 0,
                weights, List.of(), List.of(), 2, "TEXT", null, null, processes);
        interview.setConfigSnapshotJson(InterviewPolicies.json(new com.smarthire.tenant.aiInterview.dto.request.AiInterviewConfigRequest(true, new BigDecimal("70"), 2, null, policy)));
        interview.setPassingScoreSnapshot(new BigDecimal("70")); interview.setStatus(AiInterviewStatus.SCORING);
        var run = AiInterviewProcessRun.builder().processKey("COMMUNICATION").build();
        var question = AiQuestion.builder().id(1L).processRun(run).build();
        var answer = AiAnswer.builder().id(10L).aiQuestion(question).answerText("Answer").build();
        var feedback = AiFeedback.builder().aiAnswer(answer).score(new BigDecimal("100")).build();
        when(interviews.findByIdForUpdate(11L)).thenReturn(Optional.of(interview));
        when(questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(11L)).thenReturn(List.of(question));
        when(answers.findByAiQuestion_IdIn(List.of(1L))).thenReturn(List.of(answer));
        when(feedbacks.findByAiAnswer_IdIn(List.of(10L))).thenReturn(List.of(feedback));
        service.process(11L);
        assertThat(interview.getOverallScore()).isEqualByComparingTo("50");
        assertThat(InterviewPolicies.tree(interview.getReportJson()).at("/competencies/PROBLEM_SOLVING").decimalValue()).isEqualByComparingTo("0");
        verifyNoInteractions(ai);
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.NullAndEmptySource
    @org.junit.jupiter.params.provider.ValueSource(strings = {"   ", "\t\n", "Answer"})
    void communicationSubmissionHandlesBlankAndMissingEvaluation(String text) {
        legacySnapshot(interview);
        interview.setStatus(AiInterviewStatus.SCORING);
        var run = AiInterviewProcessRun.builder().processKey("COMMUNICATION").build();
        var question = AiQuestion.builder().id(1L).processRun(run).build();
        var answer = AiAnswer.builder().id(10L).aiQuestion(question).answerText(text).build();
        when(interviews.findByIdForUpdate(11L)).thenReturn(Optional.of(interview));
        when(questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(11L)).thenReturn(List.of(question));
        when(answers.findByAiQuestion_IdIn(List.of(1L))).thenReturn(List.of(answer));

        service.process(11L);

        if (text != null && !text.isBlank()) {
            assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.ERROR);
            assertThat(interview.getOverallScore()).isNull();
            verify(feedbacks, never()).save(any());
        } else {
            assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.FAILED);
            assertThat(interview.getOverallScore()).isEqualByComparingTo("0");
            assertThat(interview.getErrorMessage()).isNull();
            verify(feedbacks).save(argThat(f -> f.getScore().signum() == 0));
        }
        verifyNoInteractions(ai);
    }

    @Test void missingCommunicationAnswerScoresZeroWithoutProvider() {
        legacySnapshot(interview);
        interview.setStatus(AiInterviewStatus.SCORING);
        var run = AiInterviewProcessRun.builder().processKey("COMMUNICATION").build();
        var question = AiQuestion.builder().id(1L).processRun(run).build();
        when(interviews.findByIdForUpdate(11L)).thenReturn(Optional.of(interview));
        when(questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(11L)).thenReturn(List.of(question));
        when(answers.save(any())).thenAnswer(call -> {
            AiAnswer answer = call.getArgument(0);
            answer.setId(10L);
            return answer;
        });

        service.process(11L);

        assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.FAILED);
        assertThat(interview.getOverallScore()).isEqualByComparingTo("0");
        verify(answers).save(argThat(a -> a.getAiQuestion() == question && a.getAnswerText().isEmpty()));
        verify(feedbacks).save(argThat(f -> f.getScore().signum() == 0));
        verifyNoInteractions(ai);
    }

    @Test void newConversationPreparationDoesNotGenerateAPaper() {
        InterviewPolicies.snapshot(interview);
        when(interviews.findByIdForUpdate(11L)).thenReturn(Optional.of(interview));
        service.process(11L);
        assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.QUESTIONS_READY);
        assertThat(interview.getContextSnapshotJson()).contains("Java Backend Developer");
        verifyNoInteractions(ai, processEngine, conversation, questions, answers, feedbacks);
    }

    @Test void postSessionProviderErrorIsRetryableAndNeverCandidateZero() {
        InterviewPolicies.snapshot(interview); interview.setStatus(AiInterviewStatus.SCORING);
        interview.setCompletedAt(java.time.Instant.now());
        when(interviews.findByIdForUpdate(11L)).thenReturn(Optional.of(interview));
        when(conversation.evaluate(interview)).thenThrow(new AiInterviewClient.ProviderException("HTTP 503"));
        service.process(11L);
        assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.ERROR);
        assertThat(interview.getOverallScore()).isNull();
        verifyNoInteractions(feedbacks, history, notifications, emails, ai, processEngine);
    }

    private static void legacySnapshot(AiInterview interview) {
        InterviewPolicies.snapshot(interview);
        var snapshot = (com.fasterxml.jackson.databind.node.ObjectNode) InterviewPolicies.tree(interview.getConfigSnapshotJson());
        snapshot.remove("conversationVersion");
        interview.setConfigSnapshotJson(snapshot.toString());
    }

}
