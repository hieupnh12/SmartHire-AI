package com.smarthire.security;

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

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider) {
        this.tokenProvider = tokenProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = getJwtFromRequest(request);

        if (StringUtils.hasText(token) && tokenProvider.validateToken(token)) {
            String email = tokenProvider.getEmailFromToken(token);
            String role = tokenProvider.getRoleFromToken(token);
            String tokenTenantId = tokenProvider.getTenantIdFromToken(token);

            // Enforce TenantContext if present in JWT token
            if (StringUtils.hasText(tokenTenantId)) {
                TenantContext.setCurrentTenant(tokenTenantId);
            }

            if (StringUtils.hasText(email)) {
                List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(email, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            // Context is cleared after request completes in TenantWebInterceptor or here
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
