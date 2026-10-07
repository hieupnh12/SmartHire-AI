package com.smarthire.tenant.interview;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.enums.NotificationStatus;
import com.smarthire.domain.tenant.entity.EmailOutbox;
import com.smarthire.domain.tenant.repository.EmailOutboxRepository;
import com.smarthire.tenant.interview.service.*;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class HumanInterviewEmailTest {
    EmailOutboxRepository outbox; ObjectProvider<JavaMailSender> provider; JavaMailSender mail;
    HumanInterviewEmailService service; EmailOutbox email;
    @BeforeEach @SuppressWarnings("unchecked") void setup() throws Exception {
        outbox=mock(EmailOutboxRepository.class);provider=mock(ObjectProvider.class);mail=mock(JavaMailSender.class);
        var json=new ObjectMapper();service=new HumanInterviewEmailService(outbox,provider,json,"noreply@example.test");
        email=EmailOutbox.builder().id(1L).toEmail("candidate@example.test").subject("Interview").purpose(HumanInterviewNotificationService.PURPOSE)
            .body(json.writeValueAsString(new HumanInterviewNotificationService.EmailContent("Invitation","BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n"))).build();
        when(outbox.findLockedById(1L)).thenReturn(Optional.of(email));
    }
    @Test void sendsCalendarAttachmentAndMarksSent() throws Exception {
        when(provider.getIfAvailable()).thenReturn(mail);var message=new MimeMessage(Session.getInstance(new Properties()));when(mail.createMimeMessage()).thenReturn(message);
        service.send(1);verify(mail).send(message);message.saveChanges();assertEquals(NotificationStatus.SENT,email.getStatus());assertNotNull(email.getSentAt());assertEquals(1,email.getAttempts());assertTrue(message.getContentType().startsWith("multipart/"));
    }
    @Test void missingSmtpKeepsPendingWithoutConsumingRetry() {
        service.send(1);assertEquals(NotificationStatus.PENDING,email.getStatus());assertEquals(0,email.getAttempts());verifyNoInteractions(mail);
    }
    @Test void smtpFailureRemainsRetryable() {
        when(provider.getIfAvailable()).thenReturn(mail);when(mail.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        doThrow(new org.springframework.mail.MailSendException("Unavailable")).when(mail).send(any(MimeMessage.class));
        service.send(1);assertEquals(NotificationStatus.FAILED,email.getStatus());assertEquals(1,email.getAttempts());
    }
    @Test void alreadySentIsIdempotent() {
        email.setStatus(NotificationStatus.SENT);service.send(1);verifyNoInteractions(provider,mail);assertEquals(0,email.getAttempts());
    }
}
