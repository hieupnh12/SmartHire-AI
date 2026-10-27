package com.smarthire.tenant.company.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.tenant.entity.CompanyEmailSetting;
import com.smarthire.domain.tenant.repository.CompanyEmailSettingRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.service.TenantCredentialService;
import com.smarthire.tenant.company.dto.CompanyEmailSettingResponse;
import com.smarthire.tenant.company.dto.SaveCompanyEmailSettingRequest;
import com.smarthire.tenant.company.dto.TestEmailConnectionRequest;
import jakarta.mail.AuthenticationFailedException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Optional;
import java.util.Properties;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompanyEmailSettingService {

    private final CompanyEmailSettingRepository settingRepository;
    private final TenantCredentialService credentialService;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    private void ensureTableExists() {
        if (entityManager == null) return;
        try {
            entityManager.createNativeQuery("""
                    CREATE TABLE IF NOT EXISTS company_email_settings (
                        id BIGINT AUTO_INCREMENT PRIMARY KEY,
                        provider VARCHAR(32) NOT NULL DEFAULT 'GMAIL',
                        mail_username VARCHAR(255) NOT NULL,
                        mail_password_encrypted VARCHAR(512) NOT NULL,
                        from_name VARCHAR(128) NULL,
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    """).executeUpdate();
        } catch (Exception ex) {
            log.debug("ensureTableExists check: {}", ex.getMessage());
        }
    }

    @Transactional
    public CompanyEmailSettingResponse getSettings() {
        ensureTableExists();
        try {
            Optional<CompanyEmailSetting> settingOpt = settingRepository.findFirstByOrderByIdDesc();
            if (settingOpt.isEmpty()) {
                return CompanyEmailSettingResponse.builder()
                        .configured(false)
                        .provider("GMAIL")
                        .isActive(false)
                        .build();
            }

            CompanyEmailSetting setting = settingOpt.get();
            return CompanyEmailSettingResponse.builder()
                    .configured(Boolean.TRUE.equals(setting.getIsActive()))
                    .provider(setting.getProvider())
                    .mailUsername(setting.getMailUsername())
                    .fromName(setting.getFromName())
                    .isActive(setting.getIsActive())
                    .updatedAt(setting.getUpdatedAt() != null ? setting.getUpdatedAt() : setting.getCreatedAt())
                    .build();
        } catch (Exception ex) {
            log.warn("Could not query company_email_settings: {}", ex.getMessage());
            return CompanyEmailSettingResponse.builder()
                    .configured(false)
                    .provider("GMAIL")
                    .isActive(false)
                    .build();
        }
    }

    @Transactional
    public CompanyEmailSettingResponse saveSettings(SaveCompanyEmailSettingRequest request) {
        ensureTableExists();
        String tenantCode = TenantContext.getCurrentTenant();
        CompanyEmailSetting setting = settingRepository.findFirstByOrderByIdDesc()
                .orElseGet(() -> CompanyEmailSetting.builder().provider("GMAIL").build());

        String rawPassword = request.getMailPassword();
        if (StringUtils.hasText(rawPassword)) {
            String cleanPassword = rawPassword.trim().replaceAll("\\s+", "");
            setting.setMailPasswordEncrypted(credentialService.encrypt(tenantCode, cleanPassword));
        } else if (!StringUtils.hasText(setting.getMailPasswordEncrypted())) {
            throw new BusinessException("Vui lòng cung cấp Mật khẩu ứng dụng (Google App Password)",
                    HttpStatus.BAD_REQUEST, "PASSWORD_REQUIRED");
        }

        setting.setProvider("GMAIL");
        setting.setMailUsername(request.getMailUsername().trim());
        setting.setFromName(StringUtils.hasText(request.getFromName()) ? request.getFromName().trim() : null);
        setting.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        settingRepository.save(setting);
        log.info("Saved email settings for tenant {} with username {}", tenantCode, setting.getMailUsername());

        return getSettings();
    }

    public void testConnection(TestEmailConnectionRequest request) {
        String tenantCode = TenantContext.getCurrentTenant();
        String password;

        if (StringUtils.hasText(request.getMailPassword())) {
            password = request.getMailPassword().trim().replaceAll("\\s+", "");
        } else {
            CompanyEmailSetting setting = settingRepository.findFirstByOrderByIdDesc()
                    .orElseThrow(() -> new BusinessException("Chưa có cấu hình email nào được lưu. Vui lòng nhập Mật khẩu ứng dụng.",
                            HttpStatus.BAD_REQUEST, "PASSWORD_REQUIRED"));
            password = credentialService.decrypt(tenantCode, setting.getMailPasswordEncrypted());
        }

        JavaMailSenderImpl mailSender = buildMailSender(request.getMailUsername().trim(), password);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String fromName = StringUtils.hasText(request.getFromName())
                    ? request.getFromName().trim()
                    : request.getMailUsername().trim();

            helper.setFrom(request.getMailUsername().trim(), fromName);
            helper.setTo(request.getTestRecipientEmail().trim());
            helper.setSubject("[SmartHire-AI] Kiểm tra kết nối Gmail thành công");

            String testHtml = """
                    <!DOCTYPE html>
                    <html>
                    <head><meta charset="UTF-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e293b;background-color:#f1f5f9;margin:0;padding:20px;}.card{max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,0.05);}.badge{display:inline-block;background:#ecfdf5;color:#047857;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;border:1px solid #a7f3d0;}.title{font-size:20px;font-weight:800;color:#0f172a;margin:12px 0 8px;}.info-box{background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:14px;margin:18px 0;font-size:13px;}.footer{margin-top:20px;font-size:11px;color:#64748b;text-align:center;border-top:1px solid #f1f5f9;padding-top:14px;}</style></head>
                    <body>
                    <div class="card">
                      <div style="text-align:center;">
                        <span class="badge">Kết Nối Thành Công</span>
                        <h2 class="title">Kiểm Tra Kết Nối Gmail Thành Công!</h2>
                      </div>
                      <p style="font-size:14px;color:#334155;">Xin chào,</p>
                      <p style="font-size:14px;color:#334155;">Tài khoản Gmail của Quý công ty đã kết nối SMTP thành công với hệ thống <strong>SmartHire-AI</strong>. Từ bây giờ, tất cả các email gửi lời mời nhân viên, lịch phỏng vấn và thông báo tuyển dụng sẽ được gửi trực tiếp từ địa chỉ Gmail này.</p>
                      <div class="info-box">
                        <strong>Tài khoản Gmail gửi:</strong> %s<br>
                        <strong>Tên người gửi:</strong> %s<br>
                        <strong>Thời gian kiểm tra:</strong> %s
                      </div>
                      <p style="font-size:13px;color:#64748b;margin:0;">Trân trọng,<br><strong>Đội ngũ SmartHire-AI</strong></p>
                      <div class="footer">&copy; 2026 SmartHire-AI JSC. All rights reserved.</div>
                    </div>
                    </body>
                    </html>
                    """.formatted(
                    request.getMailUsername().trim(),
                    fromName,
                    java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy")));

            String plainFallback = "Xin chào,\n\nĐây là email kiểm tra kết nối từ hệ thống SmartHire-AI.\n"
                    + "Tài khoản Gmail (" + request.getMailUsername().trim() + ") đã kết nối SMTP thành công và sẵn sàng để gửi thư trong hệ thống.\n\n"
                    + "Trân trọng,\nĐội ngũ SmartHire-AI";

            helper.setText(plainFallback, testHtml);

            mailSender.send(message);
            log.info("Test email successfully sent from {} to {} for tenant {}",
                    request.getMailUsername(), request.getTestRecipientEmail(), tenantCode);
        } catch (AuthenticationFailedException authEx) {
            log.warn("Gmail authentication failed for {}: {}", request.getMailUsername(), authEx.getMessage());
            throw new BusinessException("Xác thực Gmail thất bại! Vui lòng kiểm tra lại địa chỉ Gmail và Mật khẩu ứng dụng (App Password 16 ký tự). Đảm bảo bạn đã bật Xác thực 2 bước trên Google Account.",
                    HttpStatus.BAD_REQUEST, "MAIL_AUTH_FAILED");
        } catch (Exception ex) {
            log.error("Failed to send test email: {}", ex.getMessage(), ex);
            throw new BusinessException("Lỗi khi gửi email thử nghiệm: " + ex.getMessage(),
                    HttpStatus.BAD_REQUEST, "MAIL_SEND_ERROR");
        }
    }

    public boolean isConfigured() {
        try {
            return settingRepository.findFirstByIsActiveTrueOrderByIdDesc().isPresent();
        } catch (RuntimeException ex) {
            log.warn("Could not read company mail settings: {}", ex.getMessage());
            return false;
        }
    }

    public boolean sendMail(String to, String subject, String body) {
        boolean isHtml = body != null && (body.contains("<html") || body.contains("<!DOCTYPE") || body.contains("<table"));
        return sendMail(to, subject, isHtml ? null : body, isHtml ? body : null);
    }

    public boolean sendMail(String to, String subject, String textBody, String htmlBody) {
        String tenantCode = TenantContext.getCurrentTenant();
        CompanyEmailSetting setting = settingRepository.findFirstByIsActiveTrueOrderByIdDesc()
                .orElseThrow(() -> new BusinessException(
                        "Công ty chưa cấu hình tài khoản Gmail gửi thư. Vui lòng vào Cài đặt công ty để thiết lập tài khoản Gmail.",
                        HttpStatus.BAD_REQUEST, "MAIL_CONFIG_REQUIRED"));

        try {
            String decryptedPassword = credentialService.decrypt(tenantCode, setting.getMailPasswordEncrypted());
            JavaMailSenderImpl mailSender = buildMailSender(setting.getMailUsername(), decryptedPassword);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String fromName = StringUtils.hasText(setting.getFromName())
                    ? setting.getFromName()
                    : setting.getMailUsername();

            helper.setFrom(setting.getMailUsername(), fromName);
            helper.setTo(to);
            helper.setSubject(subject);

            if (StringUtils.hasText(htmlBody) && StringUtils.hasText(textBody)) {
                helper.setText(textBody, htmlBody);
            } else if (StringUtils.hasText(htmlBody)) {
                helper.setText(htmlBody, true);
            } else {
                helper.setText(textBody != null ? textBody : "", false);
            }

            mailSender.send(message);
            log.info("Email sent to {} via company Gmail ({}) for tenant {}", to, setting.getMailUsername(), tenantCode);
            return true;
        } catch (RuntimeException ex) {
            log.error("Failed to send email to {} via tenant Gmail {}: {}", to, setting.getMailUsername(), ex.getMessage());
            return false;
        } catch (Exception ex) {
            log.error("Failed to send email to {} via tenant Gmail {}: {}", to, setting.getMailUsername(), ex.getMessage());
            return false;
        }
    }

    private JavaMailSenderImpl buildMailSender(String username, String password) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost("smtp.gmail.com");
        sender.setPort(587);
        sender.setUsername(username);
        sender.setPassword(password);

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.connectiontimeout", "8000");
        props.put("mail.smtp.timeout", "8000");
        props.put("mail.smtp.writetimeout", "8000");

        return sender;
    }
}
