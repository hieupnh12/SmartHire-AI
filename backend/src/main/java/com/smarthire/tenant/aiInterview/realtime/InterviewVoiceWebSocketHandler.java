package com.smarthire.tenant.aiInterview.realtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.messaging.TenantJobExecutor;
import com.smarthire.tenant.aiInterview.service.InterviewConversationService;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

@Component
public class InterviewVoiceWebSocketHandler extends AbstractWebSocketHandler {
    private static final int MAX_AUDIO = 9 * 1024 * 1024;
    private final Map<String, Buffer> buffers = new ConcurrentHashMap<>();
    private final InterviewConversationService conversation;
    private final TenantJobExecutor tenants;
    private final TaskExecutor executor;
    private final ObjectMapper mapper;
    private static class Buffer { final ByteArrayOutputStream audio = new ByteArrayOutputStream(); String mime; boolean processing; }
    public InterviewVoiceWebSocketHandler(InterviewConversationService conversation, TenantJobExecutor tenants,
            @Qualifier("interviewConversationExecutor") TaskExecutor executor, ObjectMapper mapper) {
        this.conversation = conversation; this.tenants = tenants; this.executor = executor; this.mapper = mapper;
    }
    @Override public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        session.setBinaryMessageSizeLimit(256 * 1024); session.setTextMessageSizeLimit(4096);
        buffers.put(session.getId(), new Buffer()); send(session, Map.of("type", "ready"));
    }
    @Override protected void handleTextMessage(WebSocketSession socket, TextMessage message) throws Exception {
        var buffer = buffers.get(socket.getId()); if (buffer == null) return;
        var value = mapper.readTree(message.getPayload());
        synchronized (buffer) {
            if (buffer.processing) { send(socket, Map.of("type", "error", "message", "Transcription is already running")); return; }
            if ("start".equals(value.path("type").asText())) {
                String mime = value.path("mimeType").asText("").split(";")[0];
                if (!java.util.List.of("audio/webm", "audio/ogg", "audio/mp4").contains(mime)) {
                    socket.close(CloseStatus.BAD_DATA); return;
                }
                buffer.audio.reset(); buffer.mime = mime; send(socket, Map.of("type", "recording")); return;
            }
            if (!"end".equals(value.path("type").asText()) || buffer.mime == null || buffer.audio.size() == 0) {
                socket.close(CloseStatus.BAD_DATA); return;
            }
            buffer.processing = true;
            byte[] audio = buffer.audio.toByteArray(); String mime = buffer.mime;
            buffer.audio.reset(); buffer.mime = null;
            var identity = (InterviewVoiceTickets.Identity) socket.getAttributes().get("identity");
            try { executor.execute(() -> {
                if (!socket.isOpen()) return;
                var auth = new UsernamePasswordAuthenticationToken(identity.email(), null,
                        identity.authorities().stream().map(SimpleGrantedAuthority::new).toList());
                auth.setDetails(identity.tenant());
                var context = SecurityContextHolder.createEmptyContext(); context.setAuthentication(auth);
                SecurityContextHolder.setContext(context);
                try {
                    tenants.execute(identity.tenant(), () -> {
                        String transcript = conversation.transcribe(identity.interviewId(), audio, mime);
                        send(socket, Map.of("type", "transcript", "text", transcript));
                    });
                } catch (Exception ex) { send(socket, Map.of("type", "error", "message", "Speech transcription failed. Retry or type your answer."));
                } finally {
                    SecurityContextHolder.clearContext();
                    synchronized (buffer) { buffer.processing = false; }
                }
            }); } catch (RuntimeException ex) {
                buffer.processing = false;
                send(socket, Map.of("type", "error", "message", "Voice service is busy. Retry shortly."));
            }
        }
    }
    @Override protected void handleBinaryMessage(WebSocketSession socket, BinaryMessage message) throws Exception {
        var buffer = buffers.get(socket.getId()); if (buffer == null) return;
        synchronized (buffer) {
            if (buffer.processing || buffer.mime == null || buffer.audio.size() + message.getPayloadLength() > MAX_AUDIO) {
                socket.close(CloseStatus.TOO_BIG_TO_PROCESS); return;
            }
            byte[] bytes = new byte[message.getPayloadLength()]; message.getPayload().get(bytes); buffer.audio.write(bytes);
        }
    }
    @Override public void afterConnectionClosed(WebSocketSession session, CloseStatus status) { buffers.remove(session.getId()); }
    @Override public void handleTransportError(WebSocketSession session, Throwable ex) throws Exception {
        buffers.remove(session.getId()); session.close(CloseStatus.SERVER_ERROR);
    }
    private void send(WebSocketSession session, Object value) {
        if (!session.isOpen()) return;
        try { synchronized (session) { session.sendMessage(new TextMessage(mapper.writeValueAsString(value))); } }
        catch (IOException ex) { buffers.remove(session.getId()); }
    }
}
