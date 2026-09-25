package com.smarthire.tenant.applicant;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.CvStatus;
import com.smarthire.domain.enums.JobStatus;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.ApplicationStatusHistoryRepository;
import com.smarthire.domain.tenant.repository.CvRepository;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.RecruitmentStageRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.tenant.applicant.mapper.ApplicantMapper;
import com.smarthire.messaging.JobPublisher;
import com.smarthire.tenant.applicant.service.ApplicantService;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.job.mapper.JobMapper;
import com.smarthire.tenant.applicant.service.AiInterviewInviteService;
import com.smarthire.tenant.job.screening.GateScreeningService;
import com.smarthire.domain.tenant.entity.MatchScore;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
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
    @Mock JobPublisher publisher;
    @Mock GateScreeningService gateScreening;
    @Mock AiInterviewInviteService aiInterviewInvites;

    ApplicantService service;
    User candidate;
    Job job;
    Application application;

    @BeforeEach
    void setUp() {
        service = new ApplicantService(
                applications, history, jobs, users, cvs, stages, access, new JobMapper(), new ApplicantMapper(),
                publisher, gateScreening, aiInterviewInvites);
        candidate = new User();
        candidate.setId(9L);
        candidate.setEmail("can@se36.local");
        candidate.setFullName("Candidate");
        candidate.setRole(UserRole.CANDIDATE.name());
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
    void applyWithExistingCvEnqueuesScreeningAgainstJob() {
        when(access.candidate()).thenReturn(true);
        when(jobs.findById(1L)).thenReturn(Optional.of(job));
        when(access.actor()).thenReturn(candidate);
        when(applications.findByJob_IdAndCandidate_Id(1L, 9L)).thenReturn(Optional.empty());
        when(applications.save(any(Application.class))).thenAnswer(invocation -> {
            Application saved = invocation.getArgument(0);
            saved.setId(11L);
            return saved;
        });
        when(stages.findByJob_IdOrderBySortOrderAsc(1L)).thenReturn(List.of());
        Cv cv = new Cv();
        cv.setId(3L);
        cv.setUser(candidate);
        cv.setStatus(CvStatus.ANALYZED);
        when(cvs.findById(3L)).thenReturn(Optional.of(cv));

        var summary = service.apply(1L, "CAREER", null, 3L);

        assertThat(summary.status()).isEqualTo("NEW");
        assertThat(cv.getJob()).isEqualTo(job);
        verify(publisher).publishExtract(3L);
    }

    @Test
    void applyWithUploadedCvEnqueuesParse() {
        when(access.candidate()).thenReturn(true);
        when(jobs.findById(1L)).thenReturn(Optional.of(job));
        when(access.actor()).thenReturn(candidate);
        when(applications.findByJob_IdAndCandidate_Id(1L, 9L)).thenReturn(Optional.empty());
        when(applications.save(any(Application.class))).thenAnswer(invocation -> {
            Application saved = invocation.getArgument(0);
            saved.setId(12L);
            return saved;
        });
        when(stages.findByJob_IdOrderBySortOrderAsc(1L)).thenReturn(List.of());
        Cv cv = new Cv();
        cv.setId(4L);
        cv.setUser(candidate);
        cv.setStatus(CvStatus.UPLOADED);
        when(cvs.findById(4L)).thenReturn(Optional.of(cv));

        service.apply(1L, "CAREER", null, 4L);

        verify(publisher).publishParse(4L);
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

    @Test
    void listVisibleReturnsStaffApplications() {
        when(access.staff()).thenReturn(true);
        when(access.jobScopeUserId()).thenReturn(null);
        when(applications.searchVisible(isNull(), isNull(), eq(""), isNull(), isNull(), eq(false), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(application)));
        when(applications.countByCandidate_Id(9L)).thenReturn(1L);

        var page = service.listVisible(null, "  ", null, null, false, 0, 20);

        assertThat(page.total()).isEqualTo(1);
        assertThat(page.items().get(0).candidateName()).isEqualTo("Candidate");
    }

    @Test
    void listVisibleRejectsCandidate() {
        when(access.staff()).thenReturn(false);

        assertThatThrownBy(() -> service.listVisible(null, null, null, null, false, 0, 20))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getCode())
                .isEqualTo("APPLICATION_FORBIDDEN");
    }

    @Test
    void cvPassMovesToInterviewAndSendsInvite() {
        Cv cv = new Cv();
        cv.setJob(job);
        cv.setUser(candidate);
        cv.setApplication(application);
        MatchScore score = new MatchScore();
        score.setScore(new java.math.BigDecimal("80.00"));
        score.setBreakdownJson("{\"passed\":true}");
        when(access.actor()).thenReturn(candidate);

        service.advanceFromCvScreening(cv, score);

        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.INTERVIEW);
        verify(aiInterviewInvites).sendIfNeeded(application, score);
        verify(gateScreening).recalculate(application);
    }

    @Test
    void cvFailDoesNotSendInvite() {
        Cv cv = new Cv();
        cv.setJob(job);
        cv.setUser(candidate);
        cv.setApplication(application);
        MatchScore score = new MatchScore();
        score.setScore(new java.math.BigDecimal("40.00"));
        score.setBreakdownJson("{\"passed\":false}");
        when(access.actor()).thenReturn(candidate);

        service.advanceFromCvScreening(cv, score);

        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.IN_REVIEW);
        verify(aiInterviewInvites, org.mockito.Mockito.never()).sendIfNeeded(any(), any());
    }

    @Test
    void alreadyInInterviewStillSendsInviteOnce() {
        application.setStatus(ApplicationStatus.INTERVIEW);
        Cv cv = new Cv();
        cv.setJob(job);
        cv.setUser(candidate);
        cv.setApplication(application);
        MatchScore score = new MatchScore();
        score.setScore(new java.math.BigDecimal("80.00"));
        score.setBreakdownJson("{\"passed\":true}");

        service.advanceFromCvScreening(cv, score);

        verify(aiInterviewInvites).sendIfNeeded(application, score);
        verify(gateScreening).recalculate(application);
    }
}
