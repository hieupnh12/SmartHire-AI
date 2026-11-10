package com.smarthire.tenant.notification.realtime;

import com.smarthire.domain.tenant.event.NotificationChanged;
import com.smarthire.multitenancy.context.TenantContext;
import java.io.IOException;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

/**
 * SCHED-02: tells a recipient's open tabs that their inbox changed. The message carries no
 * notification content; clients refetch through the authenticated REST API.
 */
@Component
public class NotificationWebSocketHandler extends TextWebSocketHandler {
    public static final String TENANT = "tenant";
    public static final String CANDIDATE_ID = "candidateId";
    public static final String USER_ID = "userId";
    static final String PAYLOAD = "{\"type\":\"notifications.changed\"}";

    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();

    @Override public void afterConnectionEstablished(WebSocketSession session) { sessions.add(session); }
    @Override public void afterConnectionClosed(WebSocketSession session, CloseStatus status) { sessions.remove(session); }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onChanged(NotificationChanged event) {
        String tenant = TenantContext.getCurrentTenant();
        if (tenant == null) return;
        String key = event.candidateId() != null ? CANDIDATE_ID : USER_ID;
        Long id = event.candidateId() != null ? event.candidateId() : event.userId();
        if (id == null) return;
        sessions.stream().filter(WebSocketSession::isOpen)
                .filter(session -> tenant.equals(session.getAttributes().get(TENANT)))
                .filter(session -> Objects.equals(id, session.getAttributes().get(key)))
                .forEach(this::send);
    }

    private void send(WebSocketSession session) {
        try { synchronized (session) { session.sendMessage(new TextMessage(PAYLOAD)); } }
        catch (IOException | IllegalStateException exception) { sessions.remove(session); }
    }
}
