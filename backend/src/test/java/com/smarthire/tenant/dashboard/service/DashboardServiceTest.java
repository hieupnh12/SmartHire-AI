package com.smarthire.tenant.dashboard.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;

import com.smarthire.common.exception.BusinessException;
import jakarta.persistence.EntityManager;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private EntityManager entityManager;

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void summary_candidate_isForbidden() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "candidate@acme.com",
                null,
                List.of(new SimpleGrantedAuthority("ROLE_CANDIDATE"))));
        DashboardService dashboardService = new DashboardService(entityManager);

        BusinessException ex = assertThrows(BusinessException.class, dashboardService::summary);

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        verifyNoInteractions(entityManager);
    }
}
