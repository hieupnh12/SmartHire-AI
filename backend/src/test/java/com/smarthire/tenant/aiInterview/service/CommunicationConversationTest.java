package com.smarthire.tenant.aiInterview.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.enums.*;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.aiInterview.ai.AiInterviewClient;
import com.smarthire.tenant.aiInterview.dto.request.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class CommunicationConversationTest {
    @Test void gradesFourCriteriaAndAdaptsNextMainQuestionUsingTheAnswer() throws Exception {
        var mapper = new ObjectMapper(); var runs = mock(AiInterviewProcessRunRepository.class);
        var questions = mock(AiQuestionRepository.class); var feedbacks = mock(AiFeedbackRepository.class); var ai = mock(AiInterviewClient.class);
        var engine = new AiInterviewProcessEngine(runs, questions, feedbacks, ai, mapper, mock(AiInterviewActivityLog.class));
        var job = new Job(); job.setTitle("Backend Developer"); var application = new Application(); application.setJob(job);
        var process = new InterviewPolicy.Process("COMMUNICATION", true, 1, 100, Map.of("questionCount", 2, "followUpEnabled", false, "adaptiveQuestions", true));
        var policy = InterviewPolicies.communicationPolicy(new InterviewPolicy(30, 1, false, 3, 0, 0,
                InterviewPolicies.communicationWeights(), List.of("Java"), List.of(), 2, "VOICE", null, null, List.of(process)));
        var interview = AiInterview.builder().id(1L).application(application).startedAt(java.time.Instant.now()).status(AiInterviewStatus.IN_PROGRESS)
                .configSnapshotJson(InterviewPolicies.json(new AiInterviewConfigRequest(true, java.math.BigDecimal.valueOf(70), 2, null, policy))).build();
        var run = AiInterviewProcessRun.builder().id(2L).aiInterview(interview).processKey("COMMUNICATION").status(AiInterviewProcessStatus.IN_PROGRESS)
                .mainQuestionTarget(2).mainQuestionGenerated(1).configSnapshotJson(InterviewPolicies.json(process)).build();
        var root = AiQuestion.builder().id(10L).aiInterview(interview).processRun(run).questionRole("MAIN").sequenceNo(0).questionOrder(0)
                .questionText("Explain your solution").rubricJson("{\"referenceAnswer\":\"solution\",\"keyPoints\":[\"one\",\"two\",\"three\"]}").build();
        when(questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(1L)).thenReturn(List.of(root));
        when(questions.findByProcessRun_IdOrderBySequenceNoAscIdAsc(2L)).thenReturn(List.of(root));
        when(ai.generate(anyString(), any())).thenAnswer(call -> {
            com.fasterxml.jackson.databind.JsonNode data = call.getArgument(1);
            if (data.has("answer")) return mapper.readTree("""
                {"keyPoints":[{"index":0,"score":100,"evidence":"solution"},{"index":1,"score":100,"evidence":"solution"},{"index":2,"score":100,"evidence":"solution"}],
                 "criteria":{"TECHNICAL_KNOWLEDGE":{"score":100,"evidence":"solution"},"PROBLEM_SOLVING":{"score":100,"evidence":"solution"},
                 "REASONING":{"score":100,"evidence":"invented quote"},"COMMUNICATION":{"score":100,"evidence":"solution"}},
                 "feedback":"Clear solution","strengths":"Clarity","weaknesses":"Reasoning unsupported"}
                """);
            assertThat(data.path("previousAnswer").asText()).isEqualTo("My solution");
            assertThat(data.path("questionCount").asInt()).isEqualTo(1);
            return mapper.readTree("""
                {"questions":[{"index":0,"questionType":"COMMUNICATION","difficulty":"medium","questionText":"Explain a trade-off of your solution",
                "referenceAnswer":"A trade-off","keyPoints":["one","two","three"]}]}
                """);
        });
        engine.answerSaved(interview, root, AiAnswer.builder().id(100L).aiQuestion(root).answerText("My solution").build(),
                new SpeechMetrics(5000, 4000, 1000, 1, 1200L));
        verify(feedbacks).save(argThat(f -> f.getScore().compareTo(java.math.BigDecimal.valueOf(75)) == 0
                && InterviewPolicies.tree(f.getEvaluationJson()).at("/speechMetrics/pauseCount").asInt() == 1));
        assertThat(run.getMainQuestionGenerated()).isEqualTo(2);
        assertThat(run.getMainQuestionCompleted()).isEqualTo(1);
        assertThat(run.getStatus()).isEqualTo(AiInterviewProcessStatus.IN_PROGRESS);
        verify(questions).saveAll(argThat(rows -> ((List<?>) rows).size() == 1));
    }
}
