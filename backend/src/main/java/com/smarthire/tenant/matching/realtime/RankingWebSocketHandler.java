package com.smarthire.tenant.matching.realtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.time.Instant;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class RankingWebSocketHandler extends TextWebSocketHandler {
    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();
    private final ObjectMapper mapper;
    public RankingWebSocketHandler(ObjectMapper mapper) { this.mapper = mapper; }
    @Override public void afterConnectionEstablished(WebSocketSession session) { sessions.add(session); }
    @Override public void afterConnectionClosed(WebSocketSession session, CloseStatus status) { sessions.remove(session); }
    public void rankingUpdated(String tenant, long jobId, String rankingVersion) {
        String payload;
        try { payload = mapper.writeValueAsString(new Event("ranking.updated", jobId, rankingVersion, Instant.now())); }
        catch (IOException exception) { throw new IllegalStateException("Cannot serialize ranking event", exception); }
        sessions.stream().filter(WebSocketSession::isOpen).filter(session -> tenant.equals(session.getAttributes().get("tenant")))
                .forEach(session -> send(session, payload));
    }
    private void send(WebSocketSession session, String payload) {
        try { synchronized (session) { session.sendMessage(new TextMessage(payload)); } }
        catch (IOException exception) { sessions.remove(session); }
    }
    private record Event(String type, long jobId, String rankingVersion, Instant occurredAt) {}
}
