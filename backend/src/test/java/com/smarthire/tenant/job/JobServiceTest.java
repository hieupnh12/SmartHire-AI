package com.smarthire.tenant.job;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.JobStatus;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.JobSkillRepository;
import com.smarthire.domain.tenant.repository.JobScreeningConfigRepository;
import com.smarthire.domain.tenant.repository.RecruitmentStageRepository;
import com.smarthire.tenant.company.service.CompanyDirectoryService;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.cv.service.CvSkillAnalysisService;
import com.smarthire.tenant.job.mapper.JobMapper;
import com.smarthire.tenant.job.screening.JobScreeningConfigService;
import com.smarthire.tenant.job.service.JobAccess;
import com.smarthire.tenant.job.service.JobAssignmentService;
import com.smarthire.tenant.job.service.JobCloseScreeningService;
import com.smarthire.tenant.job.service.JobService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JobServiceTest {
    @Mock
    JobRepository jobs;
    @Mock
    JobSkillRepository jobSkills;
    @Mock
    RecruitmentStageRepository stages;
    @Mock
    ApplicationRepository applications;
    @Mock
    CvAccess access;
    @Mock
    JobAccess jobAccess;
    @Mock
    CvSkillAnalysisService taxonomy;
    @Mock
    JobAssignmentService assignments;
    @Mock
    JobScreeningConfigService screening;
    @Mock
    JobScreeningConfigRepository screeningConfigs;
    @Mock
    JobCloseScreeningService closeScreening;
    @Mock
    CompanyDirectoryService companyDirectory;
    @Mock
    org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate;
    @Mock
    com.smarthire.tenant.applicant.service.ApplicationClosureService closures;

    JobService service;
    User recruiter;
    Job draft;

    @BeforeEach
    void setUp() {
        service = new JobService(jobs, jobSkills, stages, applications, access, jobAccess, taxonomy, new JobMapper(),
                assignments, screening, screeningConfigs, closeScreening, companyDirectory, rabbitTemplate, closures);
        recruiter = new User();
        recruiter.setId(10L);
        recruiter.setEmail("recruiter@se36.local");
        recruiter.setFullName("Le Cong Cuong");
        draft = new Job();
        draft.setId(8L);
        draft.setTitle("Backend Java");
        draft.setDescription("Build APIs");
        draft.setStatus(JobStatus.DRAFT);
        draft.setCreatedBy(recruiter);
    }

    @Test
    void publishRequiresSkills() {
        when(jobs.findWithOwnerById(8L)).thenReturn(Optional.of(draft));
        when(jobSkills.findByJob_IdOrderByIdAsc(8L)).thenReturn(List.of());

        assertThatThrownBy(() -> service.publish(8L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("skill");
    }

    @Test
    void publishAlreadyPublishedDoesNotConflict() {
        draft.setStatus(JobStatus.PUBLISHED);
        when(jobs.findWithOwnerById(8L)).thenReturn(Optional.of(draft));
        when(jobSkills.findViewRowsByJobId(8L)).thenReturn(List.of());
        when(stages.findByJob_IdOrderBySortOrderAsc(8L)).thenReturn(List.of());
        when(applications.countByJob_Id(8L)).thenReturn(0L);
        when(screeningConfigs.findById(8L)).thenReturn(Optional.empty());

        assertThat(service.publish(8L).status()).isEqualTo("PUBLISHED");
    }

    @Test
    void parseDeadlineAcceptsDateAndDateTime() {
        assertThat(JobService.parseDeadline("2026-09-30"))
                .isEqualTo(
                        java.time.LocalDate.parse("2026-09-30").atTime(23, 59, 59).toInstant(java.time.ZoneOffset.UTC));
        assertThat(JobService.parseDeadline("2026-09-30T17:30"))
                .isEqualTo(java.time.LocalDateTime.parse("2026-09-30T17:30").toInstant(java.time.ZoneOffset.UTC));
        assertThat(JobService.parseDeadline("2026-09-30T17:30:00Z"))
                .isEqualTo(java.time.Instant.parse("2026-09-30T17:30:00Z"));
        assertThat(JobService.parseDeadline("")).isNull();
    }

    @Test
    void searchScopeMyFiltersByActorEvenWhenCanViewAllJobs() {
        when(access.actor()).thenReturn(recruiter);
        when(access.staff()).thenReturn(true);
        lenient().when(jobAccess.canViewAllJobs()).thenReturn(true);
        when(jobs.search(isNull(), isNull(), isNull(), eq(10L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(draft)));

        var page = service.search(null, null, null, 0, 10, "my");

        assertThat(page.items()).hasSize(1);
        assertThat(page.total()).isEqualTo(1);
        verify(jobs).search(isNull(), isNull(), isNull(), eq(10L), any(Pageable.class));
        verify(access, never()).jobScopeUserId();
    }

    @Test
    void searchScopeBlankDefaultsToMy() {
        when(access.actor()).thenReturn(recruiter);
        when(access.staff()).thenReturn(true);
        when(jobs.search(isNull(), isNull(), isNull(), eq(10L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(draft)));

        var page = service.search(null, null, null, 0, 10, null);

        assertThat(page.items()).hasSize(1);
        verify(jobs).search(isNull(), isNull(), isNull(), eq(10L), any(Pageable.class));
    }

    @Test
    void searchScopeAllQueriesAllJobsWhenAuthorized() {
        when(access.actor()).thenReturn(recruiter);
        when(access.staff()).thenReturn(true);
        when(jobAccess.canViewAllJobs()).thenReturn(true);
        when(jobs.search(isNull(), isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(draft)));

        var page = service.search(null, null, null, 0, 10, "all");

        assertThat(page.items()).hasSize(1);
        verify(jobs).search(isNull(), isNull(), isNull(), isNull(), any(Pageable.class));
    }

    @Test
    void searchScopeAllRejectsStaffWithoutAllJobsAccess() {
        when(access.actor()).thenReturn(recruiter);
        when(access.staff()).thenReturn(true);
        when(jobAccess.canViewAllJobs()).thenReturn(false);

        assertThatThrownBy(() -> service.search(null, null, null, 0, 10, "all"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(be.getCode()).isEqualTo("FORBIDDEN");
                });
        verify(jobs, never()).search(any(), any(), any(), any(), any(Pageable.class));
    }

    @Test
    void searchRejectsInvalidScope() {
        when(access.actor()).thenReturn(recruiter);
        when(access.staff()).thenReturn(true);

        assertThatThrownBy(() -> service.search(null, null, null, 0, 10, "invalid"))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(be.getCode()).isEqualTo("INVALID_JOB_SCOPE");
                });
    }
}
