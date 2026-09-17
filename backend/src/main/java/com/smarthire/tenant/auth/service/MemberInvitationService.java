package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.InvitationStatus;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.MemberInvitation;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.MemberInvitationRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.auth.dto.AcceptInvitationRequest;
import com.smarthire.tenant.auth.dto.InviteMemberRequest;
import com.smarthire.tenant.auth.dto.InviteMemberResponse;
import com.smarthire.tenant.auth.dto.UserResponse;
import com.smarthire.tenant.auth.mapper.AuthMapper;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MemberInvitationService {

    private static final Set<UserRole> INVITABLE_ROLES = Set.of(
            UserRole.TENANT_ADMIN, UserRole.ADMIN, UserRole.HR, UserRole.RECRUITER);

    private final MemberInvitationRepository invitationRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthMapper authMapper;
    private final InviteMailSender inviteMailSender;

    @Value("${smarthire.invite.public-origin:http://localhost:5173}")
    private String publicOrigin;

    @Value("${smarthire.invite.expire-hours:72}")
    private long expireHours;

    @Transactional
    public InviteMemberResponse invite(InviteMemberRequest request) {
        UserRole role = parseStaffRole(request.getRole());
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessException("User with this email already exists in this tenant",
                    HttpStatus.CONFLICT, "EMAIL_EXISTS");
        }
        if (invitationRepository.existsByEmailIgnoreCaseAndStatus(email, InvitationStatus.PENDING)) {
            throw new BusinessException("A pending invitation already exists for this email",
                    HttpStatus.CONFLICT, "INVITE_PENDING");
        }

        String rawToken = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plus(expireHours, ChronoUnit.HOURS);

        MemberInvitation invitation = new MemberInvitation();
        invitation.setEmail(email);
        invitation.setFullName(request.getFullName().trim());
        invitation.setRole(role);
        invitation.setTokenHash(sha256(rawToken));
        invitation.setStatus(InvitationStatus.PENDING);
        invitation.setExpiresAt(expiresAt);
        invitationRepository.save(invitation);

        String acceptUrl = acceptUrl(rawToken);
        boolean emailSent = inviteMailSender.send(
                email,
                "Invitation to SmartHire workspace",
                "You were invited as " + role.name() + ".\nSet your password:\n" + acceptUrl + "\nThis link expires in "
                        + expireHours + " hours.");

        return InviteMemberResponse.builder()
                .email(email)
                .fullName(invitation.getFullName())
                .role(role.name())
                .expiresAt(expiresAt)
                .emailSent(emailSent)
                .acceptUrl(acceptUrl)
                .build();
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
        return authMapper.toUserResponse(saved);
    }

    private UserRole parseStaffRole(String raw) {
        UserRole role;
        try {
            role = UserRole.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Invalid role. Allowed: TENANT_ADMIN, ADMIN, HR, RECRUITER",
                    HttpStatus.BAD_REQUEST, "INVALID_ROLE");
        }
        if (!INVITABLE_ROLES.contains(role)) {
            throw new BusinessException("Candidates cannot be invited as staff",
                    HttpStatus.BAD_REQUEST, "INVALID_ROLE");
        }
        return role;
    }

    private String acceptUrl(String rawToken) {
        String tenant = TenantContext.getCurrentTenant();
        URI origin = URI.create(publicOrigin);
        String host = origin.getHost() == null ? "localhost" : origin.getHost();
        String inviteHost = (tenant == null || tenant.isBlank()) ? host : tenant + "." + host;
        int port = origin.getPort();
        String portPart = port > 0 ? ":" + port : "";
        return origin.getScheme() + "://" + inviteHost + portPart + "/invite/accept?token=" + rawToken;
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
