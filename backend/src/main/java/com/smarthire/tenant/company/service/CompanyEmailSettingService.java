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
            helper.setText("Xin chào,\n\nĐây là email kiểm tra kết nối từ hệ thống SmartHire-AI.\n"
                    + "Tài khoản Gmail (" + request.getMailUsername().trim() + ") đã kết nối SMTP thành công và sẵn sàng để gửi thư trong hệ thống.\n\n"
                    + "Trân trọng,\nĐội ngũ SmartHire-AI", false);

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

    @Transactional(readOnly = true)
    public boolean isConfigured() {
        return settingRepository.findFirstByIsActiveTrueOrderByIdDesc().isPresent();
    }

    @Transactional(readOnly = true)
    public boolean sendMail(String to, String subject, String body) {
        String tenantCode = TenantContext.getCurrentTenant();
        CompanyEmailSetting setting = settingRepository.findFirstByIsActiveTrueOrderByIdDesc()
                .orElseThrow(() -> new BusinessException(
                        "Công ty chưa cấu hình tài khoản Gmail gửi thư. Vui lòng vào Cài đặt công ty để thiết lập tài khoản Gmail.",
                        HttpStatus.BAD_REQUEST, "MAIL_CONFIG_REQUIRED"));

        String decryptedPassword = credentialService.decrypt(tenantCode, setting.getMailPasswordEncrypted());
        JavaMailSenderImpl mailSender = buildMailSender(setting.getMailUsername(), decryptedPassword);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String fromName = StringUtils.hasText(setting.getFromName())
                    ? setting.getFromName()
                    : setting.getMailUsername();

            helper.setFrom(setting.getMailUsername(), fromName);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, false);

            mailSender.send(message);
            log.info("Email sent to {} via company Gmail ({}) for tenant {}", to, setting.getMailUsername(), tenantCode);
            return true;
        } catch (Exception ex) {
            log.error("Failed to send email to {} via tenant Gmail {}: {}", to, setting.getMailUsername(), ex.getMessage(), ex);
            throw new BusinessException("Không thể gửi email qua tài khoản Gmail của công ty: " + ex.getMessage(),
                    HttpStatus.INTERNAL_SERVER_ERROR, "MAIL_DELIVERY_FAILED");
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
