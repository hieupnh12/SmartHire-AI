package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.InvitationStatus;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.MemberInvitation;
import com.smarthire.domain.tenant.entity.TenantRole;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.MemberInvitationRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.multitenancy.service.TenantPublicUrlService;
import com.smarthire.tenant.auth.dto.AcceptInvitationRequest;
import com.smarthire.tenant.auth.dto.InviteMemberRequest;
import com.smarthire.tenant.auth.dto.InviteMemberResponse;
import com.smarthire.tenant.auth.dto.UserResponse;
import com.smarthire.tenant.auth.mapper.AuthMapper;
import com.smarthire.tenant.company.service.CompanyEmailSettingService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberInvitationService {

    private final MemberInvitationRepository invitationRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthMapper authMapper;
    private final InviteMailSender inviteMailSender;
    private final CompanyEmailSettingService companyEmailSettingService;
    private final TenantRoleService tenantRoleService;
    private final TenantPublicUrlService publicUrls;
    private final org.springframework.beans.factory.ObjectProvider<org.thymeleaf.TemplateEngine> templateEngineProvider;

    @Value("${smarthire.invite.expire-hours:72}")
    private long expireHours;

    @Transactional
    public InviteMemberResponse invite(InviteMemberRequest request) {
        TenantRole role = tenantRoleService.requireAssignable(request.getRole());
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessException("User with this email already exists in this tenant",
                    HttpStatus.CONFLICT, "EMAIL_EXISTS");
        }

        String rawToken = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plus(expireHours, ChronoUnit.HOURS);

        MemberInvitation invitation = invitationRepository
                .findFirstByEmailIgnoreCaseAndStatus(email, InvitationStatus.PENDING)
                .orElseGet(MemberInvitation::new);
        invitation.setEmail(email);
        invitation.setFullName(request.getFullName().trim());
        invitation.setRole(role.getCode());
        invitation.setTokenHash(sha256(rawToken));
        invitation.setStatus(InvitationStatus.PENDING);
        invitation.setExpiresAt(expiresAt);
        invitationRepository.save(invitation);

        String brand = TenantPublicUrlService.brandOrDefault(publicUrls);
        String acceptUrl = publicUrls.path("/invite/accept?token=" + rawToken);
        String subject = "[" + brand + "] Lời mời tham gia đội ngũ & Thiết lập mật khẩu tài khoản";
        String body = buildInviteEmailBody(brand, invitation.getFullName(), email, role.getName(), acceptUrl);
        boolean emailSent = deliverInviteEmail(email, subject, body);

        return InviteMemberResponse.builder()
                .email(email)
                .fullName(invitation.getFullName())
                .role(role.getCode())
                .expiresAt(expiresAt)
                .emailSent(emailSent)
                .acceptUrl(acceptUrl)
                .build();
    }

    private String buildInviteEmailBody(
            String brand, String recipientName, String recipientEmail, String roleName, String acceptUrl) {
        org.thymeleaf.TemplateEngine engine = templateEngineProvider != null ? templateEngineProvider.getIfAvailable() : null;
        if (engine != null) {
            try {
                org.thymeleaf.context.Context context = new org.thymeleaf.context.Context(Locale.forLanguageTag("vi"));
                context.setVariable("workspaceName", brand);
                context.setVariable("recipientName", recipientName);
                context.setVariable("recipientEmail", recipientEmail);
                context.setVariable("roleName", roleName);
                context.setVariable("activationUrl", acceptUrl);
                context.setVariable("expireHours", expireHours);
                context.setVariable("workspaceLoginUrl", publicUrls.path("/internal/login"));
                context.setVariable("supportEmail", "support@smarthire.top");
                context.setVariable("supportHotline", "0988.888.888");
                return engine.process("emails/member-invitation", context);
            } catch (Exception ex) {
                log.warn("Could not render member-invitation template, falling back: {}", ex.getMessage());
            }
        }
        return "Xin chào " + recipientName + ",\n\n"
                + "Bạn vừa nhận được lời mời tham gia không gian làm việc của " + brand + " với vai trò " + roleName + ".\n\n"
                + "Vui lòng truy cập liên kết sau để kích hoạt tài khoản và thiết lập mật khẩu (hiệu lực trong " + expireHours + " giờ):\n"
                + acceptUrl + "\n\n"
                + "Trân trọng,\nĐội ngũ " + brand;
    }

    /**
     * Prefer tenant Gmail. If that account is missing or the send fails, use platform SMTP.
     * A mail failure must not roll back the pending invitation; the UI can still copy {@code acceptUrl}.
     */
    private boolean deliverInviteEmail(String email, String subject, String body) {
        try {
            if (companyEmailSettingService.isConfigured()
                    && companyEmailSettingService.sendMail(email, subject, body)) {
                return true;
            }
        } catch (Exception ex) {
            log.warn("Company Gmail invite was not delivered to {}: {}", email, ex.getMessage());
        }
        try {
            boolean sent = inviteMailSender.send(email, subject, body);
            if (!sent) {
                log.warn("Platform SMTP invite was not delivered to {}", email);
            }
            return sent;
        } catch (Exception ex) {
            log.warn("Platform SMTP invite was not delivered to {}: {}", email, ex.getMessage());
            return false;
        }
    }

    @Transactional
    public UserResponse accept(AcceptInvitationRequest request) {
        MemberInvitation invitation = invitationRepository
                .findByTokenHashAndStatus(sha256(request.getToken().trim()), InvitationStatus.PENDING)
                .orElseThrow(() -> new BusinessException("Invitation is invalid or already used",
                        HttpStatus.BAD_REQUEST, "INVITE_INVALID"));

        if (invitation.getExpiresAt().isBefore(Instant.now())) {
            throw new BusinessException("Invitation has expired", HttpStatus.BAD_REQUEST, "INVITE_EXPIRED");
        }
        if (userRepository.existsByEmailIgnoreCase(invitation.getEmail())) {
            throw new BusinessException("User with this email already exists in this tenant",
                    HttpStatus.CONFLICT, "EMAIL_EXISTS");
        }

        User user = new User();
        user.setEmail(invitation.getEmail());
        user.setFullName(invitation.getFullName());
        user.setRole(invitation.getRole());
        user.setStatus(UserStatus.ACTIVE);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        User saved = userRepository.save(user);

        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitationRepository.save(invitation);
        UserResponse response = authMapper.toUserResponse(saved);
        response.setWorkspace(UserRole.workspaceOf(saved.getRole()));
        return response;
    }

    static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is required", ex);
        }
    }
}
