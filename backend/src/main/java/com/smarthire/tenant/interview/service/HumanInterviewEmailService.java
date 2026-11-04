package com.smarthire.tenant.interview.service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.enums.NotificationStatus;
import com.smarthire.domain.tenant.repository.EmailOutboxRepository;
import com.smarthire.multitenancy.service.TenantRegistryService;
import com.smarthire.tenant.auth.service.InviteMailSender;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
@Service
public class HumanInterviewEmailService {
    private static final Logger log = LoggerFactory.getLogger(HumanInterviewEmailService.class);
    private final EmailOutboxRepository outbox;
    private final ObjectProvider<JavaMailSender> sender;
    private final ObjectMapper json;
    private final String from;
    private final ObjectProvider<TenantRegistryService> tenantRegistry;

    public HumanInterviewEmailService(
            EmailOutboxRepository outbox,
            ObjectProvider<JavaMailSender> sender,
            ObjectMapper json,
            String from) {
        this(outbox, sender, json, from, null);
    }

    @Autowired
    public HumanInterviewEmailService(
            EmailOutboxRepository outbox,
            ObjectProvider<JavaMailSender> sender,
            ObjectMapper json,
            @Value("${spring.mail.username:}") String from,
            ObjectProvider<TenantRegistryService> tenantRegistry) {
        this.outbox = outbox;
        this.sender = sender;
        this.json = json;
        this.from = from;
        this.tenantRegistry = tenantRegistry;
    }

    @Transactional(readOnly=true)
    public List<Long> pending() { return outbox.findTop50ByPurposeAndStatusInAndAttemptsLessThanOrderByIdAsc(HumanInterviewNotificationService.PURPOSE,List.of(NotificationStatus.PENDING,NotificationStatus.FAILED),5).stream().map(e -> e.getId()).toList(); }
    @Transactional
    public void send(long id) {
        var e=outbox.findLockedById(id).orElse(null);
        if(e==null || !HumanInterviewNotificationService.PURPOSE.equals(e.getPurpose()) || e.getStatus()==NotificationStatus.SENT || e.getAttempts()>=5) return;
        var mail=sender.getIfAvailable();
        if(mail==null || from.isBlank()) {
            log.warn("Skip human interview email id={} — JavaMailSender or spring.mail.username is not configured", id);
            return;
        }
        e.setAttempts(e.getAttempts()+1);
        try {
            var content=json.readValue(e.getBody(),HumanInterviewNotificationService.EmailContent.class);
            var identity = InviteMailSender.resolveSenderIdentity(
                    tenantRegistry, content.replyToEmail(), content.replyToName());
            var message=mail.createMimeMessage(); var helper=new MimeMessageHelper(message,true,StandardCharsets.UTF_8.name());
            helper.setFrom(from.trim(), identity.fromName());
            if (StringUtils.hasText(identity.replyToEmail())) {
                if (StringUtils.hasText(identity.replyToName())) {
                    helper.setReplyTo(identity.replyToEmail(), identity.replyToName());
                } else {
                    helper.setReplyTo(identity.replyToEmail());
                }
            }
            helper.setTo(e.getToEmail());helper.setSubject(e.getSubject());helper.setText(content.text());
            if(content.calendar()!=null) helper.addAttachment("interview.ics",new ByteArrayResource(content.calendar().getBytes(StandardCharsets.UTF_8)),"text/calendar");
            mail.send(message);e.setStatus(NotificationStatus.SENT);e.setSentAt(Instant.now());
        } catch(Exception ex) {
            e.setStatus(NotificationStatus.FAILED);
            log.warn("Failed human interview email id={} to={}: {}", id, e.getToEmail(), ex.toString());
        }
    }
}
