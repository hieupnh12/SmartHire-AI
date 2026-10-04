package com.smarthire.tenant.aiInterview.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smarthire.domain.enums.*;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.aiInterview.ai.InterviewConversationClient;
import com.smarthire.tenant.aiInterview.dto.request.ConversationTurnRequest;
import com.smarthire.tenant.cv.service.CvAccess;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InterviewConversationServiceTest {
    @Mock AiInterviewRepository interviews; @Mock InterviewSessionRepository sessions;
    @Mock InterviewMessageRepository messages; @Mock AiInterviewConsentRepository consents;
    @Mock CvAccess access; @Mock InterviewConversationClient ai;
    ObjectMapper mapper = new ObjectMapper(); InterviewConversationService service;
    AiInterview interview; InterviewSession session; User candidate;
    final String requestId = "12345678-1234-1234-1234-123456789012";
    @BeforeEach void setup() {
        var job = new Job(); job.setId(3L); job.setAiInterviewEnabled(true); job.setAiInterviewPassingScore(BigDecimal.valueOf(70));
        candidate = new User(); candidate.setId(9L);
        var application = new Application(); application.setId(7L); application.setJob(job); application.setCandidate(candidate);
        application.setStatus(ApplicationStatus.INTERVIEW); application.setCvScreeningStatus(CvScreeningStatus.PASSED);
        interview = AiInterview.builder().id(11L).application(application).status(AiInterviewStatus.IN_PROGRESS)
                .startedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(1800)).contextSnapshotJson("{\"jobTitle\":\"Backend\"}").build();
        InterviewPolicies.snapshot(interview);
        session = InterviewSession.builder().id(21L).aiInterview(interview).maxTurns(3).build();
        service = new InterviewConversationService(interviews, sessions, messages, consents, access, ai, mapper);
    }
    void candidate(boolean lock) {
        when(access.actor()).thenReturn(candidate); when(access.candidate()).thenReturn(true);
        if (lock) when(interviews.findByIdForUpdate(11L)).thenReturn(Optional.of(interview));
        else when(interviews.findById(11L)).thenReturn(Optional.of(interview));
    }
    InterviewMessage message(long id, String role, String content, int order) {
        return InterviewMessage.builder().id(id).session(session).role(role).content(content).sequenceNo(order).build();
    }
    @Test void initializationRequestsAnEasyJobRelatedOpening() {
        when(sessions.findByAiInterview_Id(11L)).thenReturn(Optional.empty());
        when(sessions.save(any())).thenAnswer(call -> call.getArgument(0));
        when(ai.dialogue(anyString(), anyList(), any())).thenAnswer(call -> {
            String instruction = call.getArgument(0);
            assertThat(instruction).contains("Opening:", "ONE easy warm-up question", "Let the candidate choose the example")
                    .doesNotContain("Early conversation:", "Main conversation:", "This is the final turn");
            return "Hello! Could you tell me about a recent project?";
        });
        service.initialize(interview);
        verify(messages).save(argThat(value -> "ASSISTANT".equals(value.getRole()) && value.getSequenceNo() == 0));
        verify(ai, never()).evaluate(anyString(), any());
    }
    @Test void dialogueUsesHistoryWithoutCallingEvaluationOrCreatingStaticRubrics() {
        candidate(true); when(sessions.findByAiInterview_Id(11L)).thenReturn(Optional.of(session));
        var history = new ArrayList<>(List.of(message(31, "ASSISTANT", "How would you design an API?", 0)));
        when(messages.findBySession_IdOrderBySequenceNoAsc(21L)).thenReturn(history);
        when(messages.save(any())).thenAnswer(call -> { InterviewMessage value = call.getArgument(0); value.setId(40L + history.size()); history.add(value); return value; });
        when(ai.dialogue(anyString(), anyList(), any())).thenAnswer(call -> {
            String instruction = call.getArgument(0);
            assertThat(instruction).contains("Early conversation:", "ONE simple concrete question")
                    .doesNotContain("Opening:", "Main conversation:");
            @SuppressWarnings("unchecked") List<InterviewConversationClient.Message> prompt = call.getArgument(1);
            assertThat(prompt).extracting(InterviewConversationClient.Message::content).contains("How would you design an API?", "I use REST");
            return "What trade-offs would you consider?";
        });
        var response = service.turn(11L, new ConversationTurnRequest(requestId, "I use REST"), text -> {});
        assertThat(response.candidateTurns()).isEqualTo(1); assertThat(response.messages()).hasSize(3);
        verify(ai, never()).evaluate(anyString(), any());
    }
    @Test void laterTurnsExpandGraduallyAndFinalTurnOnlyCloses() {
        candidate(true); when(sessions.findByAiInterview_Id(11L)).thenReturn(Optional.of(session));
        when(messages.findBySession_IdOrderBySequenceNoAsc(21L)).thenReturn(List.of());
        session.setCandidateTurns(1);
        when(ai.dialogue(anyString(), anyList(), any())).thenAnswer(call -> {
            String instruction = call.getArgument(0);
            if (session.getCandidateTurns() == 2) {
                assertThat(instruction).contains("Main conversation:", "only when earlier answers show readiness", "simplify or clarify")
                        .doesNotContain("Opening:", "Early conversation:", "This is the final turn");
            } else {
                assertThat(instruction).contains("This is the final turn", "do not ask another question")
                        .doesNotContain("Opening:", "Early conversation:", "Main conversation:");
            }
            return "Reply";
        });
        service.turn(11L, new ConversationTurnRequest(requestId, "I implemented an endpoint"), text -> {});
        var finished = service.turn(11L, new ConversationTurnRequest("22345678-1234-1234-1234-123456789012", "I tested it"), text -> {});
        assertThat(finished.dialogueComplete()).isTrue();
        verify(ai, times(2)).dialogue(anyString(), anyList(), any());
    }
    @Test void duplicateRequestIsIdempotentEvenAfterCompletion() {
        candidate(true); interview.setStatus(AiInterviewStatus.SCORING); interview.setCompletedAt(Instant.now());
        when(sessions.findByAiInterview_Id(11L)).thenReturn(Optional.of(session));
        var user = message(32, "USER", "REST", 1); user.setClientRequestId(requestId);
        when(messages.findBySession_IdOrderBySequenceNoAsc(21L)).thenReturn(List.of(user, message(33, "ASSISTANT", "Thanks", 2)));
        assertThat(service.turn(11L, new ConversationTurnRequest(requestId, "REST"), text -> {}).messages()).hasSize(2);
        verifyNoInteractions(ai); verify(messages, never()).save(any());
        assertThatThrownBy(() -> service.turn(11L, new ConversationTurnRequest(requestId, "Changed answer"), text -> {}))
                .hasMessageContaining("another message");
    }
    @Test void failureNeverPersistsHalfATurn() {
        candidate(true); when(sessions.findByAiInterview_Id(11L)).thenReturn(Optional.of(session));
        when(messages.findBySession_IdOrderBySequenceNoAsc(21L)).thenReturn(List.of());
        when(ai.dialogue(anyString(), anyList(), any())).thenThrow(new IllegalStateException("Provider timeout"));
        assertThatThrownBy(() -> service.turn(11L, new ConversationTurnRequest(requestId, "REST"), text -> {})).hasMessage("Provider timeout");
        verify(messages, never()).save(any());
    }
    @Test void expiredOrFinishedInterviewCannotAcceptAnotherTurn() {
        candidate(true); interview.setExpiresAt(Instant.now().minusSeconds(1));
        when(sessions.findByAiInterview_Id(11L)).thenReturn(Optional.of(session));
        when(messages.findBySession_IdOrderBySequenceNoAsc(21L)).thenReturn(List.of());
        assertThatThrownBy(() -> service.turn(11L, new ConversationTurnRequest(requestId, "REST"), text -> {})).hasMessageContaining("not active");
        verifyNoInteractions(ai);
        interview.setExpiresAt(Instant.now().plusSeconds(100));
        interview.getApplication().setStatus(ApplicationStatus.ASSESSMENT);
        assertThatThrownBy(() -> service.turn(11L, new ConversationTurnRequest(requestId, "REST"), text -> {})).hasMessageContaining("interview round");
    }
    @Test void wrongCandidateCannotReadTranscript() {
        var other = new User(); other.setId(99L);
        when(access.actor()).thenReturn(other); when(access.candidate()).thenReturn(true);
        when(interviews.findById(11L)).thenReturn(Optional.of(interview));
        assertThatThrownBy(() -> service.get(11L)).hasMessageContaining("Candidate access required"); verifyNoInteractions(ai, messages);
    }
    @Test void staffMustHaveJobAccessAndWaitForCompletion() {
        when(access.actor()).thenReturn(candidate); when(access.staff()).thenReturn(true);
        when(interviews.findById(11L)).thenReturn(Optional.of(interview));
        assertThatThrownBy(() -> service.get(11L)).hasMessageContaining("after completion");
        verify(access).requireJob(interview.getApplication().getJob());
    }
    @Test void holisticScoresRequireVerbatimCandidateEvidence() {
        when(sessions.findByAiInterview_Id(11L)).thenReturn(Optional.of(session));
        when(messages.findBySession_IdOrderBySequenceNoAsc(21L)).thenReturn(List.of(message(31, "ASSISTANT", "Expert solution", 0), message(32, "USER", "I use REST APIs", 1)));
        var output = mapper.createObjectNode().put("summary", "Summary").put("strengths", "Strengths").put("weaknesses", "Weaknesses");
        var criteria = output.putObject("criteria");
        for (String key : InterviewConversationService.CRITERIA) {
            var row = criteria.putObject(key).put("score", 80);
            row.putArray("evidence").addObject().put("messageId", key.equals("COMMUNICATION") ? 32 : 31)
                    .put("quote", key.equals("COMMUNICATION") ? "REST APIs" : "Expert solution");
        }
        when(ai.evaluate(anyString(), any())).thenReturn(output);
        assertThat(service.evaluate(interview)).isEqualByComparingTo("20.00");
        var report = InterviewPolicies.tree(interview.getReportJson());
        assertThat(report.path("evaluationMode").asText()).isEqualTo("POST_SESSION");
        assertThat(report.path("communicationCriteria").path("TECHNICAL_KNOWLEDGE").asInt()).isZero();
        verify(ai, never()).dialogue(anyString(), anyList(), any());
        ((ObjectNode) criteria.path("COMMUNICATION")).put("score", 101);
        assertThatThrownBy(() -> service.evaluate(interview)).hasMessageContaining("criterion score");
    }
    @Test void noCandidateAnswerScoresZeroWithoutProviderCall() {
        when(sessions.findByAiInterview_Id(11L)).thenReturn(Optional.of(session));
        when(messages.findBySession_IdOrderBySequenceNoAsc(21L)).thenReturn(List.of(message(31, "ASSISTANT", "Hello", 0)));
        assertThat(service.evaluate(interview)).isEqualByComparingTo(BigDecimal.ZERO); verifyNoInteractions(ai);
    }
    @Test void audioCannotReachProviderWithoutVoiceConsent() {
        candidate(false);
        var snapshot = (ObjectNode) InterviewPolicies.tree(interview.getConfigSnapshotJson());
        ((ObjectNode) snapshot.path("policy").path("voice")).put("enabled", true);
        interview.setConfigSnapshotJson(snapshot.toString());
        assertThatThrownBy(() -> service.transcribe(11L, new byte[12], "audio/webm"))
                .hasMessageContaining("consent");
        verifyNoInteractions(ai);
    }

    @Test void speechCannotReadAnAiMessageFromAnotherInterview() {
        candidate(false);
        var snapshot = (ObjectNode) InterviewPolicies.tree(interview.getConfigSnapshotJson());
        ((ObjectNode) snapshot.path("policy").path("voice")).put("enabled", true);
        interview.setConfigSnapshotJson(snapshot.toString());
        when(consents.findByAiInterview_Id(11L)).thenReturn(Optional.of(AiInterviewConsent.builder().accepted(true).build()));
        var otherSession = InterviewSession.builder().aiInterview(AiInterview.builder().id(999L).build()).build();
        when(messages.findById(31L)).thenReturn(Optional.of(InterviewMessage.builder().session(otherSession).role("ASSISTANT").content("Private").build()));
        assertThatThrownBy(() -> service.speech(11L, 31L)).hasMessageContaining("not found");
        verifyNoInteractions(ai);
    }

    @Test void audioContainerAndSizeAreValidated() {
        assertThatThrownBy(() -> InterviewConversationService.validateAudio(new byte[12], "audio/webm")).hasMessageContaining("Invalid audio");
        var audio = new byte[12]; audio[0] = 0x1a; audio[1] = 0x45; audio[2] = (byte) 0xdf; audio[3] = (byte) 0xa3;
        assertThatCode(() -> InterviewConversationService.validateAudio(audio, "audio/webm")).doesNotThrowAnyException();
        assertThatThrownBy(() -> InterviewConversationService.validateAudio(audio, "text/plain")).hasMessageContaining("Invalid audio");
    }
}
