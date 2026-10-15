package com.smarthire.tenant.aiInterview;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.CvScreeningStatus;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.aiInterview.service.AiInterviewActivityLog;
import com.smarthire.tenant.aiInterview.service.AiInterviewInvitationService;
import com.smarthire.tenant.applicant.service.AiInterviewInviteService;
import com.smarthire.tenant.notification.service.NotificationPreferenceService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiInterviewInvitationServiceTest {
    @Mock ApplicationRepository applications;
    @Mock AiInterviewRepository interviews;
    @Mock NotificationRepository notifications;
    @Mock AiInterviewActivityLog activity;
    @Mock AiInterviewInviteService emailInvites;
    @Mock NotificationPreferenceService preferences;
    @InjectMocks AiInterviewInvitationService service;
    Application application;

    @BeforeEach void setup() {
        TenantContext.setCurrentTenant("test-tenant");
        application = new Application();
        application.setId(7L);
        application.setCandidate(candidate(9L));
        var job = new Job();
        job.setId(13L);
        job.setTitle("Java Backend Developer");
        job.setAiInterviewEnabled(true);
        job.setAiInterviewAvailableFrom(java.time.Instant.now().minusSeconds(3600));
        job.setAiInterviewAvailableUntil(java.time.Instant.now().plusSeconds(86400));
        application.setJob(job);
        application.setStatus(ApplicationStatus.INTERVIEW);
        application.setCvScreeningStatus(CvScreeningStatus.PASSED);
    }

    @AfterEach void cleanup() { TenantContext.clear(); }

    @Test void createsGeneratingAttemptInboxAndActivityLog() {
        when(applications.findByIdForUpdate(7L)).thenReturn(Optional.of(application));
        when(interviews.save(any())).thenAnswer(call -> {
            AiInterview interview = call.getArgument(0);
            interview.setId(11L);
            return interview;
        });
        var result = service.invite(7L, null);
        assertThat(result.getApplication()).isSameAs(application);
        assertThat(result.getStatus()).isEqualTo(AiInterviewStatus.GENERATING);
        var notification = ArgumentCaptor.forClass(Notification.class);
        verify(notifications).save(notification.capture());
        assertThat(notification.getValue().getCandidate().getId()).isEqualTo(9L);
        assertThat(notification.getValue().getPayloadJson()).contains("/candidate/interviews/11");
        assertThat(notification.getValue().getBody()).contains("Java Backend Developer");
        var invitationTime = java.time.format.DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy")
                .withZone(java.time.ZoneId.of("Asia/Bangkok"));
        assertThat(notification.getValue().getBody()).contains(invitationTime.format(application.getJob().getAiInterviewAvailableFrom()));
        assertThat(notification.getValue().getBody()).contains(invitationTime.format(application.getJob().getAiInterviewAvailableUntil()));
        assertThat(notification.getValue().getBody()).contains("Thời lượng: 15 phút");
        assertThat(notification.getValue().getBody()).contains("Số lần thực hiện: 1");
        verify(activity).record(eq(result), eq("INVITED"), contains("3 Communication questions"));
        verify(emailInvites).sendForInterview(eq(application), any());
        assertThat(result.getConfigSnapshotJson()).isNotBlank();
        assertThat(result.getAttemptNumber()).isEqualTo(1);
    }

    @Test void invitesWithDefaultConfigurationWithoutRecruiterEnablingIt() {
        application.getJob().setAiInterviewEnabled(false);
        application.getJob().setAiInterviewPolicyJson(null);
        when(applications.findByIdForUpdate(7L)).thenReturn(Optional.of(application));
        when(interviews.save(any())).thenAnswer(call -> { AiInterview next = call.getArgument(0); next.setId(11L); return next; });

        assertThat(service.invite(7L, null).getStatus()).isEqualTo(AiInterviewStatus.GENERATING);
        verify(notifications).save(any());
        verify(emailInvites).sendForInterview(eq(application), any());
    }

    @Test void retryDoesNotDuplicateSessionOrNotification() {
        when(applications.findByIdForUpdate(7L)).thenReturn(Optional.of(application));
        var existing = AiInterview.builder().id(11L).application(application).build();
        com.smarthire.tenant.aiInterview.service.InterviewPolicies.snapshot(existing);
        when(interviews.findByApplication_IdOrderByIdDesc(7L)).thenReturn(List.of(existing));
        assertThat(service.invite(7L, null)).isSameAs(existing);
        verify(interviews, never()).save(any());
        verifyNoInteractions(notifications, activity, emailInvites);
    }

    @Test void createsCommunicationReplacementWithoutDeletingLegacySession() {
        when(applications.findByIdForUpdate(7L)).thenReturn(Optional.of(application));
        var legacy = AiInterview.builder().id(10L).application(application).status(AiInterviewStatus.QUESTIONS_READY).build();
        when(interviews.findByApplication_IdOrderByIdDesc(7L)).thenReturn(List.of(legacy));
        when(interviews.save(any())).thenAnswer(call -> { AiInterview next = call.getArgument(0); next.setId(11L); return next; });
        var replacement = service.invite(7L, null);
        assertThat(replacement).isNotSameAs(legacy);
        assertThat(com.smarthire.tenant.aiInterview.service.InterviewPolicies.communicationOnly(
                com.smarthire.tenant.aiInterview.service.InterviewPolicies.config(replacement).policy())).isTrue();
        assertThat(legacy.getStatus()).isEqualTo(AiInterviewStatus.QUESTIONS_READY);
        verify(interviews, never()).delete(any());
        verify(notifications).save(any());
    }

    @Test void retryKeepsTheOriginalInvitationWindow() {
        var job = application.getJob();
        job.setAiInterviewAvailableFrom(null); job.setAiInterviewAvailableUntil(null);
        var policy = com.smarthire.tenant.aiInterview.service.InterviewPolicies.communicationPolicy(
                com.smarthire.tenant.aiInterview.service.InterviewPolicies.defaults())
                .withAvailability(new com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy.Availability("RELATIVE", 0, 24));
        var policyJson = (com.fasterxml.jackson.databind.node.ObjectNode) com.smarthire.tenant.aiInterview.service.InterviewPolicies.tree(
                com.smarthire.tenant.aiInterview.service.InterviewPolicies.json(policy));
        policyJson.put("maxAttempts", 2);
        job.setAiInterviewPolicyJson(policyJson.toString());
        var previous = AiInterview.builder().id(10L).application(application).status(AiInterviewStatus.FAILED).attemptNumber(1).build();
        com.smarthire.tenant.aiInterview.service.InterviewPolicies.snapshot(previous, java.time.Instant.now().minusSeconds(3600));
        var original = com.smarthire.tenant.aiInterview.service.InterviewPolicies.config(previous);
        when(applications.findByIdForUpdate(7L)).thenReturn(Optional.of(application));
        when(interviews.findByApplication_IdOrderByIdDesc(7L)).thenReturn(List.of(previous));
        when(interviews.save(any())).thenAnswer(call -> { AiInterview next = call.getArgument(0); next.setId(11L); return next; });
        var result = service.openNextAttempt(7L);
        var retry = com.smarthire.tenant.aiInterview.service.InterviewPolicies.config(result);
        assertThat(result.getAttemptNumber()).isEqualTo(2);
        assertThat(retry.availableFrom()).isEqualTo(original.availableFrom());
        assertThat(retry.availableUntil()).isEqualTo(original.availableUntil());
        verify(emailInvites).sendForInterview(eq(application), eq(retry));
    }

    @Test void rejectsUnscreenedApplication() {
        application.setStatus(ApplicationStatus.NEW);
        when(applications.findByIdForUpdate(7L)).thenReturn(Optional.of(application));
        assertThatThrownBy(() -> service.invite(7L, null)).isInstanceOf(BusinessException.class);
        verifyNoInteractions(interviews, notifications);
    }

    @Test void rejectsMissingTenantBeforeQuerying() {
        TenantContext.clear();
        assertThatThrownBy(() -> service.invite(7L, null)).isInstanceOf(BusinessException.class);
        verifyNoInteractions(applications, interviews, notifications);
    }
    private static Candidate candidate(long id) {
        Candidate candidate = new Candidate();
        candidate.setId(id);
        return candidate;
    }
}
