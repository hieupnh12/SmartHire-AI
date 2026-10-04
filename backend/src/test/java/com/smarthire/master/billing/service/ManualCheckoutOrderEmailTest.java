package com.smarthire.master.billing.service;

import com.smarthire.master.billing.dto.OrderPdfData;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.context.Context;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

class ManualCheckoutOrderEmailTest {

    @Test
    @Disabled("Chỉ chạy thủ công khi cần kiểm thử gửi email đơn hàng thực tế")
    void testSendRealOrderConfirmationEmailWithPdf() throws Exception {
        String invoiceNumber = "INV-202610-8899";
        String recipientEmail = "nguyennhattrinhbs@gmail.com";
        String orderDate = LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        BigDecimal unitPrice = new BigDecimal("36000000");
        BigDecimal totalPrice = new BigDecimal("36000000");
        String planName = "Gói Chuyên Nghiệp (Professional)";
        String customerName = "Nguyễn Nhật Trịnh";

        DecimalFormatSymbols symbols = new DecimalFormatSymbols(new Locale("vi", "VN"));
        symbols.setGroupingSeparator('.');
        DecimalFormat formatter = new DecimalFormat("#,###", symbols);
        String formattedPrice = formatter.format(totalPrice);

        String transferSyntax = "SH " + invoiceNumber;
        String qrUrl = "https://img.vietqr.io/image/TPBank-07744348801-compact2.png?amount=36000000&addInfo=SH%20" + invoiceNumber + "&accountName=NGUYEN%20NHAT%20SINH";

        // 1. Tạo dữ liệu đơn hàng
        OrderPdfData pdfData = OrderPdfData.builder()
                .invoiceNumber(invoiceNumber)
                .orderDate(orderDate)
                .customerName(customerName)
                .taxCode("0101234567")
                .companyLegalName("CÔNG TY CỔ PHẦN CÔNG NGHỆ ALPHA")
                .billingAddress("Tầng 13, Tòa nhà FPT, Trường Đại học FPT Đà Nẵng, Khu đô thị Công nghệ FPT, Phường Hòa Hải, Quận Ngũ Hành Sơn, TP. Đà Nẵng")
                .adminEmail(recipientEmail)
                .planName(planName)
                .quantity(1)
                .unitPrice(unitPrice)
                .totalPrice(totalPrice)
                .bankName("Ngân hàng TMCP Tiên Phong (TPBank)")
                .accountNumber("07744348801")
                .accountName("NGUYEN NHAT SINH")
                .transferSyntax(transferSyntax)
                .qrUrl(qrUrl)
                .build();

        // 2. Sinh file PDF với thiết kế mới
        OrderPdfGeneratorService pdfGenerator = new OrderPdfGeneratorService();
        byte[] pdfBytes = pdfGenerator.generateOrderPdf(pdfData);

        assertThat(pdfBytes).isNotNull();
        assertThat(pdfBytes.length).isGreaterThan(1000);
        System.out.println(">>> Generated PDF successfully: " + pdfBytes.length + " bytes");

        // 3. Khởi tạo Thymeleaf TemplateEngine
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");

        SpringTemplateEngine templateEngine = new SpringTemplateEngine();
        templateEngine.setTemplateResolver(resolver);

        Context ctx = new Context();
        ctx.setVariable("customerName", customerName);
        ctx.setVariable("invoiceNumber", invoiceNumber);
        ctx.setVariable("orderDate", orderDate);
        ctx.setVariable("planName", planName);
        ctx.setVariable("quantity", 1);
        ctx.setVariable("formattedUnitPrice", formattedPrice);
        ctx.setVariable("formattedTotalPrice", formattedPrice);
        ctx.setVariable("bankName", "Ngân hàng TMCP Tiên Phong (TPBank)");
        ctx.setVariable("accountNumber", "07744348801");
        ctx.setVariable("accountName", "NGUYEN NHAT SINH");
        ctx.setVariable("transferSyntax", transferSyntax);
        ctx.setVariable("qrUrl", qrUrl);
        ctx.setVariable("checkoutUrl", "https://smarthire.top/checkout");

        String htmlContent = templateEngine.process("emails/checkout-order-created", ctx);
        assertThat(htmlContent).contains("SmartHire");
        System.out.println(">>> Rendered Email HTML successfully: " + htmlContent.length() + " chars");

        // 4. Cấu hình JavaMailSender gửi qua Brevo SMTP
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost("smtp-relay.brevo.com");
        mailSender.setPort(587);
        mailSender.setUsername("YOUR_BREVO_SMTP_USERNAME"); // VD: xxx@smtp-brevo.com
        mailSender.setPassword("YOUR_BREVO_SMTP_KEY"); // KHÔNG COMMIT key lên Git!

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom("noreply@smarthire.top", "SmartHire-AI Platform");
        helper.setTo(recipientEmail);
        helper.setReplyTo("support@smarthire.top");
        helper.setSubject("SmartHire-AI - Thông tin đơn hàng #" + invoiceNumber);
        helper.setText(htmlContent, true);

        org.springframework.core.io.ClassPathResource logoResource = new org.springframework.core.io.ClassPathResource("images/logo-smarthrie-email.png");
        if (logoResource.exists()) {
            helper.addInline("companyLogo", logoResource);
        }

        String pdfFilename = "Thong tin don hang " + invoiceNumber + ".pdf";
        helper.addAttachment(pdfFilename, new ByteArrayResource(pdfBytes));

        // 5. Gửi email
        System.out.println(">>> Sending email to " + recipientEmail + " via Brevo SMTP...");
        mailSender.send(message);
        System.out.println(">>> EMAIL SENT SUCCESSFULLY TO " + recipientEmail + " WITH ATTACHED PDF " + pdfFilename + "!");
    }

