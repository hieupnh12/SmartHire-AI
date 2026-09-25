package com.smarthire.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.smarthire.domain.enums.RecruiterFeature;
import com.smarthire.tenant.auth.service.RolePermissionService;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecruiterFeatureFilterTest {

    @Mock
    private RolePermissionService rolePermissionService;
    @Mock
    private FilterChain filterChain;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void recruiterMissingFeatureReturns403() throws Exception {
        authenticate("ROLE_RECRUITER");
        when(rolePermissionService.hasFeature("RECRUITER", RecruiterFeature.RANKING)).thenReturn(false);
        RecruiterFeatureFilter filter = new RecruiterFeatureFilter(rolePermissionService, objectMapper);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/jobs/1/rankings");
        request.setServletPath("/api/v1/jobs/1/rankings");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertEquals(403, response.getStatus());
        verifyNoInteractions(filterChain);
    }

    @Test
    void recruiterWithFeatureContinues() throws Exception {
        authenticate("ROLE_HR");
        when(rolePermissionService.hasFeature("HR", RecruiterFeature.JOBS)).thenReturn(true);
        RecruiterFeatureFilter filter = new RecruiterFeatureFilter(rolePermissionService, objectMapper);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/jobs/health");
        request.setServletPath("/api/v1/jobs/health");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertEquals(200, response.getStatus());
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void customRoleMissingFeatureReturns403() throws Exception {
        authenticate("ROLE_CV_SCREENING", "ROLE_STAFF");
        when(rolePermissionService.hasFeature("CV_SCREENING", RecruiterFeature.JOBS)).thenReturn(false);
        RecruiterFeatureFilter filter = new RecruiterFeatureFilter(rolePermissionService, objectMapper);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/jobs/health");
        request.setServletPath("/api/v1/jobs/health");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertEquals(403, response.getStatus());
        verifyNoInteractions(filterChain);
    }

    @Test
    void recruiterCanDownloadCvFileWithoutScreeningFeature() throws Exception {
        authenticate("ROLE_RECRUITER");
        RecruiterFeatureFilter filter = new RecruiterFeatureFilter(rolePermissionService, objectMapper);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/cvs/19/file");
        request.setServletPath("/api/v1/cvs/19/file");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertEquals(200, response.getStatus());
        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(rolePermissionService);
    }

    @Test
    void recruiterCanAnalyzeAppliedCvWithoutScreeningFeature() throws Exception {
        authenticate("ROLE_RECRUITER");
        RecruiterFeatureFilter filter = new RecruiterFeatureFilter(rolePermissionService, objectMapper);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/cvs/19/parse");
        request.setServletPath("/api/v1/cvs/19/parse");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertEquals(200, response.getStatus());
        verify(filterChain).doFilter(request, response);
        verifyNoInteractions(rolePermissionService);
    }

    private static void authenticate(String... roles) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "user@tenant.com",
                        null,
                        java.util.Arrays.stream(roles).map(SimpleGrantedAuthority::new).toList()));
    }
}
