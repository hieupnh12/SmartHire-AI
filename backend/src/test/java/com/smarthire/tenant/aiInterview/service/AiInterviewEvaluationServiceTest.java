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

    @Test void plannedGenerationUsesOneCallForAllMiniQuestionsAndPreservesSlots() {
        plannedInterview();
        when(ai.generate(anyString(), any())).thenAnswer(call -> {
            com.fasterxml.jackson.databind.JsonNode request = call.getArgument(1);
            var output = mapper.createObjectNode();
            var rows = output.putArray("questions");
            for (var slot : request.path("slots")) {
                var row = rows.addObject().put("slot", slot.path("slot").asInt())
                        .put("questionText", "Question " + slot.path("slot").asInt());
                if (slot.path("kind").asText().equals("MCQ")) {
                    row.putArray("options").add("A").add("B").add("C").add("D");
                    row.put("correctOption", 1).put("explanation", "B is correct");
                } else {
                    row.put("referenceAnswer", "Model answer");
                    var points = row.putArray("keyPoints");
                    points.addObject().put("point", "JVM memory").put("target", "TECHNICAL_KNOWLEDGE");
                    points.addObject().put("point", "Java collections").put("target", "Java");
                }
            }
            return output;
        });
        service.process(11L);
        assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.QUESTIONS_READY);
        verify(ai, times(2)).generate(anyString(), any());
        verify(questions).saveAll(argThat(paper -> {
            var list = (List<AiQuestion>) paper;
            return list.size() == 4 && list.getFirst().getCorrectOption() == null
                    && InterviewRubric.hasReference(list.getFirst())
                    && list.subList(1, 4).stream().allMatch(q -> q.getCorrectOption() == 1 && !InterviewRubric.hasReference(q));
        }));
    }

    @Test void legacyAnswersAreGradedAgainstAKeyWrittenBeforeSeeingThem() {
        interview.setStatus(AiInterviewStatus.SCORING);
        interview.setPassingScoreSnapshot(new BigDecimal("70"));
        when(interviews.findByIdForUpdate(11L)).thenReturn(Optional.of(interview));
        var question = AiQuestion.builder().id(20L).aiInterview(interview).questionOrder(0).questionType("TECHNICAL")
                .questionText("Spring IoC hoạt động thế nào?").build();
        when(questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(11L)).thenReturn(List.of(question));
        when(answers.findByAiQuestion_IdIn(any())).thenReturn(List.of(
                AiAnswer.builder().id(30L).aiQuestion(question).answerText("adsfasdf").build()));
        when(ai.generate(anyString(), any())).thenAnswer(call -> {
            com.fasterxml.jackson.databind.JsonNode request = call.getArgument(1);
            var output = mapper.createObjectNode();
            if (request.has("questions")) {
                assertThat(request.toString()).doesNotContain("adsfasdf");
                var ref = output.putArray("references").addObject().put("questionId", 20).put("referenceAnswer", "Container quản lý bean");
                ref.putArray("keyPoints").add(mapper.createObjectNode().put("point", "Container tạo bean"))
                        .add(mapper.createObjectNode().put("point", "Inject dependency"));
            } else {
                // The provider claims credit with a quote the candidate never wrote.
                var row = output.putArray("evaluations").addObject().put("answerId", 30)
                        .put("feedback", "f").put("strengths", "s").put("weaknesses", "w");
                row.putArray("keyPoints").add(mapper.createObjectNode().put("index", 0).put("score", 90).put("evidence", "container tạo bean"));
            }
            return output;
        });

        service.process(11L);

        verify(ai, times(2)).generate(anyString(), any());
        assertThat(InterviewRubric.hasReference(question)).isTrue();
        assertThat(interview.getOverallScore()).isEqualByComparingTo("0");
        assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.FAILED);
    }

    @Test void providerFailureDoesNotBecomeACandidateZero() {
        interview.setStatus(AiInterviewStatus.SCORING);
        interview.setPassingScoreSnapshot(new BigDecimal("70"));
        when(interviews.findByIdForUpdate(11L)).thenReturn(Optional.of(interview));
        var question = AiQuestion.builder().id(20L).aiInterview(interview).questionText("Explain IoC").build();
        when(questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(11L)).thenReturn(List.of(question));
        when(answers.findByAiQuestion_IdIn(any())).thenReturn(List.of(
                AiAnswer.builder().id(30L).aiQuestion(question).answerText("answer").build()));
        when(ai.generate(anyString(), any())).thenThrow(new AiInterviewClient.ProviderException("HTTP 503"));
        service.process(11L);
        assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.ERROR);
        assertThat(interview.getOverallScore()).isNull();
        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.INTERVIEW);
        verify(feedbacks, never()).saveAll(any());
        verifyNoInteractions(history, notifications, emails);
    }

    @Test void blankOpenAnswerAndMiniQuestionsAreScoredWithoutAiCall() {
        plannedInterview();
        interview.setStatus(AiInterviewStatus.SCORING);
        var plan = InterviewRubric.plan(InterviewPolicies.config(interview).policy());
        var paper = java.util.stream.IntStream.range(0, 4).mapToObj(i -> AiQuestion.builder()
                .id(20L + i).aiInterview(interview).questionOrder(i).rubricJson(plan.get(i).toString())
                .correctOption(i == 0 ? null : 1).explanation("B is correct").build()).toList();
        var saved = java.util.stream.IntStream.range(0, 4).mapToObj(i -> AiAnswer.builder()
                .id(30L + i).aiQuestion(paper.get(i)).answerText(i == 0 ? "" : "1").build()).toList();
        when(questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(11L)).thenReturn(paper);
        when(answers.findByAiQuestion_IdIn(any())).thenReturn(saved);
        service.process(11L);
        assertThat(interview.getOverallScore()).isEqualByComparingTo("30");
        assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.FAILED);
        verifyNoInteractions(ai);
        verify(feedbacks).saveAll(argThat(rows -> ((List<?>) rows).size() == 4));
    }

    @Test void incompletePlannedGenerationDoesNotSavePartialPaper() {
        plannedInterview();
        when(ai.generate(anyString(), any())).thenReturn(mapper.createObjectNode().putArray("questions").addObject());
        service.process(11L);
        assertThat(interview.getStatus()).isEqualTo(AiInterviewStatus.ERROR);
        verify(questions, never()).saveAll(any());
        verifyNoInteractions(feedbacks);
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
}
