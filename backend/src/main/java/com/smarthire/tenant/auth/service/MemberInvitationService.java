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
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.Locale;
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

    private final MemberInvitationRepository invitationRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthMapper authMapper;
    private final InviteMailSender inviteMailSender;
    private final TenantRoleService tenantRoleService;
    private final TenantPublicUrlService publicUrls;

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
        if (invitationRepository.existsByEmailIgnoreCaseAndStatus(email, InvitationStatus.PENDING)) {
            throw new BusinessException("A pending invitation already exists for this email",
                    HttpStatus.CONFLICT, "INVITE_PENDING");
        }

        String rawToken = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plus(expireHours, ChronoUnit.HOURS);

        MemberInvitation invitation = new MemberInvitation();
        invitation.setEmail(email);
        invitation.setFullName(request.getFullName().trim());
        invitation.setRole(role.getCode());
        invitation.setTokenHash(sha256(rawToken));
        invitation.setStatus(InvitationStatus.PENDING);
        invitation.setExpiresAt(expiresAt);
        invitationRepository.save(invitation);

        String acceptUrl = publicUrls.path("/invite/accept?token=" + rawToken);
        boolean emailSent = inviteMailSender.send(
                email,
                "Invitation to SmartHire workspace",
                "You were invited as " + role.getName() + ".\nSet your password:\n" + acceptUrl + "\nThis link expires in "
                        + expireHours + " hours.");

        return InviteMemberResponse.builder()
                .email(email)
                .fullName(invitation.getFullName())
                .role(role.getCode())
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
