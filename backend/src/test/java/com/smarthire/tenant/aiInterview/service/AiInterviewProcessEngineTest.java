package com.smarthire.tenant.aiInterview.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.enums.AiInterviewProcessStatus;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.aiInterview.ai.AiInterviewClient;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiInterviewProcessEngineTest {
    @Test void failedGenerationRetriesTheSameSnapshotAndRecoversStuckRuns() throws Exception {
        var mapper = new ObjectMapper();
        var runs = mock(AiInterviewProcessRunRepository.class);
        var questions = mock(AiQuestionRepository.class);
        var ai = mock(AiInterviewClient.class);
        var engine = new AiInterviewProcessEngine(runs, questions, mock(AiFeedbackRepository.class), ai,
                mapper, mock(AiInterviewActivityLog.class));
        var job = new Job(); job.setTitle("Java Developer");
        var application = new Application(); application.setJob(job);
        var interview = AiInterview.builder().id(1L).application(application).status(com.smarthire.domain.enums.AiInterviewStatus.GENERATING).configSnapshotJson("""
                {"policy":{"schemaVersion":2,"selectedSkills":["Java"],"processes":[{"key":"COMMUNICATION",
                "enabled":true,"order":1,"weight":100,"config":{"questionCount":1,"selectedSkills":["Java"]}}]}}
                """).build();
        var run = AiInterviewProcessRun.builder().id(2L).aiInterview(interview).processKey("COMMUNICATION")
                .mainQuestionTarget(1).status(AiInterviewProcessStatus.READY)
                .configSnapshotJson("{\"config\":{\"questionCount\":1,\"selectedSkills\":[\"Java\"]}}").build();
        var old = AiQuestion.builder().id(3L).processRun(run).questionText("Outdated draft").build();
        when(questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(1L)).thenReturn(List.of(old));
        when(runs.findByAiInterview_IdOrderByProcessOrderAsc(1L)).thenReturn(List.of(run));
        when(runs.findFirstByAiInterview_IdAndStatusOrderByProcessOrderAsc(1L, AiInterviewProcessStatus.PENDING))
                .thenAnswer(call -> run.getStatus() == AiInterviewProcessStatus.PENDING ? Optional.of(run) : Optional.empty());
        when(ai.generate(anyString(), any())).thenThrow(new AiInterviewClient.ProviderException("AI unavailable"))
                .thenReturn(mapper.readTree("""
                    {"questions":[{"index":0,"difficulty":"medium","questionText":"Explain dependency injection","questionType":"COMMUNICATION",
                    "referenceAnswer":"Dependencies are supplied externally","keyPoints":["Constructor","Container","Lifecycle"]}]}
                    """));
        assertThatThrownBy(() -> engine.initializeAndGenerateFirst(interview)).isInstanceOf(AiInterviewClient.ProviderException.class);
        assertThat(run.getStatus()).isEqualTo(AiInterviewProcessStatus.PENDING);
        verify(questions, never()).saveAll(any());
        verify(questions, never()).deleteAll(any());
        run.setStatus(AiInterviewProcessStatus.GENERATING);
        engine.initializeAndGenerateFirst(interview);
        assertThat(run.getStatus()).isEqualTo(AiInterviewProcessStatus.READY);
        assertThat(run.getMainQuestionGenerated()).isEqualTo(1);
        var changes = inOrder(questions); changes.verify(questions).deleteAll(List.of(old)); changes.verify(questions).saveAll(any());
        verify(runs, never()).save(any());
        verify(ai, times(2)).generate(anyString(), argThat(data -> data.path("questionCount").asInt() == 1
                && data.at("/commonConfiguration/selectedSkills/0").asText().equals("Java")));
    }

    @Test void generationFailureAllowsWorkerToCommitErrorStatus() throws Exception {
        var attribute = new AnnotationTransactionAttributeSource().getTransactionAttribute(
                AiInterviewProcessEngine.class.getMethod("initializeAndGenerateFirst", AiInterview.class),
                AiInterviewProcessEngine.class);
        assertThat(attribute).isNotNull();
        assertThat(attribute.rollbackOn(new AiInterviewClient.ProviderException("AI unavailable"))).isFalse();
        assertThat(attribute.rollbackOn(new IllegalStateException("Invalid process question count"))).isFalse();
    }

    @Test void followUpsUseTheAnswerRespectDepthAndCompleteTheProcessAfterTheChain() throws Exception {
        var mapper = new ObjectMapper();
        var runs = mock(AiInterviewProcessRunRepository.class); var questions = mock(AiQuestionRepository.class);
        var feedbacks = mock(AiFeedbackRepository.class); var ai = mock(AiInterviewClient.class);
        var engine = new AiInterviewProcessEngine(runs, questions, feedbacks, ai, mapper, mock(AiInterviewActivityLog.class));
        var interview = AiInterview.builder().id(1L).startedAt(java.time.Instant.now()).contextSnapshotJson("{\"jobTitle\":\"Java Developer\",\"jobDescription\":\"Backend role\"}").configSnapshotJson("""
                {"policy":{"schemaVersion":2,"selectedSkills":["Java"],"processes":[{"key":"PROBLEM_SOLVING","enabled":true,
                "order":1,"weight":100,"config":{"questionCount":1,"followUpEnabled":true,"maxFollowUp":2}}]}}
                """).build();
        var run = AiInterviewProcessRun.builder().id(2L).aiInterview(interview).processKey("PROBLEM_SOLVING")
                .status(AiInterviewProcessStatus.IN_PROGRESS).mainQuestionTarget(1)
                .configSnapshotJson("{\"key\":\"PROBLEM_SOLVING\",\"config\":{\"questionCount\":1,\"followUpEnabled\":true,\"maxFollowUp\":2}}").build();
        var root = AiQuestion.builder().id(10L).aiInterview(interview).processRun(run).questionText("Initial question")
                .sequenceNo(10).questionRole("MAIN").rubricJson("{\"referenceAnswer\":\"Constructor injection\",\"keyPoints\":[\"one\",\"two\",\"three\"]}").build();
        var paper = new java.util.ArrayList<AiQuestion>(); paper.add(root);
        var graded = new java.util.HashMap<Long, AiFeedback>();
        when(questions.findByProcessRun_IdOrderBySequenceNoAscIdAsc(2L)).thenAnswer(call -> paper);
        when(questions.save(any())).thenAnswer(call -> { AiQuestion q = call.getArgument(0); q.setId(10L + paper.size()); paper.add(q); return q; });
        when(feedbacks.findByAiAnswer_Id(anyLong())).thenAnswer(call -> Optional.ofNullable(graded.get(call.getArgument(0))));
        when(feedbacks.save(any())).thenAnswer(call -> { AiFeedback f = call.getArgument(0); graded.put(f.getAiAnswer().getId(), f); return f; });
        org.mockito.stubbing.Answer<com.fasterxml.jackson.databind.JsonNode> response = call -> {
            com.fasterxml.jackson.databind.JsonNode data = call.getArgument(1);
            if (data.has("answer")) return mapper.readTree("""
                {"keyPoints":[{"index":0,"score":80,"evidence":"constructor"},{"index":1,"score":80,"evidence":"constructor"},
                {"index":2,"score":80,"evidence":"constructor"}],"feedback":"Evidence reviewed","strengths":"Explains constructor","weaknesses":"Needs detail"}
                """);
            assertThat(data.path("candidateAnswer").asText()).contains("constructor");
            var output = mapper.createObjectNode(); var row = output.putArray("questions").addObject();
            row.put("index", 0).put("questionType", "SCENARIO").put("difficulty", "medium")
                    .put("questionText", "Follow-up " + paper.size()).put("referenceAnswer", "Constructor injection");
            row.putArray("keyPoints").add("one").add("two").add("three"); return output;
        };
        when(ai.generate(anyString(), any())).thenAnswer(response);
        when(ai.evaluate(anyString(), any())).thenAnswer(response);
        for (int index = 0; index < 3; index++) engine.answerSaved(interview, paper.get(index),
                AiAnswer.builder().id(100L + index).aiQuestion(paper.get(index)).answerText("I use constructor injection").build());
        assertThat(paper).hasSize(3); assertThat(run.getFollowUpCount()).isEqualTo(2);
        assertThat(run.getMainQuestionCompleted()).isEqualTo(1); assertThat(run.getStatus()).isEqualTo(AiInterviewProcessStatus.COMPLETED);
        assertThat(interview.getStatus()).isEqualTo(com.smarthire.domain.enums.AiInterviewStatus.SCORING);
        assertThat(paper.get(1).getSequenceNo()).isEqualTo(11); assertThat(paper.get(2).getSequenceNo()).isEqualTo(12);
        assertThat(paper.get(2).getParentQuestion()).isSameAs(root);
    }

    @Test void choiceWithoutRequiredExplanationIsGradedWithoutCallingAi() {
        var runs = mock(AiInterviewProcessRunRepository.class); var questions = mock(AiQuestionRepository.class);
        var feedbacks = mock(AiFeedbackRepository.class); var ai = mock(AiInterviewClient.class);
        var engine = new AiInterviewProcessEngine(runs, questions, feedbacks, ai, new ObjectMapper(), mock(AiInterviewActivityLog.class));
        var interview = AiInterview.builder().configSnapshotJson("{\"policy\":{\"schemaVersion\":2,\"processes\":[{\"key\":\"TECHNICAL_KNOWLEDGE\"}]}}").build();
        var run = AiInterviewProcessRun.builder().processKey("TECHNICAL_KNOWLEDGE").status(AiInterviewProcessStatus.IN_PROGRESS).mainQuestionTarget(2).build();
        var question = AiQuestion.builder().processRun(run).optionsJson("[\"A\",\"B\",\"C\",\"D\"]").questionRole("MAIN")
                .rubricJson("{\"kind\":\"MULTIPLE_CHOICE\",\"correctOptions\":[1,2],\"explanationRequired\":false}").build();
        var answer = AiAnswer.builder().id(1L).aiQuestion(question).answerText("{\"selectedOptions\":[2,1]}").build();
        engine.answerSaved(interview, question, answer);
        var capture = org.mockito.ArgumentCaptor.forClass(AiFeedback.class); verify(feedbacks).save(capture.capture());
        assertThat(capture.getValue().getScore()).isEqualByComparingTo("100"); verifyNoInteractions(ai);
    }
}
