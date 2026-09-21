package com.smarthire.master.notification.messaging;

import com.smarthire.domain.master.entity.MasterNotificationLog;
import com.smarthire.domain.master.repository.MasterNotificationLogRepository;
import com.smarthire.master.notification.dto.MasterEmailPayload;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

@Slf4j
@Component
public class MasterNotificationWorker {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    private final MasterNotificationLogRepository logRepository;

    public MasterNotificationWorker(JavaMailSender mailSender, 
                                    TemplateEngine templateEngine,
                                    MasterNotificationLogRepository logRepository) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
        this.logRepository = logRepository;
    }

    @RabbitListener(queues = "${app.rabbitmq.queues.notify-email}")
    public void processEmail(MasterEmailPayload payload) {
        log.info("Processing email for tenant {}, type: {}", payload.getTenantCode(), payload.getNotificationType());

        try {
            // Render HTML using Thymeleaf
            Context context = new Context();
            if (payload.getTemplateVariables() != null) {
                context.setVariables(payload.getTemplateVariables());
            }
            
            // Assuming templates are in src/main/resources/templates/emails/
            String htmlContent = templateEngine.process("emails/" + payload.getTemplateName(), context);

            // Prepare MimeMessage
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(payload.getToEmail());
            helper.setSubject(payload.getSubject());
            helper.setText(htmlContent, true);
            
            // Set sender and reply-to
            helper.setFrom("procuong.110193@gmail.com", "SmartHire Platform");
            helper.setReplyTo("support@smarthire.vn");

            // Send Email
            mailSender.send(message);

            // Log Success
            saveLog(payload, "SUCCESS", null);
            log.info("Successfully sent {} email to {}", payload.getNotificationType(), payload.getToEmail());

        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", payload.getToEmail(), e.getMessage(), e);
            saveLog(payload, "FAILED", e.getMessage());
            
            // Reject to DLQ if syntax error or fatal error. 
            // If it's a transient network error, Spring AMQP retry policy (if configured) 
            // will retry before throwing an exception that reaches here.
            // By throwing AmqpRejectAndDontRequeueException, it goes directly to DLQ.
            throw new AmqpRejectAndDontRequeueException("Failed to process email, routing to DLQ", e);
        }
    }

    private void saveLog(MasterEmailPayload payload, String status, String error) {
        try {
            MasterNotificationLog notificationLog = MasterNotificationLog.builder()
                    .tenantCode(payload.getTenantCode())
                    .toEmail(payload.getToEmail())
                    .type(payload.getNotificationType())
                    .status(status)
                    .errorMessage(error != null && error.length() > 1000 ? error.substring(0, 1000) : error)
                    .build();
            logRepository.save(notificationLog);
        } catch (Exception logEx) {
            log.error("Could not save MasterNotificationLog", logEx);
        }
    }
}
