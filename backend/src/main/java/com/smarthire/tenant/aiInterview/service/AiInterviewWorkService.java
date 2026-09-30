package com.smarthire.tenant.aiInterview.service;

import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.domain.enums.NotificationStatus;
import com.smarthire.domain.tenant.repository.AiInterviewRepository;
import com.smarthire.domain.tenant.repository.EmailOutboxRepository;
import com.smarthire.tenant.auth.service.InviteMailSender;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiInterviewWorkService {
    public record Pending(long id, String kind) {}
    private final AiInterviewRepository interviews;
    private final EmailOutboxRepository emails;
    private final InviteMailSender mail;
    public AiInterviewWorkService(AiInterviewRepository interviews, EmailOutboxRepository emails, InviteMailSender mail) {
        this.interviews = interviews; this.emails = emails; this.mail = mail;
    }
    @Transactional(readOnly = true)
    public List<Pending> pending() {
        var result = new ArrayList<Pending>();
        interviews.findTop50ByStatusInOrderByIdAsc(List.of(AiInterviewStatus.GENERATING, AiInterviewStatus.SCORING))
                .forEach(i -> result.add(new Pending(i.getId(), i.getStatus().name())));
        emails.findTop50ByPurposeAndStatusInAndAttemptsLessThanOrderByIdAsc("AI_INTERVIEW_RESULT", List.of(NotificationStatus.PENDING, NotificationStatus.FAILED), 3)
                .forEach(e -> result.add(new Pending(e.getId(), "EMAIL")));
        return result;
    }
    @Transactional
    public void sendEmail(long id) {
        var email = emails.findLockedById(id).orElse(null);
        if (email == null || !"AI_INTERVIEW_RESULT".equals(email.getPurpose()) || email.getStatus() == NotificationStatus.SENT || email.getAttempts() >= 3) return;
        email.setAttempts(email.getAttempts() + 1);
        boolean sent = mail.send(email.getToEmail(), email.getSubject(), email.getBody());
        email.setStatus(sent ? NotificationStatus.SENT : NotificationStatus.FAILED);
        if (sent) email.setSentAt(Instant.now());
    }
}
