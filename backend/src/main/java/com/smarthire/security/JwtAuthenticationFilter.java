package com.smarthire.security;

import com.smarthire.common.redis.RedisKeys;
import com.smarthire.common.redis.RedisService;
import com.smarthire.multitenancy.context.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import com.smarthire.domain.enums.UserRole;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final RedisService redisService;

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider, RedisService redisService) {
        this.tokenProvider = tokenProvider;
        this.redisService = redisService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = getJwtFromRequest(request);

        if (StringUtils.hasText(token) && tokenProvider.validateToken(token)) {
            // Check if JWT token has been revoked / blacklisted in Redis
            boolean isBlacklisted = false;
            try {
                isBlacklisted = redisService.exists(RedisKeys.jwtBlacklist(token));
            } catch (Exception ex) {
                // Redis offline fallback: allow token if signature is valid
            }

            if (!isBlacklisted) {
                String email = tokenProvider.getEmailFromToken(token);
                String role = tokenProvider.getRoleFromToken(token);
                String tokenTenantId = tokenProvider.getTenantIdFromToken(token);

                // Enforce TenantContext if present in JWT token
                if (StringUtils.hasText(tokenTenantId)) {
                    TenantContext.setCurrentTenant(tokenTenantId);
                }

                if (StringUtils.hasText(email)) {
                    List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
                    if (UserRole.isRecruiterStaff(role)) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_STAFF"));
                    }
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(email, null, authorities);
                    authentication.setDetails(tokenTenantId);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
