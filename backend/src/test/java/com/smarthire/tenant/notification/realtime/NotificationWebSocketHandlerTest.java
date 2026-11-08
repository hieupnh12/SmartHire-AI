package com.smarthire.tenant.notification.realtime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.smarthire.domain.tenant.event.NotificationChanged;
import com.smarthire.multitenancy.context.TenantContext;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

class NotificationWebSocketHandlerTest {
    private final NotificationWebSocketHandler handler = new NotificationWebSocketHandler();

    @AfterEach
    void clear() { TenantContext.clear(); }

    @Test
    void pushesOnlyToMatchingTenantAndRecipient() throws Exception {
        WebSocketSession candidate9 = session("se36", NotificationWebSocketHandler.CANDIDATE_ID, 9L, true);
        WebSocketSession user9 = session("se36", NotificationWebSocketHandler.USER_ID, 9L, true);
        WebSocketSession otherTenant = session("acme", NotificationWebSocketHandler.CANDIDATE_ID, 9L, true);
        WebSocketSession closed = session("se36", NotificationWebSocketHandler.CANDIDATE_ID, 9L, false);
        TenantContext.setCurrentTenant("se36");

        handler.onChanged(new NotificationChanged(null, 9L));

        verify(candidate9).sendMessage(new TextMessage(NotificationWebSocketHandler.PAYLOAD));
        verify(user9, never()).sendMessage(any());
        verify(otherTenant, never()).sendMessage(any());
        verify(closed, never()).sendMessage(any());
    }

    @Test
    void ignoresEventsWithoutTenant() throws Exception {
        WebSocketSession user2 = session("se36", NotificationWebSocketHandler.USER_ID, 2L, true);

        handler.onChanged(new NotificationChanged(2L, null));

        verify(user2, never()).sendMessage(any());
    }

    private WebSocketSession session(String tenant, String key, long id, boolean open) {
        WebSocketSession session = mock(WebSocketSession.class);
        Map<String, Object> attributes = new HashMap<>();
        attributes.put(NotificationWebSocketHandler.TENANT, tenant);
        attributes.put(key, id);
        when(session.getAttributes()).thenReturn(attributes);
        when(session.isOpen()).thenReturn(open);
        handler.afterConnectionEstablished(session);
        return session;
    }
}
