package com.smarthire.config;

import com.smarthire.domain.enums.UserRole;
import com.smarthire.security.JwtTokenProvider;
import com.smarthire.tenant.matching.realtime.RankingWebSocketHandler;
import java.util.Map;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
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
public class RankingWebSocketConfig implements WebSocketConfigurer {
    private final RankingWebSocketHandler handler;
    private final JwtTokenProvider tokens;
    private final String[] allowedOrigins;
    public RankingWebSocketConfig(RankingWebSocketHandler handler, JwtTokenProvider tokens,
            @Value("${app.cors.allowed-origins:http://localhost:5173}") String allowedOrigins) {
        this.handler = handler; this.tokens = tokens; this.allowedOrigins = allowedOrigins.split(",");
    }
    @Override public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/ws/rankings").addInterceptors(new HandshakeInterceptor() {
            @Override public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                    WebSocketHandler wsHandler, Map<String, Object> attributes) {
                String token = UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams().getFirst("token");
                if (token == null || !tokens.validateToken(token)) return false;
                String role = tokens.getRoleFromToken(token);
                if (role == null || UserRole.isCandidate(role)) return false;
                attributes.put("tenant", tokens.getTenantIdFromToken(token));
                attributes.put("email", tokens.getEmailFromToken(token));
                return true;
            }
            @Override public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                    WebSocketHandler wsHandler, Exception exception) { }
        }).setAllowedOrigins(allowedOrigins);
    }
}
