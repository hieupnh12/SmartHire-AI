package com.smarthire.tenant.applicant;

import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.MatchScore;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.EmailOutboxRepository;
import com.smarthire.multitenancy.service.TenantPublicUrlService;
import com.smarthire.tenant.applicant.service.AiInterviewInviteService;
import com.smarthire.tenant.auth.service.InviteMailSender;
import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiInterviewInviteServiceTest {
    @Mock InviteMailSender mail;
    @Mock EmailOutboxRepository outbox;
    @Mock ApplicationRepository applications;
    @Mock TenantPublicUrlService publicUrls;

    AiInterviewInviteService service;
    Application application;
    MatchScore passed;

    @BeforeEach
    void setUp() {
        service = new AiInterviewInviteService(mail, outbox, applications, publicUrls);
        org.mockito.Mockito.lenient().when(publicUrls.path("/candidate/interviews"))
                .thenReturn("http://se36.localhost:5173/candidate/interviews");
        User candidate = new User();
        candidate.setEmail("can@se36.local");
        candidate.setFullName("Candidate");
        Job job = new Job();
        job.setTitle("Backend Java");
        application = new Application();
        application.setId(4L);
        application.setCandidate(candidate);
        application.setJob(job);
        passed = new MatchScore();
        passed.setScore(new BigDecimal("80.00"));
        passed.setBreakdownJson("{\"passed\":true}");
    }

    @Test
    void sendsOnceWhenCvPassed() {
        when(mail.send(anyString(), anyString(), anyString())).thenReturn(true);

        service.sendIfNeeded(application, passed);

        verify(mail).send(eq("can@se36.local"), contains("phỏng vấn AI"), contains("http://se36.localhost:5173/candidate/interviews"));
        verify(outbox).save(any());
        verify(applications).save(application);
    }

    @Test
    void skipsWhenAlreadyInvited() {
        application.setAiInterviewInvitedAt(Instant.parse("2026-09-24T00:00:00Z"));

        service.sendIfNeeded(application, passed);

        verify(mail, never()).send(anyString(), anyString(), anyString());
    }

    @Test
    void skipsWhenCvFailed() {
        MatchScore failed = new MatchScore();
        failed.setScore(new BigDecimal("20.00"));
        failed.setBreakdownJson("{\"passed\":false}");

        service.sendIfNeeded(application, failed);

        verify(mail, never()).send(anyString(), anyString(), anyString());
    }
}
