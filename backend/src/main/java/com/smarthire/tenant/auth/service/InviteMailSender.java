package com.smarthire.tenant.auth.service;

import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.service.TenantRegistryService;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import java.util.function.Supplier;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Slf4j
@Component
public class InviteMailSender {

    public record ReplyTo(String email, String name) {}

    public record SenderIdentity(String fromName, String replyToEmail, String replyToName) {}

    private static final ThreadLocal<ReplyTo> REPLY_TO_CONTEXT = new ThreadLocal<>();

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String from;
    private final ObjectProvider<TenantRegistryService> tenantRegistry;

    public InviteMailSender(ObjectProvider<JavaMailSender> mailSender, String from) {
        this(mailSender, from, null);
    }

    @Autowired
    public InviteMailSender(
            ObjectProvider<JavaMailSender> mailSender,
            @Value("${spring.mail.username:}") String from,
            ObjectProvider<TenantRegistryService> tenantRegistry) {
        this.mailSender = mailSender;
        this.from = from;
        this.tenantRegistry = tenantRegistry;
    }

    public static <T> T withReplyTo(String replyToEmail, String replyToName, Supplier<T> action) {
        ReplyTo previous = REPLY_TO_CONTEXT.get();
        try {
            if (StringUtils.hasText(replyToEmail)) {
                REPLY_TO_CONTEXT.set(new ReplyTo(replyToEmail.trim(),
                        StringUtils.hasText(replyToName) ? replyToName.trim() : null));
            }
            return action.get();
        } finally {
            if (previous == null) {
                REPLY_TO_CONTEXT.remove();
            } else {
                REPLY_TO_CONTEXT.set(previous);
            }
        }
    }

    public boolean send(String to, String subject, String body) {
        ReplyTo contextReplyTo = REPLY_TO_CONTEXT.get();
        return send(
                to,
                subject,
                body,
                contextReplyTo != null ? contextReplyTo.email() : null,
                contextReplyTo != null ? contextReplyTo.name() : null);
    }

    public boolean send(String to, String subject, String body, String replyToEmail, String replyToName) {
        JavaMailSender sender = mailSender != null ? mailSender.getIfAvailable() : null;
        if (sender == null || !StringUtils.hasText(from)) {
            return false;
        }
        SenderIdentity identity = resolveSenderIdentity(tenantRegistry, replyToEmail, replyToName);
        try {
            MimeMessage mimeMessage = sender.createMimeMessage();
            if (mimeMessage != null) {
                MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, StandardCharsets.UTF_8.name());
                helper.setFrom(from.trim(), identity.fromName());
                if (StringUtils.hasText(identity.replyToEmail())) {
                    if (StringUtils.hasText(identity.replyToName())) {
                        helper.setReplyTo(identity.replyToEmail(), identity.replyToName());
                    } else {
                        helper.setReplyTo(identity.replyToEmail());
                    }
                }
                helper.setTo(to);
                helper.setSubject(subject);
                helper.setText(body, false);
                sender.send(mimeMessage);
                return true;
            }

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from.trim());
            if (StringUtils.hasText(identity.replyToEmail())) {
                message.setReplyTo(identity.replyToEmail());
            }
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            sender.send(message);
            return true;
        } catch (Exception ex) {
            log.warn("Invite email was not delivered to {}: {}", to, ex.getMessage());
            return false;
        }
    }

    public static SenderIdentity resolveSenderIdentity(
            ObjectProvider<TenantRegistryService> tenantRegistry,
            String explicitReplyToEmail,
            String explicitReplyToName) {
        TenantInfo tenant = resolveCurrentTenant(tenantRegistry);
        String tenantName = (tenant != null && StringUtils.hasText(tenant.getName()))
                ? tenant.getName().trim()
                : null;

        String fromName = formatSenderDisplayName(tenantName);
        String replyToEmail = null;
        String replyToName = null;

        if (StringUtils.hasText(explicitReplyToEmail)) {
            replyToEmail = explicitReplyToEmail.trim();
            replyToName = formatReplyToName(explicitReplyToName, tenantName);
        } else if (tenant != null && StringUtils.hasText(tenant.getContactEmail())) {
            replyToEmail = tenant.getContactEmail().trim();
            replyToName = formatReplyToName(tenant.getContactName(), tenantName);
        } else if (tenant != null && StringUtils.hasText(tenant.getBillingEmail())) {
            replyToEmail = tenant.getBillingEmail().trim();
            replyToName = tenantName != null ? tenantName : "SmartHire";
        }

        return new SenderIdentity(fromName, replyToEmail, replyToName);
    }

    public static String formatSenderDisplayName(String tenantName) {
        if (!StringUtils.hasText(tenantName)) {
            return "SmartHire";
        }
        String clean = tenantName.trim();
        if (clean.toLowerCase().contains("smarthire")) {
            return clean;
        }
        return clean + " (via SmartHire)";
    }

    private static String formatReplyToName(String personName, String tenantName) {
        String cleanPerson = StringUtils.hasText(personName) ? personName.trim() : null;
        String cleanTenant = StringUtils.hasText(tenantName) ? tenantName.trim() : null;
        if (cleanPerson != null && cleanTenant != null && !cleanPerson.equalsIgnoreCase(cleanTenant)) {
            return cleanPerson + " - " + cleanTenant;
        }
        if (cleanPerson != null) {
            return cleanPerson;
        }
        return cleanTenant;
    }

    private static TenantInfo resolveCurrentTenant(ObjectProvider<TenantRegistryService> tenantRegistry) {
        if (tenantRegistry == null) {
            return null;
        }
        String currentTenant = TenantContext.getCurrentTenant();
        if (!StringUtils.hasText(currentTenant)) {
            return null;
        }
        try {
            TenantRegistryService registry = tenantRegistry.getIfAvailable();
            return registry != null ? registry.requireActive(currentTenant) : null;
        } catch (Exception ignored) {
            return null;
        }
    }
}
