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

    private void send(Application application, String reason) {
        if (application == null || application.getId() == null || application.getAiInterviewInvitedAt() != null) {
            return;
        }
        User candidate = application.getCandidate();
        Job job = application.getJob();
        if (candidate == null || candidate.getEmail() == null || candidate.getEmail().isBlank() || job == null) {
            return;
        }

        String subject = "SmartHire: mời phỏng vấn AI — " + job.getTitle();
        var policy = com.smarthire.tenant.aiInterview.service.InterviewPolicies.config(job).policy();
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

                SmartHire
                """.formatted(
                candidate.getFullName() == null ? candidate.getEmail() : candidate.getFullName(),
                job.getTitle(),
                reason,
                formatTime(job.getAiInterviewAvailableFrom(), "Ngay khi câu hỏi sẵn sàng"),
                formatTime(job.getAiInterviewAvailableUntil(), "Không giới hạn"),
                policy.durationMinutes(),
                policy.maxAttempts(),
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

    private static String formatTime(Instant value, String fallback) {
        return value == null ? fallback : INVITATION_TIME.format(value);
    }
}
