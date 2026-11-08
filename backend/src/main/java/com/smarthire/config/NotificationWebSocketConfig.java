package com.smarthire.config;

import com.smarthire.domain.enums.UserRole;
import com.smarthire.security.JwtTokenProvider;
import com.smarthire.tenant.notification.realtime.NotificationWebSocketHandler;
import java.util.ArrayList;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

@Configuration
@EnableWebSocket
public class NotificationWebSocketConfig implements WebSocketConfigurer {
    private final NotificationWebSocketHandler handler;
    private final JwtTokenProvider tokens;
    private final String[] allowedOriginPatterns;

    public NotificationWebSocketConfig(NotificationWebSocketHandler handler, JwtTokenProvider tokens,
            @Value("${app.cors.allowed-origins:http://localhost:5173}") String allowedOrigins) {
        this.handler = handler;
        this.tokens = tokens;
        // Same origins as /ws/rankings, including tenant subdomains.
        ArrayList<String> patterns = new ArrayList<>();
        for (String origin : allowedOrigins.split(",")) {
            if (!origin.isBlank()) patterns.add(origin.trim());
        }
        patterns.add("http://localhost:*");
        patterns.add("http://*.localhost:*");
        patterns.add("https://*.smarthire.top");
        patterns.add("https://smarthire.top");
        this.allowedOriginPatterns = patterns.toArray(String[]::new);
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/ws/notifications").addInterceptors(new HandshakeInterceptor() {
            @Override public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                    WebSocketHandler wsHandler, Map<String, Object> attributes) {
                String token = UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams().getFirst("token");
                if (token == null || !tokens.validateToken(token)) return false;
                String tenant = tokens.getTenantIdFromToken(token);
                Long id = tokens.getUserIdFromToken(token);
                if (tenant == null || "smarthire_master".equals(tenant) || id == null) return false;
                attributes.put(NotificationWebSocketHandler.TENANT, tenant);
                attributes.put(UserRole.isCandidate(tokens.getRoleFromToken(token))
                        ? NotificationWebSocketHandler.CANDIDATE_ID : NotificationWebSocketHandler.USER_ID, id);
                return true;
            }
            @Override public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                    WebSocketHandler wsHandler, Exception exception) { }
        }).setAllowedOriginPatterns(allowedOriginPatterns);
    }
}
