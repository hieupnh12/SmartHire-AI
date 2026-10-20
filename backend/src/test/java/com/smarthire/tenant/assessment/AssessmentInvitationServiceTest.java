package com.smarthire.tenant.assessment;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.NotificationStatus;
import com.smarthire.domain.enums.TestStatus;
import com.smarthire.domain.enums.TestSubmissionStatus;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.multitenancy.service.TenantPublicUrlService;
import com.smarthire.tenant.assessment.dto.request.SendAssessmentRequest;
import com.smarthire.tenant.assessment.service.AssessmentDemoSeedService;
import com.smarthire.tenant.assessment.service.AssessmentInvitationService;
import com.smarthire.tenant.auth.service.InviteMailSender;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.notification.service.NotificationPreferenceService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssessmentInvitationServiceTest {
    @Mock JobTestRepository tests;
    @Mock ApplicationRepository applications;
    @Mock SubmissionRepository submissions;
    @Mock ApplicationStatusHistoryRepository history;
    @Mock RecruitmentStageRepository stages;
    @Mock NotificationRepository notifications;
    @Mock EmailOutboxRepository outbox;
    @Mock InviteMailSender mail;
    @Mock TenantPublicUrlService publicUrls;
    @Mock CvAccess access;
    @Mock NotificationPreferenceService preferences;
    @Mock AssessmentDemoSeedService demoSeed;
    @InjectMocks AssessmentInvitationService service;

    JobTest test;
    Application application;

    @BeforeEach void setup() {
        var job = new Job();
        job.setId(13L);
        job.setTitle("Java Backend Developer");
        test = new JobTest();
        test.setId(5L);
        test.setJob(job);
        test.setTitle("Java Core");
        test.setDurationMinutes(30);
        test.setStatus(TestStatus.PUBLISHED);
        var candidate = new Candidate();
        candidate.setId(9L);
        candidate.setEmail("candidate@example.test");
        candidate.setFullName("Nguyen Van A");
        application = new Application();
        application.setId(7L);
        application.setJob(job);
        application.setCandidate(candidate);
        application.setStatus(ApplicationStatus.INTERVIEW);
        var recruiter = new User();
        recruiter.setId(2L);
        lenient().when(access.staff()).thenReturn(true);
        lenient().when(access.actor()).thenReturn(recruiter);
        lenient().when(tests.findById(5L)).thenReturn(Optional.of(test));
    }

    @Test void movesToAssessmentAndNotifiesCandidate() {
        eligible();
        var stage = new RecruitmentStage();
        stage.setName("Assessment");
        when(stages.findByJob_IdOrderBySortOrderAsc(13L)).thenReturn(List.of(stage));
        when(publicUrls.path(anyString())).thenAnswer(call -> "https://acme.example" + call.getArgument(0));
        when(mail.send(eq("candidate@example.test"), anyString(), anyString())).thenReturn(true);

        var result = service.send(5L, new SendAssessmentRequest(7L));

        assertThat(result.applicationStatus()).isEqualTo(ApplicationStatus.ASSESSMENT);
        assertThat(result.emailSent()).isTrue();
        assertThat(application.getStage()).isSameAs(stage);
        var row = ArgumentCaptor.forClass(ApplicationStatusHistory.class);
        verify(history).save(row.capture());
        assertThat(row.getValue().getFromStatus()).isEqualTo("INTERVIEW");
        assertThat(row.getValue().getToStatus()).isEqualTo("ASSESSMENT");
        assertThat(row.getValue().getChangedBy()).isEqualTo(2L);
        var notification = ArgumentCaptor.forClass(Notification.class);
        verify(notifications).save(notification.capture());
        assertThat(notification.getValue().getType()).isEqualTo("ASSESSMENT_INVITATION");
        assertThat(notification.getValue().getPayloadJson()).contains("/assessments?applicationId=7");
        var email = ArgumentCaptor.forClass(EmailOutbox.class);
        verify(outbox).save(email.capture());
        assertThat(email.getValue().getStatus()).isEqualTo(NotificationStatus.SENT);
        assertThat(email.getValue().getBody()).contains("https://acme.example/assessments?applicationId=7");
    }

    @Test void inviteFixedDemoAfterCvPassSeedsAndNotifies() {
        application.setStatus(ApplicationStatus.ASSESSMENT);
        when(demoSeed.ensurePublishedDemo(application.getJob())).thenReturn(test);
        when(publicUrls.path(anyString())).thenAnswer(call -> "https://acme.example" + call.getArgument(0));
        when(mail.send(eq("candidate@example.test"), anyString(), anyString())).thenReturn(true);

        var result = service.inviteFixedDemoAfterCvPass(application);

        assertThat(result.testId()).isEqualTo(5L);
        assertThat(result.applicationId()).isEqualTo(7L);
        assertThat(result.emailSent()).isTrue();
        verify(demoSeed).ensurePublishedDemo(application.getJob());
        verify(notifications).save(any());
        verifyNoInteractions(history);
    }

    @Test void resendInAssessmentKeepsStatusWithoutHistory() {
        application.setStatus(ApplicationStatus.ASSESSMENT);
        eligible();
        when(publicUrls.path(anyString())).thenReturn("https://acme.example/assessments");

        var result = service.send(5L, new SendAssessmentRequest(7L));

        assertThat(result.applicationStatus()).isEqualTo(ApplicationStatus.ASSESSMENT);
        assertThat(result.emailSent()).isFalse();
        verifyNoInteractions(history);
        verify(notifications).save(any());
    }

    @Test void rejectsWhenApplicationNotSendable() {
        application.setStatus(ApplicationStatus.NEW);
        when(applications.findByIdForUpdate(7L)).thenReturn(Optional.of(application));
        assertThatThrownBy(() -> service.send(5L, new SendAssessmentRequest(7L)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("not eligible");
        verifyNoInteractions(notifications, outbox, history, mail);
    }

    @Test void rejectsCompletedSubmission() {
        eligible();
        var submission = new Submission();
        submission.setStatus(TestSubmissionStatus.GRADED);
        when(submissions.findLatestIds(eq(5L), eq(7L), any())).thenReturn(List.of(3L));
        when(submissions.findById(3L)).thenReturn(Optional.of(submission));
        assertThatThrownBy(() -> service.send(5L, new SendAssessmentRequest(7L)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("already completed");
        verifyNoInteractions(notifications, outbox, history, mail);
    }

    @Test void rejectsDraftTest() {
        test.setStatus(TestStatus.DRAFT);
        assertThatThrownBy(() -> service.send(5L, new SendAssessmentRequest(7L)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("published");
        verifyNoInteractions(applications, notifications, mail);
    }

    private void eligible() {
        when(applications.findByIdForUpdate(7L)).thenReturn(Optional.of(application));
    }
}
