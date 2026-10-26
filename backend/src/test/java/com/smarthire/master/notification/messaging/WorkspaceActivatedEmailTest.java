package com.smarthire.master.notification.messaging;

import com.smarthire.domain.master.entity.MasterNotificationLog;
import com.smarthire.domain.master.repository.MasterNotificationLogRepository;
import com.smarthire.master.notification.dto.MasterEmailPayload;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.test.util.ReflectionTestUtils;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkspaceActivatedEmailTest {

    @Mock
    private MasterNotificationLogRepository logRepository;

    private JavaMailSenderImpl mailSenderSpy;
    private TemplateEngine templateEngine;
    private MasterNotificationWorker worker;

    @BeforeEach
    void setUp() {
        // Cấu hình Thymeleaf TemplateEngine đọc template từ classpath
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");
        resolver.setCacheable(false);

        SpringTemplateEngine engine = new SpringTemplateEngine();
        engine.setTemplateResolver(resolver);
        this.templateEngine = engine;

        // Dùng JavaMailSenderImpl thật và spy phương thức send()
        JavaMailSenderImpl realMailSender = new JavaMailSenderImpl();
        this.mailSenderSpy = spy(realMailSender);
        doNothing().when(mailSenderSpy).send(any(MimeMessage.class));

        this.worker = new MasterNotificationWorker(mailSenderSpy, templateEngine, logRepository);
        ReflectionTestUtils.setField(worker, "mailFrom", "noreply@smarthire.top");
        ReflectionTestUtils.setField(worker, "mailFromName", "SmartHire-AI Platform");
        ReflectionTestUtils.setField(worker, "mailReplyTo", "support@smarthire.top");
    }

    @Test
    @DisplayName("Kiểm tra render và gửi mail kích hoạt Workspace (workspace-activated.html)")
    void testProcessWorkspaceActivatedEmail() throws Exception {
        // 1. Chuẩn bị dữ liệu mẫu mô phỏng đơn hàng vừa thanh toán thành công
        String tenantCode = "acmecorp";
        String adminEmail = "ceo@acmecorp.vn";
        String activationToken = "act_9f8e7d6c5b4a3210_test_token";
        String subdomain = "acmecorp";
        String workspaceUrl = "https://acmecorp.smarthire.top";
        String activationUrl = "https://acmecorp.smarthire.top/invite/accept?token=" + activationToken;

        Map<String, Object> vars = new HashMap<>();
        vars.put("customerName", "Nguyễn Văn An");
        vars.put("workspaceName", "Công ty Cổ phần Công nghệ Acme");
        vars.put("subdomain", subdomain);
        vars.put("workspaceLoginUrl", workspaceUrl + "/internal/login");
        vars.put("activationUrl", activationUrl);
        vars.put("adminEmail", adminEmail);
        vars.put("planName", "Gói Chuyên Nghiệp (Professional - 1 Năm)");
        vars.put("activatedDate", "15/10/2026");
        vars.put("supportEmail", "support@smarthire.top");
        vars.put("supportHotline", "0988.888.888");

        MasterEmailPayload payload = MasterEmailPayload.builder()
                .tenantCode(tenantCode)
                .toEmail(adminEmail)
                .subject(
                        "SmartHire-AI - Kích hoạt không gian làm việc & Thiết lập mật khẩu [Công ty Cổ phần Công nghệ Acme]")
                .templateName("workspace-activated")
                .templateVariables(vars)
                .notificationType("WORKSPACE_ACTIVATED")
                .build();

        // 2. Thực thi xử lý gửi email trong Worker
        worker.processEmail(payload);

        // 3. Bắt và kiểm tra MimeMessage được gửi qua JavaMailSender
        ArgumentCaptor<MimeMessage> messageCaptor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSenderSpy, times(1)).send(messageCaptor.capture());

        MimeMessage sentMessage = messageCaptor.getValue();
        assertThat(sentMessage).isNotNull();
        assertThat(sentMessage.getSubject()).isEqualTo(
                "SmartHire-AI - Kích hoạt không gian làm việc & Thiết lập mật khẩu [Công ty Cổ phần Công nghệ Acme]");

        // Render nội dung HTML trực tiếp qua Thymeleaf Engine để kiểm tra chính xác
        org.thymeleaf.context.Context context = new org.thymeleaf.context.Context();
        context.setVariables(vars);
        String htmlBody = templateEngine.process("emails/workspace-activated", context);
        assertThat(htmlBody).isNotBlank();

        // 4. Kiểm tra các trường dữ liệu quan trọng có mặt chính xác trong email
        assertThat(htmlBody).contains("SmartHire");
        assertThat(htmlBody).contains("Không Gian Làm Việc Đã Kích Hoạt!");
        assertThat(htmlBody).contains("Nguyễn Văn An");
        assertThat(htmlBody).contains("Công ty Cổ phần Công nghệ Acme");
        assertThat(htmlBody).contains("acmecorp.smarthire.top");
        assertThat(htmlBody).contains("ceo@acmecorp.vn");
        assertThat(htmlBody).contains("Gói Chuyên Nghiệp (Professional - 1 Năm)");
        assertThat(htmlBody).contains("15/10/2026");
        assertThat(htmlBody).contains(activationUrl);
        assertThat(htmlBody).contains("https://acmecorp.smarthire.top/internal/login");
        assertThat(htmlBody).contains("Kích Hoạt Tài Khoản &amp; Đặt Mật Khẩu");
        assertThat(htmlBody).contains("72 giờ");

        // 5. Kiểm tra log thành công được ghi vào MasterNotificationLogRepository
        ArgumentCaptor<MasterNotificationLog> logCaptor = ArgumentCaptor.forClass(MasterNotificationLog.class);
        verify(logRepository, times(1)).save(logCaptor.capture());
        MasterNotificationLog savedLog = logCaptor.getValue();
        assertThat(savedLog.getTenantCode()).isEqualTo(tenantCode);
        assertThat(savedLog.getToEmail()).isEqualTo(adminEmail);
        assertThat(savedLog.getType()).isEqualTo("WORKSPACE_ACTIVATED");
        assertThat(savedLog.getStatus()).isEqualTo("SUCCESS");

        // 6. Xuất file HTML preview ra target/test-output để người dùng có thể mở xem
        // trực quan
        Path outputDir = Path.of("target", "test-email-preview");
        Files.createDirectories(outputDir);
        Path previewFile = outputDir.resolve("workspace-activated-preview.html");
        Files.writeString(previewFile, htmlBody, StandardCharsets.UTF_8);
        System.out.println(">>> ĐÃ XUẤT PREVIEW EMAIL KÍCH HOẠT TẠI: " + previewFile.toAbsolutePath());
    }
}
