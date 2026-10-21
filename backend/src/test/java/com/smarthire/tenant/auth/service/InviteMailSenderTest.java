package com.smarthire.tenant.auth.service;

import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.service.TenantRegistryService;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InviteMailSenderTest {

    @Mock
    private ObjectProvider<JavaMailSender> mailSenderProvider;
    @Mock
    private JavaMailSender javaMailSender;
    @Mock
    private ObjectProvider<TenantRegistryService> tenantRegistryProvider;
    @Mock
    private TenantRegistryService tenantRegistryService;

    private InviteMailSender inviteMailSender;
    private MimeMessage mimeMessage;

    @BeforeEach
    void setUp() {
        inviteMailSender = new InviteMailSender(mailSenderProvider, "notifications@smarthire.top", tenantRegistryProvider);
        mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        lenient().when(mailSenderProvider.getIfAvailable()).thenReturn(javaMailSender);
        lenient().when(javaMailSender.createMimeMessage()).thenReturn(mimeMessage);
        lenient().when(tenantRegistryProvider.getIfAvailable()).thenReturn(tenantRegistryService);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void send_UsesTenantDisplayNameAndTenantContactReplyToByDefault() throws Exception {
        TenantInfo tenant = new TenantInfo();
        tenant.setCode("fpt");
        tenant.setName("FPT Software");
        tenant.setContactName("Ban Tuyen Dung");
        tenant.setContactEmail("tuyendung@fpt.com");

        TenantContext.setCurrentTenant("fpt");
        when(tenantRegistryService.requireActive("fpt")).thenReturn(tenant);

        boolean sent = inviteMailSender.send("candidate@gmail.com", "Subject", "Hello Candidate");
        assertTrue(sent);
        verify(javaMailSender).send(mimeMessage);
        mimeMessage.saveChanges();

        InternetAddress from = (InternetAddress) mimeMessage.getFrom()[0];
        InternetAddress replyTo = (InternetAddress) mimeMessage.getReplyTo()[0];

        assertEquals("notifications@smarthire.top", from.getAddress());
        assertEquals("FPT Software (via SmartHire)", from.getPersonal());
        assertEquals("tuyendung@fpt.com", replyTo.getAddress());
        assertEquals("Ban Tuyen Dung - FPT Software", replyTo.getPersonal());
    }

    @Test
    void send_WithExplicitRecruiterReplyTo_OverridesTenantContactEmail() throws Exception {
        TenantInfo tenant = new TenantInfo();
        tenant.setCode("fpt");
        tenant.setName("FPT Software");
        tenant.setContactEmail("tuyendung@fpt.com");

        TenantContext.setCurrentTenant("fpt");
        when(tenantRegistryService.requireActive("fpt")).thenReturn(tenant);

        boolean sent = InviteMailSender.withReplyTo(
                "recruiter.an@fpt.com",
                "Nguyen Van An",
                () -> inviteMailSender.send("candidate@gmail.com", "Subject", "Hello Candidate"));

        assertTrue(sent);
        verify(javaMailSender).send(mimeMessage);
        mimeMessage.saveChanges();

        InternetAddress from = (InternetAddress) mimeMessage.getFrom()[0];
        InternetAddress replyTo = (InternetAddress) mimeMessage.getReplyTo()[0];

        assertEquals("notifications@smarthire.top", from.getAddress());
        assertEquals("FPT Software (via SmartHire)", from.getPersonal());
        assertEquals("recruiter.an@fpt.com", replyTo.getAddress());
        assertEquals("Nguyen Van An - FPT Software", replyTo.getPersonal());
    }
}
