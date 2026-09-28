package com.smarthire.tenant.aiInterview.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.CvScreeningStatus;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.aiInterview.ai.AiInterviewClient;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
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
    final ObjectMapper mapper = new ObjectMapper();
    AiInterviewEvaluationService service;
    Application application;
    AiInterview interview;

    @BeforeEach void setup() {
        service = new AiInterviewEvaluationService(interviews, questions, answers, feedbacks, skills, cvs, extractions,
                history, stages, notifications, emails, tests, ai, mapper, activity);
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

    private ObjectNode questionBatch(int from, int count) {
        var root = mapper.createObjectNode();
        var rows = root.putArray("questions");
        for (int i = 0; i < count; i++) rows.addObject().put("questionText", "Question " + (from + i)).put("questionType", "TECHNICAL");
        return root;
    }

    @Test void generatesFiveUniqueQuestionsInOneCall() {
        when(interviews.findByIdForUpdate(11L)).thenReturn(Optional.of(interview));
        var counter = new AtomicInteger();
        when(ai.generate(anyString(), any())).thenAnswer(call -> questionBatch(counter.getAndAdd(10), 10));

        service.process(11L);

        assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.QUESTIONS_READY);
        verify(ai, times(1)).generate(anyString(), any());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<AiQuestion>> saved = ArgumentCaptor.forClass(List.class);
        verify(questions).saveAll(saved.capture());
        assertThat(saved.getValue()).hasSize(5);
        assertThat(saved.getValue()).extracting(AiQuestion::getQuestionOrder).containsExactlyElementsOf(
                java.util.stream.IntStream.range(0, 5).boxed().toList());
        verify(activity).record(eq(interview), eq("QUESTIONS_GENERATED"), contains("5"));
        verify(notifications).save(any());
    }

    @Test void duplicateQuestionsFromProviderEndInErrorWithoutSaving() {
        when(interviews.findByIdForUpdate(11L)).thenReturn(Optional.of(interview));
        when(ai.generate(anyString(), any())).thenAnswer(call -> questionBatch(0, 3));

        service.process(11L);

        assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.ERROR);
        verify(questions, never()).saveAll(any());
        verify(activity).record(eq(interview), eq("GENERATION_FAILED"), contains("3/5"));
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
}
