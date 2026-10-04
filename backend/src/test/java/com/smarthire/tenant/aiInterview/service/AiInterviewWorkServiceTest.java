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
