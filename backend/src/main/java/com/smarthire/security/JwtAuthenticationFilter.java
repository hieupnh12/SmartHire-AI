package com.smarthire.security;

import com.smarthire.common.redis.RedisKeys;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.repository.CandidateRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.multitenancy.context.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final RedisService redisService;
    private final UserRepository userRepository;
    private final CandidateRepository candidateRepository;

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider, RedisService redisService) {
        this(tokenProvider, redisService, null, null);
    }

    @Autowired
    public JwtAuthenticationFilter(
            JwtTokenProvider tokenProvider,
            RedisService redisService,
            UserRepository userRepository,
            CandidateRepository candidateRepository) {
        this.tokenProvider = tokenProvider;
        this.redisService = redisService;
        this.userRepository = userRepository;
        this.candidateRepository = candidateRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = getJwtFromRequest(request);

        try {
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

                    // Enforce TenantContext if present in JWT token (ignore master platform tokens)
                    if (StringUtils.hasText(tokenTenantId) && !"smarthire_master".equalsIgnoreCase(tokenTenantId)) {
                        TenantContext.setCurrentTenant(tokenTenantId);
                    }

                    if (StringUtils.hasText(email) && isAccountActive(tokenTenantId, email, role)) {
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

            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private boolean isAccountActive(String tokenTenantId, String email, String role) {
        if (!StringUtils.hasText(tokenTenantId) || "smarthire_master".equalsIgnoreCase(tokenTenantId)) {
            return true;
        }
        if (UserRole.isCandidate(role)) {
            if (candidateRepository == null) return true;
            return candidateRepository.findByEmailIgnoreCase(email)
                    .map(c -> c.getStatus() == null || c.getStatus() == UserStatus.ACTIVE)
                    .orElse(false);
        }
        if (userRepository == null) return true;
        return userRepository.findByEmailIgnoreCase(email)
                .map(u -> u.getStatus() == UserStatus.ACTIVE)
                .orElse(false);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
