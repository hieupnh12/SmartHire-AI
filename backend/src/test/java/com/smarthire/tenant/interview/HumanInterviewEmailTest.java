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
    @Test @SuppressWarnings("unchecked") void sendsWithTenantWhiteLabelFromAndInterviewerReplyTo() throws Exception {
        var tenantInfo = new com.smarthire.domain.master.entity.TenantInfo();
        tenantInfo.setCode("fpt");
        tenantInfo.setName("FPT Software");
        tenantInfo.setContactEmail("careers@fpt.com");
        var registry = mock(com.smarthire.multitenancy.service.TenantRegistryService.class);
        when(registry.requireActive("fpt")).thenReturn(tenantInfo);
        ObjectProvider<com.smarthire.multitenancy.service.TenantRegistryService> registryProvider = mock(ObjectProvider.class);
        when(registryProvider.getIfAvailable()).thenReturn(registry);

        var json = new ObjectMapper();
        var tenantService = new HumanInterviewEmailService(outbox, provider, json, "noreply@example.test", registryProvider);
        email.setBody(json.writeValueAsString(new HumanInterviewNotificationService.EmailContent(
                "Invitation", null, "lead.hr@fpt.com", "Nguyen Van HR")));

        when(provider.getIfAvailable()).thenReturn(mail);
        var message = new MimeMessage(Session.getInstance(new Properties()));
        when(mail.createMimeMessage()).thenReturn(message);

        com.smarthire.multitenancy.context.TenantContext.setCurrentTenant("fpt");
        try {
            tenantService.send(1);
            message.saveChanges();
            var fromAddr = (jakarta.mail.internet.InternetAddress) message.getFrom()[0];
            var replyToAddr = (jakarta.mail.internet.InternetAddress) message.getReplyTo()[0];
            assertEquals("noreply@example.test", fromAddr.getAddress());
            assertEquals("FPT Software (via SmartHire)", fromAddr.getPersonal());
            assertEquals("lead.hr@fpt.com", replyToAddr.getAddress());
            assertEquals("Nguyen Van HR - FPT Software", replyToAddr.getPersonal());
        } finally {
            com.smarthire.multitenancy.context.TenantContext.clear();
        }
    }
}
