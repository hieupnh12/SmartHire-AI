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
    @InjectMocks AiInterviewInvitationService service;
    Application application;

    @BeforeEach void setup() {
        TenantContext.setCurrentTenant("test-tenant");
        application = new Application();
        application.setId(7L);
        application.setCandidate(user(9L));
        var job = new Job();
        job.setId(13L);
        job.setTitle("Java Backend Developer");
        job.setAiInterviewEnabled(true);
        job.setAiInterviewAvailableFrom(java.time.Instant.parse("2026-10-10T01:00:00Z"));
        job.setAiInterviewAvailableUntil(java.time.Instant.parse("2026-10-12T16:59:00Z"));
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
        assertThat(notification.getValue().getUser().getId()).isEqualTo(9L);
        assertThat(notification.getValue().getPayloadJson()).contains("/candidate/interviews/11");
        assertThat(notification.getValue().getBody()).contains("Java Backend Developer");
        assertThat(notification.getValue().getBody()).contains("08:00 10/10/2026");
        assertThat(notification.getValue().getBody()).contains("23:59 12/10/2026");
        assertThat(notification.getValue().getBody()).contains("Thời lượng: 30 phút");
        assertThat(notification.getValue().getBody()).contains("Số lần thực hiện: 1");
        verify(activity).record(eq(result), eq("INVITED"), contains("5 questions"));
        verify(emailInvites).sendForInterview(application);
        assertThat(result.getConfigSnapshotJson()).isNotBlank();
        assertThat(result.getAttemptNumber()).isEqualTo(1);
    }

    @Test void retryDoesNotDuplicateSessionOrNotification() {
        when(applications.findByIdForUpdate(7L)).thenReturn(Optional.of(application));
        var existing = AiInterview.builder().id(11L).application(application).build();
        when(interviews.findByApplication_IdOrderByIdDesc(7L)).thenReturn(List.of(existing));
        assertThat(service.invite(7L, null)).isSameAs(existing);
        verify(interviews, never()).save(any());
        verifyNoInteractions(notifications, activity, emailInvites);
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
    private static User user(long id) {
        User user = new User();
        user.setId(id);
        return user;
    }
}