    @Test
    @Disabled("Chỉ chạy thủ công khi cần kiểm thử gửi email kích hoạt workspace thực tế")
    void testSendRealWorkspaceActivationEmail() throws Exception {
        String recipientEmail = "nguyennhattrinhbs@gmail.com";
        String customerName = "Nguyễn Nhật Trịnh";
        String workspaceName = "Công ty Cổ phần Công nghệ Alpha";
        String subdomain = "alpha-corp";
        String workspaceLoginUrl = "https://alpha-corp.smarthire.top/internal/login";
        String tempPassword = "DUMMY_PASSWORD_123"; // Mật khẩu giả định cho nội dung email
        String planName = "Gói Chuyên Nghiệp (Professional)";
        String activatedDate = LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");

        SpringTemplateEngine templateEngine = new SpringTemplateEngine();
        templateEngine.setTemplateResolver(resolver);

        Context ctx = new Context();
        ctx.setVariable("customerName", customerName);
        ctx.setVariable("workspaceName", workspaceName);
        ctx.setVariable("subdomain", subdomain);
        ctx.setVariable("workspaceLoginUrl", workspaceLoginUrl);
        ctx.setVariable("adminEmail", recipientEmail);
        ctx.setVariable("tempPassword", tempPassword);
        ctx.setVariable("planName", planName);
        ctx.setVariable("activatedDate", activatedDate);
        ctx.setVariable("supportEmail", "support@smarthire.top");
        ctx.setVariable("supportHotline", "0988.888.888");

        String htmlContent = templateEngine.process("emails/workspace-activated", ctx);
        assertThat(htmlContent).contains("SmartHire");
        System.out.println(">>> Rendered Workspace Activated HTML: " + htmlContent.length() + " chars");

        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost("smtp-relay.brevo.com");
        mailSender.setPort(587);
        mailSender.setUsername("YOUR_BREVO_SMTP_USERNAME"); // VD: xxx@smtp-brevo.com
        mailSender.setPassword("YOUR_BREVO_SMTP_KEY"); // KHÔNG COMMIT key lên Git!

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom("noreply@smarthire.top", "SmartHire-AI Platform");
        helper.setTo(recipientEmail);
        helper.setReplyTo("support@smarthire.top");
        helper.setSubject("SmartHire-AI - Kích hoạt không gian làm việc thành công [" + workspaceName + "]");
        helper.setText(htmlContent, true);

        org.springframework.core.io.ClassPathResource logoResource = new org.springframework.core.io.ClassPathResource("images/logo-smarthrie-email.png");
        if (logoResource.exists()) {
            helper.addInline("companyLogo", logoResource);
        }

        System.out.println(">>> Sending workspace activation email to " + recipientEmail + " via Brevo SMTP...");
        mailSender.send(message);
        System.out.println(">>> WORKSPACE ACTIVATION EMAIL SENT SUCCESSFULLY TO " + recipientEmail + "!");
    }
}
