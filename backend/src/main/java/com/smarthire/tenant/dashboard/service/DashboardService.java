package com.smarthire.tenant.dashboard.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.JobStatus;
import com.smarthire.domain.enums.ScheduleStatus;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.InterviewScheduleRepository;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.tenant.dashboard.dto.DashboardSummaryResponse;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {

    private static final int NEW_APPLICANT_DAYS = 30;

    private final JobRepository jobs;
    private final ApplicationRepository applications;
    private final InterviewScheduleRepository schedules;

    public DashboardService(
            JobRepository jobs,
            ApplicationRepository applications,
            InterviewScheduleRepository schedules) {
        this.jobs = jobs;
        this.applications = applications;
        this.schedules = schedules;
    }

    public Map<String, String> health() {
        return Map.of("module", "dashboard", "status", "scaffold");
    }

    @Transactional(readOnly = true)
    public DashboardSummaryResponse summary() {
        if (UserRole.isCandidate(currentRole())) {
            throw new BusinessException("Access denied", HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
        Instant since = Instant.now().minus(NEW_APPLICANT_DAYS, ChronoUnit.DAYS);
        return DashboardSummaryResponse.builder()
                .openJobs(jobs.countByStatusAndDeletedAtIsNull(JobStatus.PUBLISHED))
                .newApplicants(applications.countActiveCreatedSince(since))
                .interviewsScheduled(schedules.countByStatusIn(List.of(ScheduleStatus.PROPOSED, ScheduleStatus.CONFIRMED)))
                .build();
    }

    private static String currentRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return null;
        }
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            String value = authority.getAuthority();
            if (value != null && value.startsWith("ROLE_")) {
                return value.substring("ROLE_".length());
            }
        }
        return null;
    }
}
