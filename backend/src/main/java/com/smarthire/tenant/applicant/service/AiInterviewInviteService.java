package com.smarthire.tenant.applicant.service;

import com.smarthire.domain.enums.NotificationCategory;
import com.smarthire.domain.enums.NotificationStatus;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.entity.EmailOutbox;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.MatchScore;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.EmailOutboxRepository;
import com.smarthire.multitenancy.service.TenantPublicUrlService;
import com.smarthire.tenant.auth.service.InviteMailSender;
import com.smarthire.tenant.cv.service.CvMatchingService;
import com.smarthire.tenant.notification.service.NotificationPreferenceService;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiInterviewInviteService {
    private static final Logger log = LoggerFactory.getLogger(AiInterviewInviteService.class);
    private static final DateTimeFormatter INVITATION_TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy")
            .withZone(ZoneId.of("Asia/Bangkok"));

    private final InviteMailSender mail;
    private final EmailOutboxRepository outbox;
    private final ApplicationRepository applications;
    private final TenantPublicUrlService publicUrls;
    private final NotificationPreferenceService preferences;

    public AiInterviewInviteService(
            InviteMailSender mail,
            EmailOutboxRepository outbox,
            ApplicationRepository applications,
            TenantPublicUrlService publicUrls,
            NotificationPreferenceService preferences) {
        this.mail = mail;
        this.outbox = outbox;
        this.applications = applications;
        this.publicUrls = publicUrls;
        this.preferences = preferences;
    }

    @Transactional
    public void sendIfNeeded(Application application, MatchScore score) {
        if (!CvMatchingService.passed(score)) return;
        String reason = "đã đạt ngưỡng sàng lọc (%s)".formatted(
                score.getScore() == null ? "—" : score.getScore().toPlainString());
        send(application, reason);
    }

    @Transactional
    public void sendOnRecruiterPass(Application application) {
        send(application, "đã được nhà tuyển dụng chọn qua vòng sàng lọc CV");
    }

    @Transactional
    public void sendForInterview(Application application) {
        send(application, "đã vượt qua vòng sàng lọc CV");
    }

    @Transactional
    public void sendForInterview(Application application, com.smarthire.tenant.aiInterview.dto.request.AiInterviewConfigRequest config) {
        send(application, "đã vượt qua vòng sàng lọc CV", config);
    }

    private void send(Application application, String reason) {
        send(application, reason, null);
    }
    private void send(Application application, String reason, com.smarthire.tenant.aiInterview.dto.request.AiInterviewConfigRequest invitationConfig) {
        if (application == null || application.getId() == null || application.getAiInterviewInvitedAt() != null) {
            return;
        }
        Candidate candidate = application.getCandidate();
        Job job = application.getJob();
        if (candidate == null || candidate.getEmail() == null || candidate.getEmail().isBlank() || job == null) {
            return;
        }
        if (preferences.emailOff(candidate, NotificationCategory.AI_INTERVIEW)) {
            // Opt-out is a delivered decision, not an SMTP failure, so the invite must not be retried.
            application.setAiInterviewInvitedAt(Instant.now());
            applications.save(application);
            return;
        }

        String brand = TenantPublicUrlService.brandOrDefault(publicUrls);
        String subject = brand + ": mời phỏng vấn AI — " + job.getTitle();
        var config = invitationConfig == null ? com.smarthire.tenant.aiInterview.service.InterviewPolicies.resolveAvailability(
                com.smarthire.tenant.aiInterview.service.InterviewPolicies.config(job), Instant.now()) : invitationConfig;
        var policy = config.policy();
        String body = """
                Xin chào %s,

                Chúc mừng, CV của bạn cho vị trí %s %s.
                Vòng tiếp theo là AI Interview.

                Thời gian có thể bắt đầu: %s
                Hạn hoàn thành: %s
                Thời lượng: %d phút
                Số lần thực hiện: %d

                Bạn có thể bắt đầu AI Interview bất kỳ lúc nào trong khoảng thời gian trên:

                %s

                %s
                """.formatted(
                candidate.getFullName() == null ? candidate.getEmail() : candidate.getFullName(),
                job.getTitle(),
                reason,
                formatTime(config.availableFrom(), "Ngay khi câu hỏi sẵn sàng"),
                formatTime(config.availableUntil(), "Không giới hạn"),
                policy.durationMinutes(),
                policy.maxAttempts(),
                publicUrls.path("/candidate/interviews"),
                brand);

        String replyToEmail = resolveJobCreatorEmail(job);
        String replyToName = resolveJobCreatorName(job);
        boolean sent = InviteMailSender.withReplyTo(
                replyToEmail,
                replyToName,
                () -> mail.send(candidate.getEmail(), subject, body));
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

    private static String resolveJobCreatorEmail(Job job) {
        try {
            return job != null && job.getCreatedBy() != null ? job.getCreatedBy().getEmail() : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private static String resolveJobCreatorName(Job job) {
        try {
            return job != null && job.getCreatedBy() != null ? job.getCreatedBy().getFullName() : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private static String formatTime(Instant value, String fallback) {
        return value == null ? fallback : INVITATION_TIME.format(value);
    }
}
