package com.smarthire.tenant.aiInterview;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.messaging.TenantJobExecutor;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.aiInterview.realtime.*;
import com.smarthire.tenant.aiInterview.service.InterviewConversationService;
import java.nio.ByteBuffer;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.socket.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class InterviewVoiceWebSocketTest {
    @Test void audioChunksAreAssembledUnderTicketTenantAndSecurityContextsAreCleared() throws Exception {
        var conversation = mock(InterviewConversationService.class); var tenants = mock(TenantJobExecutor.class);
        var handler = new InterviewVoiceWebSocketHandler(conversation, tenants, new SyncTaskExecutor(), new ObjectMapper());
        var socket = mock(WebSocketSession.class);
        when(socket.getId()).thenReturn("connection"); when(socket.isOpen()).thenReturn(true);
        when(socket.getAttributes()).thenReturn(Map.of("identity", new InterviewVoiceTickets.Identity(11L, "acme", "candidate@example.test", List.of("ROLE_CANDIDATE"))));
        doAnswer(call -> {
            TenantContext.setCurrentTenant(call.getArgument(0));
            try { ((Runnable) call.getArgument(1)).run(); } finally { TenantContext.clear(); }
            return null;
        }).when(tenants).execute(eq("acme"), any());
        byte[] audio = new byte[]{0x1a, 0x45, (byte) 0xdf, (byte) 0xa3, 0, 0, 0, 0, 0, 0, 0, 0};
        when(conversation.transcribe(eq(11L), any(), eq("audio/webm"))).thenAnswer(call -> {
            assertThat(TenantContext.getCurrentTenant()).isEqualTo("acme");
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            assertThat(authentication.getDetails()).isEqualTo("acme");
            assertThat(authentication.getName()).isEqualTo("candidate@example.test");
            assertThat((byte[]) call.getArgument(1)).containsExactly(audio); return "My transcript";
        });
        handler.afterConnectionEstablished(socket);
        handler.handleMessage(socket, new TextMessage("{\"type\":\"start\",\"mimeType\":\"audio/webm;codecs=opus\"}"));
        handler.handleMessage(socket, new BinaryMessage(ByteBuffer.wrap(audio, 0, 4)));
        handler.handleMessage(socket, new BinaryMessage(ByteBuffer.wrap(audio, 4, 8)));
        handler.handleMessage(socket, new TextMessage("{\"type\":\"end\"}"));
        verify(conversation).transcribe(eq(11L), any(), eq("audio/webm"));
        verify(socket).sendMessage(argThat(message -> message instanceof TextMessage text && text.getPayload().contains("My transcript")));
        assertThat(TenantContext.getCurrentTenant()).isNull(); assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        handler.afterConnectionClosed(socket, CloseStatus.NORMAL);
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"AI_INTERVIEW_PROVIDER_AUTH_FAILED", "AI_INTERVIEW_PROVIDER_TIMEOUT", "AI_INTERVIEW_PROVIDER_RATE_LIMITED", "INTERNAL_ERROR"})
    void transcriptionFailureReturnsSafeVietnameseErrorAndClearsContexts(String code) throws Exception {
        var conversation = mock(InterviewConversationService.class); var tenants = mock(TenantJobExecutor.class);
        var handler = new InterviewVoiceWebSocketHandler(conversation, tenants, new SyncTaskExecutor(), new ObjectMapper());
        var socket = mock(WebSocketSession.class);
        when(socket.getId()).thenReturn("failed-connection"); when(socket.isOpen()).thenReturn(true);
        when(socket.getAttributes()).thenReturn(Map.of("identity", new InterviewVoiceTickets.Identity(34L, "ttqt", "candidate@example.test", List.of("ROLE_CANDIDATE"))));
        doAnswer(call -> {
            TenantContext.setCurrentTenant(call.getArgument(0));
            try { ((Runnable) call.getArgument(1)).run(); } finally { TenantContext.clear(); }
            return null;
        }).when(tenants).execute(eq("ttqt"), any());
        when(conversation.transcribe(eq(34L), any(), eq("audio/webm"))).thenThrow(new com.smarthire.common.exception.BusinessException(
                "secret-key private recording", org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, code));
        handler.afterConnectionEstablished(socket);
        handler.handleMessage(socket, new TextMessage("{\"type\":\"start\",\"mimeType\":\"audio/webm\"}"));
        handler.handleMessage(socket, new BinaryMessage(new byte[]{1, 2, 3}));
        handler.handleMessage(socket, new TextMessage("{\"type\":\"end\"}"));
        var sent = org.mockito.ArgumentCaptor.forClass(WebSocketMessage.class);
        verify(socket, atLeastOnce()).sendMessage(sent.capture());
        var response = new ObjectMapper().readTree(sent.getAllValues().getLast().getPayload().toString());
        assertThat(response.path("type").asText()).isEqualTo("error");
        assertThat(response.path("message").asText()).contains("Vui lòng").doesNotContain("secret-key", "private recording", "Speech transcription failed");
        if (code.equals("AI_INTERVIEW_PROVIDER_AUTH_FAILED")) assertThat(response.path("message").asText()).contains("API key");
        if (code.equals("AI_INTERVIEW_PROVIDER_TIMEOUT")) assertThat(response.path("message").asText()).contains("thời gian chờ");
        if (code.equals("AI_INTERVIEW_PROVIDER_RATE_LIMITED")) assertThat(response.path("message").asText()).contains("hạn mức");
        assertThat(TenantContext.getCurrentTenant()).isNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
    @Test void binaryAudioBeforeStartIsRejected() throws Exception {
        var handler = new InterviewVoiceWebSocketHandler(mock(InterviewConversationService.class), mock(TenantJobExecutor.class), new SyncTaskExecutor(), new ObjectMapper());
        var socket = mock(WebSocketSession.class); when(socket.getId()).thenReturn("connection");
        handler.afterConnectionEstablished(socket);
        handler.handleMessage(socket, new BinaryMessage(new byte[]{1, 2, 3}));
        verify(socket).close(CloseStatus.TOO_BIG_TO_PROCESS);
    }
}
