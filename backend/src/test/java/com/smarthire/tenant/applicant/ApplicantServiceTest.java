package com.smarthire.tenant.applicant;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.CvStatus;
import com.smarthire.domain.enums.CvScreeningStatus;
import com.smarthire.domain.enums.JobStatus;
import com.smarthire.domain.enums.ScreeningMode;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.Candidate;
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
import com.smarthire.tenant.aiInterview.service.AiInterviewInvitationService;
import com.smarthire.tenant.applicant.service.ApplicantService;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.cv.service.CvApplicationCopyService;
import com.smarthire.tenant.job.mapper.JobMapper;
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
    @Mock AiInterviewInvitationService invitations;
    @Mock JobPublisher publisher;
    @Mock GateScreeningService gateScreening;
    @Mock CvApplicationCopyService cvCopies;

    ApplicantService service;
    Candidate candidate;
    User staffActor;
    Job job;
    Application application;

    @BeforeEach
    void setUp() {
        service = new ApplicantService(
                applications, history, jobs, users, cvs, stages, access, new JobMapper(), new ApplicantMapper(),
                invitations, publisher, gateScreening, cvCopies);
        candidate = new Candidate();
        candidate.setId(9L);
        candidate.setEmail("can@se36.local");
        candidate.setFullName("Candidate");
        staffActor = new User();
        staffActor.setId(2L);
        staffActor.setRole(UserRole.RECRUITER.name());
        job = new Job();
        job.setId(1L);
        job.setTitle("Backend Java");
        job.setStatus(JobStatus.PUBLISHED);
        job.setScreeningMode(ScreeningMode.AUTO);
        application = new Application();
        application.setId(4L);
        application.setJob(job);
        application.setCandidate(candidate);
        application.setStatus(ApplicationStatus.NEW);
    }

    @Test
    void humanInterviewStatusRecordsHistoryWithoutAiInvitation() {
        application.setStatus(ApplicationStatus.ASSESSMENT);
        application.setCvScreeningStatus(CvScreeningStatus.PASSED);
        job.setAiInterviewEnabled(true);
        when(applications.findById(4L)).thenReturn(Optional.of(application));
        when(access.actor()).thenReturn(staffActor);

        var detail = service.changeStatus(4L, "HUMAN_INTERVIEW", "Human interview round");

        assertThat(detail.status()).isEqualTo("HUMAN_INTERVIEW");
        var captured = org.mockito.ArgumentCaptor.forClass(com.smarthire.domain.tenant.entity.ApplicationStatusHistory.class);
        verify(history).save(captured.capture());
        assertThat(captured.getValue().getFromStatus()).isEqualTo("ASSESSMENT");
        assertThat(captured.getValue().getToStatus()).isEqualTo("HUMAN_INTERVIEW");
        org.mockito.Mockito.verifyNoInteractions(invitations);
    }

    @Test
    void terminalApplicationCannotMoveToHumanInterview() {
        application.setStatus(ApplicationStatus.HIRED);
        when(applications.findById(4L)).thenReturn(Optional.of(application));

        assertThatThrownBy(() -> service.changeStatus(4L, "HUMAN_INTERVIEW", null))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getCode())
                .isEqualTo("APPLICATION_BAD_STATUS");
        org.mockito.Mockito.verifyNoInteractions(history, invitations);
    }

    @Test
    void applyRejectsDuplicate() {
        when(access.candidate()).thenReturn(true);
        when(jobs.findById(1L)).thenReturn(Optional.of(job));
        when(access.candidateActor()).thenReturn(candidate);
        when(applications.findByJob_IdAndCandidate_Id(1L, 9L)).thenReturn(Optional.of(application));

        assertThatThrownBy(() -> service.apply(1L, "CAREER", null))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getCode())
                .isEqualTo("APPLICATION_EXISTS");
    }

    @Test
    void passedScreeningInvitesCandidateWithoutRequestAuthentication() {
        var cv = new com.smarthire.domain.tenant.entity.Cv();
        cv.setApplication(application);
        cv.setJob(job);
        cv.setCandidate(candidate);
        var score = new com.smarthire.domain.tenant.entity.MatchScore();
        score.setScore(new java.math.BigDecimal("85"));
        score.setBreakdownJson("{\"passed\":true}");
        job.setAiInterviewEnabled(true);
        when(applications.findByIdForUpdate(4L)).thenReturn(Optional.of(application));
        service.advanceFromCvScreening(cv, score);
        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.INTERVIEW);
        verify(invitations).invite(4L, null);
        org.mockito.Mockito.verifyNoInteractions(access);
    }

    @Test
    void failedScreeningDoesNotInviteCandidate() {
        var cv = new com.smarthire.domain.tenant.entity.Cv();
        cv.setApplication(application);
        cv.setJob(job);
        cv.setCandidate(candidate);
        var score = new com.smarthire.domain.tenant.entity.MatchScore();
        score.setScore(new java.math.BigDecimal("20"));
        score.setBreakdownJson("{\"passed\":false}");
        when(applications.findByIdForUpdate(4L)).thenReturn(Optional.of(application));
        service.advanceFromCvScreening(cv, score);
        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.IN_REVIEW);
        org.mockito.Mockito.verifyNoInteractions(invitations, access);
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
    void applyWithLibraryCvScreensACopyForThisJob() {
        stubNewApplication(1L, job, 11L);
        Cv cv = new Cv();
        cv.setId(3L);
        cv.setCandidate(candidate);
        cv.setStatus(CvStatus.ANALYZED);
        when(cvs.findById(3L)).thenReturn(Optional.of(cv));
        Cv copy = new Cv();
        copy.setId(30L);
        copy.setStatus(CvStatus.UPLOADED);
        when(cvCopies.copyFor(eq(cv), eq(job), any(Application.class))).thenReturn(copy);

        var summary = service.apply(1L, "CAREER", null, 3L);

        assertThat(summary.status()).isEqualTo("NEW");
        assertThat(cv.getJob()).isNull();
        assertThat(cv.getApplication()).isNull();
        verify(publisher).publishParse(30L);
    }

    @Test
    void applyingToSecondJobKeepsFirstApplicationCv() {
        Job second = new Job();
        second.setId(2L);
        second.setTitle("Frontend React");
        second.setStatus(JobStatus.PUBLISHED);
        stubNewApplication(2L, second, 12L);
        Cv firstApplicationCv = new Cv();
        firstApplicationCv.setId(5L);
        firstApplicationCv.setCandidate(candidate);
        firstApplicationCv.setJob(job);
        firstApplicationCv.setApplication(application);
        firstApplicationCv.setStatus(CvStatus.ANALYZED);
        when(cvs.findById(5L)).thenReturn(Optional.of(firstApplicationCv));
        Cv copy = new Cv();
        copy.setId(50L);
        copy.setStatus(CvStatus.UPLOADED);
        when(cvCopies.copyFor(eq(firstApplicationCv), eq(second), any(Application.class))).thenReturn(copy);

        service.apply(2L, "CAREER", null, 5L);

        assertThat(firstApplicationCv.getJob()).isEqualTo(job);
        assertThat(firstApplicationCv.getApplication()).isEqualTo(application);
        verify(publisher).publishParse(50L);
    }

    private void stubNewApplication(long jobId, Job target, long applicationId) {
        when(access.candidate()).thenReturn(true);
        when(jobs.findById(jobId)).thenReturn(Optional.of(target));
        when(access.candidateActor()).thenReturn(candidate);
        when(applications.findByJob_IdAndCandidate_Id(jobId, 9L)).thenReturn(Optional.empty());
        when(applications.save(any(Application.class))).thenAnswer(invocation -> {
            Application saved = invocation.getArgument(0);
            saved.setId(applicationId);
            return saved;
        });
        when(stages.findByJob_IdOrderBySortOrderAsc(jobId)).thenReturn(List.of());
    }

    @Test
    void candidateCanWithdraw() {
        when(applications.findById(4L)).thenReturn(Optional.of(application));
        when(access.candidateActor()).thenReturn(candidate);
        when(access.candidate()).thenReturn(true);
        when(cvs.findByCandidate_IdAndJob_IdOrderByIdDesc(9L, 1L)).thenReturn(List.of());
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
    void cvPassMovesToInterviewAndCreatesInvitation() {
        job.setAiInterviewEnabled(true);
        Cv cv = new Cv();
        cv.setJob(job);
        cv.setCandidate(candidate);
        cv.setApplication(application);
        MatchScore score = new MatchScore();
        score.setScore(new java.math.BigDecimal("80.00"));
        score.setBreakdownJson("{\"passed\":true}");
        when(applications.findByIdForUpdate(4L)).thenReturn(Optional.of(application));

        service.advanceFromCvScreening(cv, score);

        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.INTERVIEW);
        verify(invitations).invite(4L, null);
        verify(gateScreening).recalculate(application);
    }

    @Test
    void cvFailDoesNotSendInvite() {
        Cv cv = new Cv();
        cv.setJob(job);
        cv.setCandidate(candidate);
        cv.setApplication(application);
        MatchScore score = new MatchScore();
        score.setScore(new java.math.BigDecimal("40.00"));
        score.setBreakdownJson("{\"passed\":false}");
        when(applications.findByIdForUpdate(4L)).thenReturn(Optional.of(application));

        service.advanceFromCvScreening(cv, score);

        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.IN_REVIEW);
        org.mockito.Mockito.verifyNoInteractions(invitations);
    }

    @Test
    void alreadyInInterviewRepairsMissingInvitation() {
        application.setStatus(ApplicationStatus.INTERVIEW);
        Cv cv = new Cv();
        cv.setJob(job);
        cv.setCandidate(candidate);
        cv.setApplication(application);
        MatchScore score = new MatchScore();
        score.setScore(new java.math.BigDecimal("80.00"));
        score.setBreakdownJson("{\"passed\":true}");
        job.setAiInterviewEnabled(true);
        when(applications.findByIdForUpdate(4L)).thenReturn(Optional.of(application));

        service.advanceFromCvScreening(cv, score);

        verify(invitations).invite(4L, null);
        verify(gateScreening).recalculate(application);
    }

    @Test
    void manualModeScoresButLeavesDecisionToRecruiter() {
        job.setScreeningMode(ScreeningMode.MANUAL);
        Cv cv = new Cv();
        cv.setJob(job);
        cv.setCandidate(candidate);
        cv.setApplication(application);
        MatchScore score = new MatchScore();
        score.setScore(new java.math.BigDecimal("90.00"));
        score.setBreakdownJson("{\"passed\":true}");
        when(applications.findByIdForUpdate(4L)).thenReturn(Optional.of(application));

        service.advanceFromCvScreening(cv, score);

        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.IN_REVIEW);
        assertThat(application.getCvScreeningStatus()).isEqualTo(CvScreeningStatus.PENDING);
        org.mockito.Mockito.verifyNoInteractions(invitations);
        verify(gateScreening).recalculate(application);
    }

    @Test
    void recruiterPassMovesToInterviewAndSendsInvite() {
        job.setScreeningMode(ScreeningMode.MANUAL);
        job.setAiInterviewEnabled(true);
        application.setStatus(ApplicationStatus.IN_REVIEW);
        stubStaffDetail();

        var detail = service.decideCvScreening(4L, true, null);

        assertThat(detail.status()).isEqualTo("INTERVIEW");
        assertThat(detail.cvScreeningStatus()).isEqualTo("PASSED");
        verify(invitations).invite(4L, null);
    }

    @Test
    void recruiterFailKeepsApplicationInReview() {
        job.setScreeningMode(ScreeningMode.MANUAL);
        application.setStatus(ApplicationStatus.IN_REVIEW);
        stubStaffDetail();

        var detail = service.decideCvScreening(4L, false, null);

        assertThat(detail.status()).isEqualTo("IN_REVIEW");
        assertThat(detail.cvScreeningStatus()).isEqualTo("FAILED");
        org.mockito.Mockito.verifyNoInteractions(invitations);
    }

    @Test
    void recruiterDecisionRejectedOutsideCvRound() {
        application.setStatus(ApplicationStatus.OFFER);
        when(applications.findById(4L)).thenReturn(Optional.of(application));
        when(access.candidate()).thenReturn(false);
        when(applications.findByIdForUpdate(4L)).thenReturn(Optional.of(application));

        assertThatThrownBy(() -> service.decideCvScreening(4L, true, null))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getCode())
                .isEqualTo("APPLICATION_NOT_IN_CV_ROUND");
    }

    private void stubStaffDetail() {
        User recruiter = new User();
        recruiter.setId(2L);
        recruiter.setRole(UserRole.RECRUITER.name());
        when(applications.findById(4L)).thenReturn(Optional.of(application));
        when(access.candidate()).thenReturn(false);
        when(access.actor()).thenReturn(recruiter);
        when(applications.findByIdForUpdate(4L)).thenReturn(Optional.of(application));
        when(cvs.findByCandidate_IdAndJob_IdOrderByIdDesc(9L, 1L)).thenReturn(List.of());
        when(history.findByApplication_IdOrderByIdDesc(4L)).thenReturn(List.of());
        when(applications.countByCandidate_Id(9L)).thenReturn(1L);
    }
}
