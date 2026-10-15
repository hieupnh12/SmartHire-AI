package com.smarthire.tenant.aiInterview.service;

import com.smarthire.domain.enums.NotificationStatus;
import com.smarthire.domain.tenant.entity.EmailOutbox;
import com.smarthire.domain.tenant.repository.AiInterviewRepository;
import com.smarthire.domain.tenant.repository.EmailOutboxRepository;
import com.smarthire.tenant.auth.service.InviteMailSender;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class AiInterviewWorkServiceTest {
    @Test void queuesOnlyUnstartedConversationOpeningsForTheExistingWorker() {
        var repository = mock(AiInterviewRepository.class);
        var service = new AiInterviewWorkService(repository, mock(EmailOutboxRepository.class), mock(InviteMailSender.class));
        var opening = com.smarthire.domain.tenant.entity.AiInterview.builder().id(11L)
                .configSnapshotJson("{\"conversationVersion\":1}").build();
        var active = com.smarthire.domain.tenant.entity.AiInterview.builder().id(12L)
                .startedAt(java.time.Instant.now()).configSnapshotJson("{\"conversationVersion\":1}").build();
        when(repository.findByStatusAndApplication_StatusOrderByIdAsc(com.smarthire.domain.enums.AiInterviewStatus.IN_PROGRESS,
                com.smarthire.domain.enums.ApplicationStatus.INTERVIEW)).thenReturn(java.util.List.of(opening, active));
        assertThat(service.pending()).containsExactly(new AiInterviewWorkService.Pending(11L, "GENERATING"));
    }
    @Test
    void assessmentResultEmailsUseExistingWorkerAndStopAfterThreeFailures() {
        var emails = mock(EmailOutboxRepository.class);
        var mail = mock(InviteMailSender.class);
        var interviews = mock(AiInterviewRepository.class);
        var service = new AiInterviewWorkService(interviews, emails, mail);
        var email = EmailOutbox.builder().purpose("ASSESSMENT_RESULT").toEmail("candidate@example.test").subject("Result").body("Approved result").build();
        when(emails.findLockedById(1L)).thenReturn(Optional.of(email));
        service.sendEmail(1L); service.sendEmail(1L); service.sendEmail(1L); service.sendEmail(1L);
        assertThat(email.getStatus()).isEqualTo(NotificationStatus.FAILED);
        assertThat(email.getAttempts()).isEqualTo(3);
        verify(mail, times(3)).send(email.getToEmail(), email.getSubject(), email.getBody());
    }

    @Test
    void sendsAssessmentOutboxAndDoesNotSendItAgain() {
        var emails = mock(EmailOutboxRepository.class);
        var mail = mock(InviteMailSender.class);
        var service = new AiInterviewWorkService(mock(AiInterviewRepository.class), emails, mail);
        var email = EmailOutbox.builder().purpose("ASSESSMENT_INVITATION").toEmail("candidate@example.test")
                .subject("Assessment").body("Ready").status(NotificationStatus.PENDING).attempts(0).build();
        when(emails.findLockedById(1L)).thenReturn(Optional.of(email));
        when(mail.send(email.getToEmail(), email.getSubject(), email.getBody())).thenReturn(true);
        service.sendEmail(1L); service.sendEmail(1L);
        assertThat(email.getStatus()).isEqualTo(NotificationStatus.SENT);
        assertThat(email.getAttempts()).isEqualTo(1);
        assertThat(email.getSentAt()).isNotNull();
        verify(mail, times(1)).send(email.getToEmail(), email.getSubject(), email.getBody());
    }

    @Test
    void failedAssessmentEmailStopsAfterThreeAttemptsAndOtherPurposesAreIgnored() {
        var emails = mock(EmailOutboxRepository.class);
        var mail = mock(InviteMailSender.class);
        var service = new AiInterviewWorkService(mock(AiInterviewRepository.class), emails, mail);
        var email = EmailOutbox.builder().purpose("ASSESSMENT_INVITATION").toEmail("candidate@example.test")
                .subject("Assessment").body("Ready").status(NotificationStatus.FAILED).attempts(2).build();
        when(emails.findLockedById(1L)).thenReturn(Optional.of(email));
        service.sendEmail(1L); service.sendEmail(1L);
        assertThat(email.getAttempts()).isEqualTo(3);
        assertThat(email.getStatus()).isEqualTo(NotificationStatus.FAILED);
        email.setPurpose("UNRELATED"); email.setAttempts(0);
        service.sendEmail(1L);
        verify(mail, times(1)).send(email.getToEmail(), email.getSubject(), email.getBody());
    }
}
