package com.smarthire.tenant.dashboard.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.JobStatus;
import com.smarthire.domain.enums.ScheduleStatus;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.InterviewScheduleRepository;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.tenant.dashboard.dto.DashboardSummaryResponse;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private JobRepository jobs;

    @Mock
    private ApplicationRepository applications;

    @Mock
    private InterviewScheduleRepository schedules;

    @InjectMocks
    private DashboardService dashboardService;

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void summary_admin_returnsCountsFromExistingTables() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "admin@acme.com",
                null,
                List.of(new SimpleGrantedAuthority("ROLE_TENANT_ADMIN"))));
        when(jobs.countByStatusAndDeletedAtIsNull(JobStatus.PUBLISHED)).thenReturn(4L);
        when(applications.countActiveCreatedSince(any())).thenReturn(12L);
        when(schedules.countByStatusIn(eq(List.of(ScheduleStatus.PROPOSED, ScheduleStatus.CONFIRMED)))).thenReturn(3L);

        DashboardSummaryResponse summary = dashboardService.summary();

        assertEquals(4L, summary.getOpenJobs());
        assertEquals(12L, summary.getNewApplicants());
        assertEquals(3L, summary.getInterviewsScheduled());
    }

    @Test
    void summary_candidate_isForbidden() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "candidate@acme.com",
                null,
                List.of(new SimpleGrantedAuthority("ROLE_CANDIDATE"))));

        BusinessException ex = assertThrows(BusinessException.class, () -> dashboardService.summary());

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        verifyNoInteractions(jobs, applications, schedules);
    }
}
