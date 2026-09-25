package com.smarthire.tenant.dashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.smarthire.tenant.dashboard.dto.DashboardSummaryResponse;
import com.smarthire.tenant.dashboard.service.DashboardService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock EntityManager entityManager;
    @Mock Query query;
    private DashboardService service;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "admin@acme.com",
                null,
                List.of(new SimpleGrantedAuthority("ROLE_TENANT_ADMIN"))));
        service = new DashboardService(entityManager);
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);
    }

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void summaryReturnsTenantRecruitmentMetrics() {
        when(query.getSingleResult()).thenReturn(new Object[] { 4L, 12L, 3L, 5L, 20L, new BigDecimal("82.45") });

        DashboardSummaryResponse result = service.summary();

        assertThat(result.openJobs()).isEqualTo(4);
        assertThat(result.newApplicants()).isEqualTo(12);
        assertThat(result.interviewsScheduled()).isEqualTo(3);
        assertThat(result.hireRate()).isEqualByComparingTo("25.0");
        assertThat(result.avgMatchScore()).isEqualByComparingTo("82.45");
    }

    @Test
    void summaryOmitsRatesWhenNoApplicationsOrScoresExist() {
        when(query.getSingleResult()).thenReturn(new Object[] { 0L, 0L, 0L, 0L, 0L, null });

        DashboardSummaryResponse result = service.summary();

        assertThat(result.hireRate()).isNull();
        assertThat(result.avgMatchScore()).isNull();
    }
}
