package com.smarthire.tenant.applicant;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.JobStatus;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.ApplicationStatusHistoryRepository;
import com.smarthire.domain.tenant.repository.CvRepository;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.RecruitmentStageRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.tenant.applicant.mapper.ApplicantMapper;
import com.smarthire.tenant.applicant.service.ApplicantService;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.job.mapper.JobMapper;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApplicantServiceTest {
    @Mock ApplicationRepository applications;
    @Mock ApplicationStatusHistoryRepository history;
    @Mock JobRepository jobs;
    @Mock UserRepository users;
    @Mock CvRepository cvs;
    @Mock RecruitmentStageRepository stages;
    @Mock CvAccess access;

    ApplicantService service;
    User candidate;
    Job job;
    Application application;

    @BeforeEach
    void setUp() {
        service = new ApplicantService(
                applications, history, jobs, users, cvs, stages, access, new JobMapper(), new ApplicantMapper());
        candidate = new User();
        candidate.setId(9L);
        candidate.setEmail("can@se36.local");
        candidate.setFullName("Candidate");
        candidate.setRole(UserRole.CANDIDATE);
        job = new Job();
        job.setId(1L);
        job.setTitle("Backend Java");
        job.setStatus(JobStatus.PUBLISHED);
        application = new Application();
        application.setId(4L);
        application.setJob(job);
        application.setCandidate(candidate);
        application.setStatus(ApplicationStatus.NEW);
    }

    @Test
    void applyRejectsDuplicate() {
        when(access.candidate()).thenReturn(true);
        when(jobs.findById(1L)).thenReturn(Optional.of(job));
        when(access.actor()).thenReturn(candidate);
        when(applications.findByJob_IdAndCandidate_Id(1L, 9L)).thenReturn(Optional.of(application));

        assertThatThrownBy(() -> service.apply(1L, "CAREER", null))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getCode())
                .isEqualTo("APPLICATION_EXISTS");
    }

    @Test
    void staffCannotApply() {
        when(access.candidate()).thenReturn(false);
        assertThatThrownBy(() -> service.apply(1L, "CAREER", null))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getCode())
                .isEqualTo("APPLICATION_CANDIDATE_ONLY");
    }

    @Test
    void candidateCanWithdraw() {
        when(applications.findById(4L)).thenReturn(Optional.of(application));
        when(access.actor()).thenReturn(candidate);
        when(access.candidate()).thenReturn(true);
        when(cvs.findByUser_IdAndJob_IdOrderByIdDesc(9L, 1L)).thenReturn(List.of());
        when(history.findByApplication_IdOrderByIdDesc(4L)).thenReturn(List.of());
        when(applications.countByCandidate_Id(9L)).thenReturn(1L);

        var detail = service.withdraw(4L);

        assertThat(detail.status()).isEqualTo("WITHDRAWN");
        verify(history).save(any());
    }
}
