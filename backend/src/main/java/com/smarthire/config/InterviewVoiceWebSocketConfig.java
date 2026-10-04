package com.smarthire.config;

import com.smarthire.tenant.aiInterview.realtime.InterviewVoiceTickets;
import com.smarthire.tenant.aiInterview.realtime.InterviewVoiceWebSocketHandler;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.*;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.*;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

@Configuration @EnableWebSocket
public class InterviewVoiceWebSocketConfig implements WebSocketConfigurer {
    private final InterviewVoiceWebSocketHandler handler;
    private final InterviewVoiceTickets tickets;
    private final String[] origins;
    public InterviewVoiceWebSocketConfig(InterviewVoiceWebSocketHandler handler, InterviewVoiceTickets tickets,
            @Value("${app.cors.allowed-origins:http://localhost:5173}") String origins) {
        this.handler = handler; this.tickets = tickets; this.origins = origins.split(",");
    }
    @Override public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/ws/interview-voice").setAllowedOrigins(origins).addInterceptors(new HandshakeInterceptor() {
            @Override public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                    WebSocketHandler wsHandler, Map<String, Object> attributes) {
                var identity = tickets.consume(UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams().getFirst("ticket"));
                if (identity == null) return false;
                attributes.put("identity", identity); return true;
            }
            @Override public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                    WebSocketHandler wsHandler, Exception exception) {}
        });
    }
}
