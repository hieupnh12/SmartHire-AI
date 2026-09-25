package com.smarthire.tenant.applicant.service;

import com.smarthire.domain.enums.NotificationStatus;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.EmailOutbox;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.MatchScore;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.EmailOutboxRepository;
import com.smarthire.multitenancy.service.TenantPublicUrlService;
import com.smarthire.tenant.auth.service.InviteMailSender;
import com.smarthire.tenant.cv.service.CvMatchingService;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiInterviewInviteService {
    private static final Logger log = LoggerFactory.getLogger(AiInterviewInviteService.class);

    private final InviteMailSender mail;
    private final EmailOutboxRepository outbox;
    private final ApplicationRepository applications;
    private final TenantPublicUrlService publicUrls;

    public AiInterviewInviteService(
            InviteMailSender mail,
            EmailOutboxRepository outbox,
            ApplicationRepository applications,
            TenantPublicUrlService publicUrls) {
        this.mail = mail;
        this.outbox = outbox;
        this.applications = applications;
        this.publicUrls = publicUrls;
    }

    @Transactional
    public void sendIfNeeded(Application application, MatchScore score) {
        if (application == null || application.getId() == null || application.getAiInterviewInvitedAt() != null) {
            return;
        }
        if (!CvMatchingService.passed(score)) return;
        User candidate = application.getCandidate();
        Job job = application.getJob();
        if (candidate == null || candidate.getEmail() == null || candidate.getEmail().isBlank() || job == null) {
            return;
        }

        String subject = "SmartHire: mời phỏng vấn AI — " + job.getTitle();
        String body = """
                Xin chào %s,

                CV của bạn cho vị trí %s đã đạt ngưỡng sàng lọc (%s).
                Vui lòng đăng nhập và bắt đầu vòng phỏng vấn AI:

                %s

                SmartHire
                """.formatted(
                candidate.getFullName() == null ? candidate.getEmail() : candidate.getFullName(),
                job.getTitle(),
                score.getScore() == null ? "—" : score.getScore().toPlainString(),
                publicUrls.path("/candidate/interviews"));

        boolean sent = mail.send(candidate.getEmail(), subject, body);
        outbox.save(EmailOutbox.builder()
                .toEmail(candidate.getEmail())
                .subject(subject)
                .body(body)
                .status(sent ? NotificationStatus.SENT : NotificationStatus.FAILED)
                .attempts(1)
                .sentAt(sent ? Instant.now() : null)
                .build());
        if (sent) {
            application.setAiInterviewInvitedAt(Instant.now());
            applications.save(application);
            return;
        }
        log.warn("AI interview invite was not delivered for application {}", application.getId());
    }
}
