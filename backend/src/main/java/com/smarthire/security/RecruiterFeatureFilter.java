package com.smarthire.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.api.ApiResponse;
import com.smarthire.domain.enums.RecruiterFeature;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.tenant.auth.service.RolePermissionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RecruiterFeatureFilter extends OncePerRequestFilter {

    private final RolePermissionService rolePermissionService;
    private final ObjectMapper objectMapper;

    public RecruiterFeatureFilter(RolePermissionService rolePermissionService, ObjectMapper objectMapper) {
        this.rolePermissionService = rolePermissionService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String path = request.getServletPath();
        return path == null || !path.startsWith("/api/v1/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String role = currentRoleCode();
        if (!UserRole.isRecruiterStaff(role)) {
            filterChain.doFilter(request, response);
            return;
        }
        RecruiterFeature feature = RecruiterFeature.fromPath(request.getServletPath());
        if (feature == null || rolePermissionService.hasFeature(role, feature)) {
            filterChain.doFilter(request, response);
            return;
        }
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), ApiResponse.error("Access denied", "FORBIDDEN"));
    }

    private static String currentRoleCode() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            String value = authority.getAuthority();
            if (value != null && value.startsWith("ROLE_")) {
                String code = value.substring(5);
                if (!"STAFF".equals(code)) {
                    return code;
                }
            }
        }
        return null;
    }
}
