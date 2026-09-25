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
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.cv.service.CvSkillAnalysisService;
import com.smarthire.tenant.job.dto.JobModels.JobUpsertRequest;
import com.smarthire.tenant.job.mapper.JobMapper;
import com.smarthire.tenant.job.screening.JobScreeningConfigService;
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
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JobServiceTest {
    @Mock JobRepository jobs;
    @Mock JobSkillRepository jobSkills;
    @Mock RecruitmentStageRepository stages;
    @Mock ApplicationRepository applications;
    @Mock CvAccess access;
    @Mock CvSkillAnalysisService taxonomy;
    @Mock JobAssignmentService assignments;
    @Mock JobScreeningConfigService screening;
    @Mock JobScreeningConfigRepository screeningConfigs;
    @Mock JobCloseScreeningService closeScreening;

    JobService service;
    User recruiter;
    Job draft;

    @BeforeEach
    void setUp() {
        service = new JobService(jobs, jobSkills, stages, applications, access, taxonomy, new JobMapper(),
                assignments, screening, screeningConfigs, closeScreening);
        recruiter = new User();
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
                .isEqualTo(java.time.LocalDate.parse("2026-09-30").atTime(23, 59, 59).toInstant(java.time.ZoneOffset.UTC));
        assertThat(JobService.parseDeadline("2026-09-30T17:30"))
                .isEqualTo(java.time.LocalDateTime.parse("2026-09-30T17:30").toInstant(java.time.ZoneOffset.UTC));
        assertThat(JobService.parseDeadline("2026-09-30T17:30:00Z")).isEqualTo(java.time.Instant.parse("2026-09-30T17:30:00Z"));
        assertThat(JobService.parseDeadline("")).isNull();
    }
}
